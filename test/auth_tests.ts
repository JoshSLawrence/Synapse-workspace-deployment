import {
    ClientAssertionCredential,
    ClientSecretCredential,
    ManagedIdentityCredential
} from '@azure/identity';
import {
    AuthInputs,
    createCredential,
    createTokenProvider,
    getTokenProvider,
    setTokenProvider
} from '../src/utils/auth';
import { Env, getAdEndpointUrl, getParams } from '../src/utils/deploy_utils';

// require, not import: sinon cannot stub the namespace object that tsx builds
// for an ES import.
const core = require('@actions/core');
const chai_object = require('chai');
const sinon = require("sinon");
const expect = chai_object.expect;

const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

function inputs(overrides: Partial<AuthInputs> = {}): AuthInputs {
    return {
        clientId: ZERO_GUID,
        clientSecret: 'not-a-real-secret',
        tenantId: ZERO_GUID,
        managedIdentity: '',
        federatedIdentity: '',
        authorityHost: 'https://login.microsoftonline.com/',
        ...overrides
    };
}

// Answers every request with a valid token response and records the URLs, so
// the tests see which login host a real credential talks to.
function recordingHttpClient(urls: string[]) {
    return {
        sendRequest: async (request: any) => {
            urls.push(request.url);
            const isDiscovery = request.url.includes('/discovery/instance');
            const body = isDiscovery
                ? { tenant_discovery_endpoint: `${new URL(request.url).origin}/${ZERO_GUID}/v2.0/.well-known/openid-configuration` }
                : request.url.includes('openid-configuration')
                    ? {
                        token_endpoint: `${new URL(request.url).origin}/${ZERO_GUID}/oauth2/v2.0/token`,
                        authorization_endpoint: `${new URL(request.url).origin}/${ZERO_GUID}/oauth2/v2.0/authorize`,
                        issuer: `${new URL(request.url).origin}/${ZERO_GUID}/v2.0`
                    }
                    : { access_token: 'token-value', token_type: 'Bearer', expires_in: 3600 };
            return {
                request,
                status: 200,
                headers: { get: () => 'application/json', has: () => true, set: () => { }, delete: () => { }, toJSON: () => ({}), [Symbol.iterator]: function* () { } } as any,
                bodyAsText: JSON.stringify(body)
            };
        }
    } as any;
}

describe("Test authentication", () => {

    afterEach(() => {
        sinon.restore();
        setTokenProvider(undefined);
    });

    describe("credential choice", () => {
        it('uses a client secret credential by default', () => {
            expect(createCredential(inputs())).to.be.instanceOf(ClientSecretCredential);
        });

        it('uses a managed identity credential when managedIdentity is true', () => {
            expect(createCredential(inputs({ managedIdentity: 'true' }))).to.be.instanceOf(ManagedIdentityCredential);
        });

        it('uses a managed identity credential without a client ID (system-assigned)', () => {
            const credential = createCredential(inputs({ managedIdentity: 'true', clientId: '' }));
            expect(credential).to.be.instanceOf(ManagedIdentityCredential);
        });

        it('passes the client ID to a user-assigned managed identity', () => {
            const credential = createCredential(inputs({ managedIdentity: 'true', clientId: 'user-assigned-client-id' }));
            expect((credential as any).clientId).to.equal('user-assigned-client-id');
        });

        it('leaves the client ID unset for the system-assigned managed identity', () => {
            const credential = createCredential(inputs({ managedIdentity: 'true', clientId: '' }));
            expect((credential as any).clientId).to.not.be.ok;
        });

        it('uses a client assertion credential when federatedIdentity is true', () => {
            expect(createCredential(inputs({ federatedIdentity: 'true' }))).to.be.instanceOf(ClientAssertionCredential);
        });

        it('prefers managed identity over federated identity', () => {
            const credential = createCredential(inputs({ managedIdentity: 'true', federatedIdentity: 'true' }));
            expect(credential).to.be.instanceOf(ManagedIdentityCredential);
        });

        it('names the missing inputs for a client secret', () => {
            expect(() => createCredential(inputs({ clientSecret: '' }))).to.throw(/client secret.*clientSecret/);
        });

        it('names the missing inputs for federated identity', () => {
            expect(() => createCredential(inputs({ federatedIdentity: 'true', tenantId: '' }))).to.throw(/federated identity.*tenantId/);
        });
    });

    describe("federated identity", () => {
        it('exchanges the GitHub OIDC token for the Azure AD audience', async () => {
            const getIDToken = sinon.stub(core, 'getIDToken').resolves('github-oidc-token');
            sinon.stub(core, 'setSecret');
            const urls: string[] = [];
            const provider = createTokenProvider(inputs({ federatedIdentity: 'true', httpClient: recordingHttpClient(urls) }));

            expect(await provider.getToken('https://management.azure.com/.default')).to.equal('token-value');
            expect(getIDToken.calledWith('api://AzureADTokenExchange')).to.equal(true);
        });

        it('hints at the id-token permission when no OIDC token is available', async () => {
            sinon.stub(core, 'getIDToken').rejects(new Error('Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable'));
            const provider = createTokenProvider(inputs({ federatedIdentity: 'true', httpClient: recordingHttpClient([]) }));

            let message = '';
            try {
                await provider.getToken('https://management.azure.com/.default');
            } catch (err) {
                message = err instanceof Error ? err.message : String(err);
            }
            expect(message).to.contain('id-token: write');
            expect(message).to.contain('Azure authentication failed');
        });
    });

    describe("authority host per cloud", () => {
        // MSAL rewrites the legacy China host to its canonical alias, which is
        // the same cloud, so that alias is what the requests show.
        const clouds: [string, string][] = [
            [Env.prod, 'login.microsoftonline.com'],
            [Env.mooncake, 'login.partner.microsoftonline.cn'],
            [Env.usnat, 'login.microsoftonline.us']
        ];

        for (const [env, host] of clouds) {
            it(`${env} signs in at ${host} with a client secret`, async () => {
                sinon.stub(core, 'setSecret');
                const urls: string[] = [];
                const provider = createTokenProvider(inputs({ authorityHost: getAdEndpointUrl(env), httpClient: recordingHttpClient(urls) }));
                await provider.getToken('https://management.azure.com/.default');

                expect(urls.length).to.be.greaterThan(0);
                for (const url of urls) {
                    expect(new URL(url).host).to.equal(host);
                }
            });

            it(`${env} signs in at ${host} with federated identity`, async () => {
                sinon.stub(core, 'setSecret');
                sinon.stub(core, 'getIDToken').resolves('github-oidc-token');
                const urls: string[] = [];
                const provider = createTokenProvider(inputs({ federatedIdentity: 'true', authorityHost: getAdEndpointUrl(env), httpClient: recordingHttpClient(urls) }));
                await provider.getToken('https://management.azure.com/.default');

                expect(urls.length).to.be.greaterThan(0);
                for (const url of urls) {
                    expect(new URL(url).host).to.equal(host);
                }
            });
        }
    });

    describe("token masking", () => {
        it('masks each distinct token once', async () => {
            const setSecret = sinon.stub(core, 'setSecret');
            const tokens = ['first', 'first', 'second'];
            const credential = { getToken: async () => ({ token: tokens.shift()!, expiresOnTimestamp: 0 }) };
            const provider = createTokenProvider(inputs(), credential);

            await provider.getToken('scope');
            await provider.getToken('scope');
            await provider.getToken('scope');

            expect(setSecret.args).to.deep.equal([['first'], ['second']]);
        });

        it('wraps credential failures with an actionable message', async () => {
            const credential = { getToken: async () => { throw new Error('boom'); } };
            const provider = createTokenProvider(inputs(), credential);

            let message = '';
            try { await provider.getToken('scope'); } catch (err) { message = (err as Error).message; }
            expect(message).to.equal('Azure authentication failed: boom');
        });
    });

    describe("caching and timeouts", () => {
        it('makes one token request for two getToken calls on the same scope', async () => {
            sinon.stub(core, 'setSecret');
            const urls: string[] = [];
            const provider = createTokenProvider(inputs({ httpClient: recordingHttpClient(urls) }));

            await provider.getToken('https://management.azure.com/.default');
            const afterFirst = urls.filter(u => u.includes('/oauth2/v2.0/token')).length;
            await provider.getToken('https://management.azure.com/.default');
            const afterSecond = urls.filter(u => u.includes('/oauth2/v2.0/token')).length;

            expect(afterFirst).to.equal(1);
            expect(afterSecond).to.equal(1);
        });

        it('fails with the authority host when sign-in never answers', async () => {
            const credential = { getToken: () => new Promise<never>(() => { /* never settles */ }) };
            const provider = createTokenProvider(inputs({ authorityHost: 'https://login.example.test/' }), credential, 20);

            let message = '';
            try { await provider.getToken('scope'); } catch (err) { message = (err as Error).message; }
            expect(message).to.contain('Sign-in to https://login.example.test/ timed out');
            expect(message).to.contain('retry the job');
        });
    });

    describe("one credential per run", () => {
        it('returns the same provider for every request', () => {
            const first = getTokenProvider(inputs());
            const second = getTokenProvider(inputs());
            expect(second).to.equal(first);
        });

        it('requests the scope for each cloud call from the one provider', async () => {
            const getToken = sinon.stub().resolves('bearer');
            setTokenProvider({ getToken });
            sinon.stub(core, 'getInput').callsFake((x: any) => x === 'Environment' ? 'Azure Public' : x);

            await getParams(true, 'Azure Public');
            await getParams(false, 'Azure Public');

            expect(getToken.args).to.deep.equal([
                ['https://dev.azuresynapse.net/.default'],
                ['https://management.azure.com/.default']
            ]);
        });
    });
});
