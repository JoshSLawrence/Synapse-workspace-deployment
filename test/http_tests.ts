import chai = require('chai');
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import sinon = require('sinon');
import { ArtifactClient } from '../src/clients/artifacts_client';
import { getWorkspaceLocation } from '../src/clients/arm';
import { guardAgainstSilentExit, PENDING_REQUESTS_MESSAGE } from '../src/exit_guard';
import {
    createHttpClient,
    DATA_PLANE_SOCKET_TIMEOUT_MS,
    httpClient,
    readBody
} from '../src/http';
import { setTokenProvider } from '../src/utils/auth';
import * as deployUtils from '../src/utils/deploy_utils';
import { SKipManagedPE } from '../src/utils/workspace_artifacts_getter';

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

async function listen(handler: Handler): Promise<{ server: http.Server, port: number }> {
    const server = http.createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { server, port: (server.address() as AddressInfo).port };
}

function close(server: http.Server): Promise<void> {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(() => resolve()));
}

function params(port: number): deployUtils.Params {
    return {
        clientId: '', clientSecret: '', tenantId: '', managedIdentity: '', federatedIdentity: '',
        activeDirectoryEndpointUrl: '',
        subscriptionId: '00000000-0000-0000-0000-000000000000',
        resourceGroup: 'rg-example',
        resourceManagerEndpointUrl: `http://127.0.0.1:${port}/`,
        bearer: 'test-token'
    };
}

// getParams reads the action inputs, then asks the token provider for a token.
function stubAuthentication() {
    process.env['INPUT_ENVIRONMENT'] = 'Azure Public';
    process.env['INPUT_SUBSCRIPTIONID'] = '00000000-0000-0000-0000-000000000000';
    const getToken = sinon.stub().resolves('test-token');
    setTokenProvider({ getToken });
    return getToken;
}

function resetEnvironment() {
    sinon.restore();
    setTokenProvider(undefined);
    for (const key of Object.keys(process.env).filter((k) => k.startsWith('INPUT_'))) {
        delete process.env[key];
    }
}

// A stand-in for an http-client response, backed by a stream so readBody sees
// the same events it would from a socket.
function fakeResponse(status: number, body: string, headers: http.IncomingHttpHeaders = {}) {
    const message = Object.assign(Readable.from(body ? [body] : []), {
        statusCode: status,
        statusMessage: '',
        headers,
        complete: true,
        setTimeout: () => undefined
    });
    return { message, readBody: async () => body } as any;
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (err) {
        return err;
    }
    throw new Error('Expected the promise to reject');
}

function messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

describe('shared HTTP clients', function () {
    it('Should keep TLS certificate verification on', function () {
        chai.assert.notOk((httpClient as any)._ignoreSslError);
        chai.assert.notOk((new ArtifactClient(params(0)) as any).client._ignoreSslError);
    });

    it('Should reject a server whose certificate is self-signed', async function () {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tls-test-'));
        const key = path.join(dir, 'key.pem');
        const cert = path.join(dir, 'cert.pem');
        try {
            execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert,
                '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
        } catch {
            this.skip();
        }
        const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (_req, res) => res.end('{}'));
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        try {
            const port = (server.address() as AddressInfo).port;
            const err = await rejection(createHttpClient(DATA_PLANE_SOCKET_TIMEOUT_MS).get(`https://localhost:${port}/`));
            chai.assert.match(messageOf(err), /self[- ]signed|certificate|SELF_SIGNED/i);
        } finally {
            server.closeAllConnections();
            server.close();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('Should set a socket timeout and disable redirects', function () {
        chai.assert.equal((httpClient as any)._socketTimeout, DATA_PLANE_SOCKET_TIMEOUT_MS);
        chai.assert.isFalse((httpClient as any)._allowRedirects);
    });

    it('Should reject a request to a server that never answers instead of hanging', async function () {
        const { server, port } = await listen(() => { /* never respond */ });
        try {
            const err = await rejection(createHttpClient(200).get(`http://127.0.0.1:${port}/`));
            chai.assert.match(messageOf(err), /timeout/i);
        } finally {
            await close(server);
        }
    });

    it('Should not follow a redirect to another host, so the bearer token is not forwarded', async function () {
        let leakedAuthorization: string | undefined;
        let targetHit = false;
        const target = await listen((req, res) => {
            targetHit = true;
            leakedAuthorization = req.headers.authorization;
            res.end('{}');
        });
        const origin = await listen((_req, res) => {
            res.writeHead(302, { Location: `http://localhost:${target.port}/` });
            res.end();
        });
        try {
            const res = await httpClient.get(`http://127.0.0.1:${origin.port}/`, { Authorization: 'Bearer secret' });
            await readBody(res);
            chai.assert.equal(res.message.statusCode, 302);
            chai.assert.isFalse(targetHit);
            chai.assert.isUndefined(leakedAuthorization);
        } finally {
            await close(origin.server);
            await close(target.server);
        }
    });
});

describe('readBody', function () {
    it('Should return the whole body', async function () {
        const { server, port } = await listen((_req, res) => res.end('hello'));
        try {
            const res = await httpClient.get(`http://127.0.0.1:${port}/`);
            chai.assert.equal(await readBody(res), 'hello');
        } finally {
            await close(server);
        }
    });

    it('Should reject when the connection is destroyed after a partial body', async function () {
        const { server, port } = await listen((_req, res) => {
            res.writeHead(200, { 'Content-Length': '100' });
            res.write('partial');
            setTimeout(() => res.socket!.destroy(), 20);
        });
        try {
            const res = await httpClient.get(`http://127.0.0.1:${port}/`);
            const err = await rejection(readBody(res));
            chai.assert.match(messageOf(err), /closed before the response from 127\.0\.0\.1 was complete; re-run the job/);
        } finally {
            await close(server);
        }
    });

    it('Should reject when the peer closes a stalled body', async function () {
        const { server, port } = await listen((_req, res) => {
            res.writeHead(200, { 'Content-Length': '100' });
            res.write('partial');
            setTimeout(() => res.socket!.end(), 50);
        });
        try {
            const res = await httpClient.get(`http://127.0.0.1:${port}/`);
            const err = await rejection(readBody(res));
            chai.assert.match(messageOf(err), /re-run the job/);
        } finally {
            await close(server);
        }
    });

    it('Should reject a body that stalls past the idle timeout', async function () {
        const { server, port } = await listen((_req, res) => {
            res.writeHead(200, { 'Content-Length': '100' });
            res.write('partial');
        });
        try {
            const res = await httpClient.get(`http://127.0.0.1:${port}/`);
            const err = await rejection(readBody(res, 100));
            chai.assert.match(messageOf(err), /No data from 127\.0\.0\.1/);
        } finally {
            await close(server);
        }
    });
});

describe('guardAgainstSilentExit', function () {
    function fakeProcess() {
        const handlers: Array<() => void> = [];
        return {
            handlers,
            exitCode: undefined as number | string | null | undefined,
            on(_event: 'beforeExit', handler: () => void) { handlers.push(handler); return this; }
        };
    }

    it('Should fail the run when main never settled', function () {
        const proc = fakeProcess();
        const setFailed = sinon.stub();
        guardAgainstSilentExit(proc, () => false, setFailed);

        proc.handlers[0]();

        chai.assert.deepEqual(setFailed.args, [[PENDING_REQUESTS_MESSAGE]]);
        chai.assert.equal(proc.exitCode, 1);
    });

    it('Should leave a settled run alone', function () {
        const proc = fakeProcess();
        const setFailed = sinon.stub();
        guardAgainstSilentExit(proc, () => true, setFailed);

        proc.handlers[0]();

        chai.assert.isTrue(setFailed.notCalled);
        chai.assert.isUndefined(proc.exitCode);
    });
});

describe('getWorkspaceLocation', function () {
    it('Should return the location of the workspace', async function () {
        const { server, port } = await listen((_req, res) => res.end('{"location":"westus2"}'));
        try {
            chai.assert.equal(await getWorkspaceLocation(params(port), 'myworkspace'), 'westus2');
        } finally {
            await close(server);
        }
    });

    it('Should report the status and body, and hint at the role for a 403', async function () {
        const { server, port } = await listen((_req, res) => { res.statusCode = 403; res.end('{"error":"denied"}'); });
        try {
            const message = messageOf(await rejection(getWorkspaceLocation(params(port), 'myworkspace')));
            chai.assert.match(message, /Unable to fetch the location of the workspace: status 403: \{"error":"denied"\}/);
            chai.assert.match(message, /missing a role/);
        } finally {
            await close(server);
        }
    });

    it('Should reject on a redirect', async function () {
        const { server, port } = await listen((_req, res) => { res.writeHead(302, { Location: 'http://example.test/' }); res.end(); });
        try {
            const message = messageOf(await rejection(getWorkspaceLocation(params(port), 'myworkspace')));
            chai.assert.match(message, /redirect to http:\/\/example\.test\/; redirects are disabled/);
        } finally {
            await close(server);
        }
    });

    it('Should reject on a network error instead of hanging', async function () {
        const { server, port } = await listen(() => { /* unused */ });
        await close(server);
        const err = await rejection(getWorkspaceLocation(params(port), 'myworkspace'));
        chai.assert.match(messageOf(err), /Unable to fetch the location of the workspace/);
    });
});

describe('SKipManagedPE', function () {
    afterEach(resetEnvironment);

    function stubGet(status: number, body: string) {
        stubAuthentication();
        sinon.stub(httpClient, 'get').callsFake(async () => fakeResponse(status, body));
    }

    it('Should skip when the workspace has no managed virtual network', async function () {
        stubGet(400, 'The workspace does not have a managed virtual network associated');
        chai.assert.isTrue(await SKipManagedPE('myworkspace', 'Azure Public'));
    });

    it('Should not skip on success', async function () {
        stubGet(200, '{}');
        chai.assert.isFalse(await SKipManagedPE('myworkspace', 'Azure Public'));
    });

    it('Should not skip on an unrelated failure', async function () {
        stubGet(500, 'boom');
        chai.assert.isFalse(await SKipManagedPE('myworkspace', 'Azure Public'));
    });

    it('Should reject on a network error instead of hanging', async function () {
        stubAuthentication();
        sinon.stub(httpClient, 'get').rejects(new Error('socket hang up'));
        const err = await rejection(SKipManagedPE('myworkspace', 'Azure Public'));
        chai.assert.match(messageOf(err), /socket hang up/);
    });
});

describe('ArtifactClient', function () {
    afterEach(resetEnvironment);

    const resource = { name: 'pipeline1', type: 'pipeline', isDefault: false, content: '{}', dependson: [] };
    const dataPlaneScope = 'https://dev.azuresynapse.net/.default';

    function clientWithoutDelay(port: number): any {
        const client = new ArtifactClient(params(port)) as any;
        client.delay = async () => undefined;
        return client;
    }

    describe('deployment', function () {
        it('Should resolve and track the operation by scope, not token', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => {
                res.writeHead(202, { Location: 'http://127.0.0.1/status' });
                res.end('{"operationId":"op1"}');
            });
            try {
                const client = new ArtifactClient(params(port)) as any;
                const result = await client.artifactDeploymentTask(`http://127.0.0.1:${port}`, 'pipelines', resource, 'tok');
                chai.assert.equal(result, deployUtils.DeployStatus.success);
                chai.assert.deepEqual(client.deploymentTrackingRequests, [{ url: 'http://127.0.0.1/status', name: 'pipeline1', scope: dataPlaneScope }]);
            } finally {
                await close(server);
            }
        });

        it('Should track integration runtimes by the Resource Manager scope', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => res.end('{"operationId":"op1"}'));
            try {
                const client = new ArtifactClient(params(port)) as any;
                await client.artifactDeploymentTask(`http://127.0.0.1:${port}`, 'integrationRuntimes', resource, 'tok');
                chai.assert.equal(client.deploymentTrackingRequests[0].scope, `http://127.0.0.1:${port}/.default`);
            } finally {
                await close(server);
            }
        });

        it('Should reject on a network error instead of hanging', async function () {
            const { server, port } = await listen(() => { /* unused */ });
            await close(server);
            const client = new ArtifactClient(params(port)) as any;
            const err = await rejection(client.artifactDeploymentTask(`http://127.0.0.1:${port}`, 'pipelines', resource, 'tok'));
            chai.assert.equal(err, deployUtils.DeployStatus.failed);
        });

        it('Should reject on a redirect', async function () {
            const { server, port } = await listen((_req, res) => { res.writeHead(307, { Location: 'http://example.test/x' }); res.end(); });
            try {
                const client = new ArtifactClient(params(port)) as any;
                const err = await rejection(client.artifactDeploymentTask(`http://127.0.0.1:${port}`, 'pipelines', resource, 'tok'));
                chai.assert.match(messageOf(err), /redirect to http:\/\/example\.test\/x; redirects are disabled/);
            } finally {
                await close(server);
            }
        });

        it('Should reject when the response is cut off mid-body', async function () {
            const { server, port } = await listen((_req, res) => {
                res.writeHead(200, { 'Content-Length': '100' });
                res.write('{"operat');
                setTimeout(() => res.socket!.destroy(), 20);
            });
            try {
                const client = new ArtifactClient(params(port)) as any;
                const err = await rejection(client.artifactDeploymentTask(`http://127.0.0.1:${port}`, 'pipelines', resource, 'tok'));
                chai.assert.match(messageOf(err), /re-run the job/);
            } finally {
                await close(server);
            }
        });

        it('Should name the artifact error message instead of printing {}', async function () {
            stubAuthentication();
            const client = new ArtifactClient(params(0)) as any;
            sinon.stub(client, 'artifactDeploymentTask').rejects(new Error('boom'));
            const err = await rejection(client.deployPipeline('http://127.0.0.1', resource, 'tok'));
            chai.assert.match(messageOf(err), /deployment failed boom/);
        });
    });

    describe('deletion', function () {
        it('Should track the operation location by the data plane scope', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => { res.writeHead(202, { Location: 'http://127.0.0.1/op' }); res.end(); });
            try {
                const client = new ArtifactClient(params(port)) as any;
                const result = await client.artifactDeletionTask(`http://127.0.0.1:${port}`, 'pipeline', resource, 'tok');
                chai.assert.equal(result, deployUtils.DeployStatus.success);
                chai.assert.deepEqual(client.deploymentTrackingRequests, [{ url: 'http://127.0.0.1/op', name: 'pipeline1', scope: dataPlaneScope }]);
            } finally {
                await close(server);
            }
        });

        it('Should not track anything without a Location header', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => { res.statusCode = 200; res.end(); });
            try {
                const client = new ArtifactClient(params(port)) as any;
                await client.artifactDeletionTask(`http://127.0.0.1:${port}`, 'pipeline', resource, 'tok');
                chai.assert.lengthOf(client.deploymentTrackingRequests, 0);
            } finally {
                await close(server);
            }
        });

        it('Should reject on a non-success status', async function () {
            const { server, port } = await listen((_req, res) => { res.statusCode = 500; res.end('boom'); });
            try {
                const client = new ArtifactClient(params(port)) as any;
                const err = await rejection(client.artifactDeletionTask(`http://127.0.0.1:${port}`, 'pipeline', resource, 'tok'));
                chai.assert.equal(err, deployUtils.DeployStatus.failed);
            } finally {
                await close(server);
            }
        });

        it('Should reject deleteDatalakeChildren on a non-success status', async function () {
            stubAuthentication();
            sinon.stub(httpClient, 'del').callsFake(async () => fakeResponse(500, 'boom'));
            const client = new ArtifactClient(params(0));
            const err = await rejection(client.deleteDatalakeChildren('db1', 'myworkspace', 'Azure Public'));
            chai.assert.equal(messageOf(err), deployUtils.DeployStatus.failed);
        });

        it('Should resolve deleteDatalakeChildren on success', async function () {
            stubAuthentication();
            sinon.stub(httpClient, 'del').callsFake(async () => fakeResponse(200, ''));
            const client = new ArtifactClient(params(0));
            chai.assert.equal(await client.deleteDatalakeChildren('db1', 'myworkspace', 'Azure Public'), deployUtils.DeployStatus.success);
        });
    });

    describe('checkStatus', function () {
        function sequence(responses: Array<[number, string]>) {
            let calls = 0;
            return listen((_req, res) => {
                const [status, body] = responses[Math.min(calls++, responses.length - 1)];
                res.statusCode = status;
                res.end(body);
            });
        }

        it('Should poll until the operation succeeds, fetching a fresh token each time', async function () {
            const getToken = stubAuthentication();
            const { server, port } = await sequence([[202, '{"status":"InProgress"}'], [200, '{"status":"Succeeded"}']]);
            try {
                await clientWithoutDelay(port).checkStatus(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope);
                chai.assert.equal(getToken.callCount, 2);
                chai.assert.deepEqual(getToken.args, [[dataPlaneScope], [dataPlaneScope]]);
            } finally {
                await close(server);
            }
        });

        it('Should fail with the status for a 401 with a non-JSON body', async function () {
            stubAuthentication();
            const { server, port } = await sequence([[401, 'Unauthorized']]);
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatus(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /status: 401/);
                chai.assert.notMatch(messageOf(err), /JSON/);
            } finally {
                await close(server);
            }
        });

        it('Should surface the service error message from a JSON error body', async function () {
            stubAuthentication();
            const { server, port } = await sequence([[403, '{"error":{"message":"no permission"}}']]);
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatus(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /no permission/);
            } finally {
                await close(server);
            }
        });

        it('Should fail when the operation fails', async function () {
            stubAuthentication();
            const { server, port } = await sequence([[200, '{"status":"Failed","error":{"message":"bad"}}']]);
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatus(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /Failed to fetch the deployment status/);
            } finally {
                await close(server);
            }
        });

        it('Should fail on a redirect', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => { res.writeHead(302, { Location: 'http://example.test/' }); res.end(); });
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatus(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /redirects are disabled/);
            } finally {
                await close(server);
            }
        });
    });

    describe('checkStatusForDelete', function () {
        it('Should poll while the operation is pending, then finish, with a fresh token each time', async function () {
            const getToken = stubAuthentication();
            let calls = 0;
            const { server, port } = await listen((_req, res) => {
                res.statusCode = calls++ === 0 ? 202 : 200;
                res.end('');
            });
            try {
                await clientWithoutDelay(port).checkStatusForDelete(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope);
                chai.assert.equal(getToken.callCount, 2);
            } finally {
                await close(server);
            }
        });

        it('Should fail when the deletion failed', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => { res.end('{"status":"Failed","error":{"message":"bad"}}'); });
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatusForDelete(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /deletion failed/);
            } finally {
                await close(server);
            }
        });

        it('Should fail on a 401', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => { res.statusCode = 401; res.end('Unauthorized'); });
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatusForDelete(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /status: 401/);
            } finally {
                await close(server);
            }
        });

        it('Should not treat a redirect as done', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => { res.writeHead(302, { Location: 'http://example.test/' }); res.end(); });
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatusForDelete(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /redirects are disabled/);
            } finally {
                await close(server);
            }
        });

        it('Should report a non-JSON body instead of a SyntaxError', async function () {
            stubAuthentication();
            const { server, port } = await listen((_req, res) => { res.end('<html>oops</html>'); });
            try {
                const err = await rejection(clientWithoutDelay(port).checkStatusForDelete(`http://127.0.0.1:${port}/op`, 'pipeline1', dataPlaneScope));
                chai.assert.match(messageOf(err), /was not JSON/);
            } finally {
                await close(server);
            }
        });
    });
});
