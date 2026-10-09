import chai = require('chai');
import * as http from 'http';
import { AddressInfo } from 'net';
import sinon = require('sinon');
import { ArtifactClient } from '../src/clients/artifacts_client';
import {
    createHttpClient,
    DATA_PLANE_SOCKET_TIMEOUT_MS,
    httpClient
} from '../src/http';
import { setTokenProvider } from '../src/utils/auth';
import * as deployUtils from '../src/utils/deploy_utils';
import { getWorkspaceLocation } from '../src/utils/service_principal_client_utils';
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
    setTokenProvider({ getToken: async () => 'test-token' });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (err) {
        return err;
    }
    throw new Error('Expected the promise to reject');
}

describe('shared HTTP clients', function () {
    it('Should keep TLS certificate verification on', function () {
        chai.assert.notOk((httpClient as any)._ignoreSslError);
        chai.assert.notOk((new ArtifactClient(params(0)) as any).client._ignoreSslError);
    });

    it('Should set socket timeouts and disable redirects', function () {
        chai.assert.equal((httpClient as any)._socketTimeout, DATA_PLANE_SOCKET_TIMEOUT_MS);
        chai.assert.isFalse((httpClient as any)._allowRedirects);
    });

    it('Should reject a request to a server that never answers instead of hanging', async function () {
        const { server, port } = await listen(() => { /* never respond */ });
        try {
            const err = await rejection(createHttpClient(200).get(`http://127.0.0.1:${port}/`));
            chai.assert.match((err as Error).message, /timeout/i);
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
            await res.readBody();
            chai.assert.equal(res.message.statusCode, 302);
            chai.assert.isFalse(targetHit);
            chai.assert.isUndefined(leakedAuthorization);
        } finally {
            await close(origin.server);
            await close(target.server);
        }
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

    it('Should reject on a non-success status', async function () {
        const { server, port } = await listen((_req, res) => { res.statusCode = 404; res.end('{}'); });
        try {
            const err = await rejection(getWorkspaceLocation(params(port), 'myworkspace'));
            chai.assert.match((err as Error).message, /Unable to fetch the location of the workspace/);
        } finally {
            await close(server);
        }
    });

    it('Should reject on a network error instead of hanging', async function () {
        const { server, port } = await listen(() => { /* unused */ });
        await close(server);
        const err = await rejection(getWorkspaceLocation(params(port), 'myworkspace'));
        chai.assert.match((err as Error).message, /Unable to fetch the location of the workspace/);
    });
});

describe('SKipManagedPE', function () {
    afterEach(function () {
        sinon.restore();
        setTokenProvider(undefined);
        for (const key of Object.keys(process.env).filter((k) => k.startsWith('INPUT_'))) {
            delete process.env[key];
        }
    });

    function stubGet(status: number, body: string) {
        stubAuthentication();
        sinon.stub(httpClient, 'get').resolves({
            message: { statusCode: status, statusMessage: '' },
            readBody: async () => body
        } as any);
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
        chai.assert.match((err as Error).message, /socket hang up/);
    });
});

describe('ArtifactClient deployment', function () {
    afterEach(function () {
        sinon.restore();
        setTokenProvider(undefined);
        for (const key of Object.keys(process.env).filter((k) => k.startsWith('INPUT_'))) {
            delete process.env[key];
        }
    });

    const resource = { name: 'pipeline1', type: 'pipeline', isDefault: false, content: '{}', dependson: [] };

    it('Should resolve and track the operation when the service returns an operationId', async function () {
        const { server, port } = await listen((_req, res) => {
            res.writeHead(202, { Location: 'http://127.0.0.1/status' });
            res.end('{"operationId":"op1"}');
        });
        try {
            const client = new ArtifactClient(params(port));
            const result = await (client as any).artifactDeploymentTask(`http://127.0.0.1:${port}`, 'pipelines', resource, 'tok');
            chai.assert.equal(result, deployUtils.DeployStatus.success);
            chai.assert.lengthOf((client as any).deploymentTrackingRequests, 1);
        } finally {
            await close(server);
        }
    });

    it('Should reject on a network error instead of hanging', async function () {
        const { server, port } = await listen(() => { /* unused */ });
        await close(server);
        const client = new ArtifactClient(params(port));
        const err = await rejection((client as any).artifactDeploymentTask(`http://127.0.0.1:${port}`, 'pipelines', resource, 'tok'));
        chai.assert.equal(err, deployUtils.DeployStatus.failed);
    });

    it('Should reject when deleting children fails with a non-success status', async function () {
        stubAuthentication();
        sinon.stub(httpClient, 'del').resolves({
            message: { statusCode: 500, statusMessage: '' },
            readBody: async () => ''
        } as any);
        const client = new ArtifactClient(params(0));
        const err = await rejection(client.deleteDatalakeChildren('db1', 'myworkspace', 'Azure Public'));
        chai.assert.equal((err as Error).message, deployUtils.DeployStatus.failed);
    });
});
