import * as core from '@actions/core';
import {
    ClientAssertionCredential,
    ClientSecretCredential,
    ClientSecretCredentialOptions,
    ManagedIdentityCredential,
    TokenCredential
} from '@azure/identity';

export interface TokenProvider {
    getToken(scope: string): Promise<string>;
}

export interface AuthInputs {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    managedIdentity: string;
    federatedIdentity: string;
    // The cloud's login host. It must match the cloud of the target workspace,
    // otherwise Azure China and US Government sign-ins go to the public cloud.
    authorityHost: string;
    // Lets tests observe the sign-in requests without a network.
    httpClient?: ClientSecretCredentialOptions['httpClient'];
}

export const SIGN_IN_TIMEOUT_MS = 60000;

const FEDERATED_AUDIENCE = 'api://AzureADTokenExchange';

export function appendDefaultScope(url: string): string {
    return url.replace(/\/+$/, '') + '/.default';
}

function requireInputs(mode: string, inputs: AuthInputs, names: (keyof AuthInputs)[]): void {
    const missing = names.filter(name => !inputs[name]);
    if (missing.length > 0) {
        throw new Error(
            `Missing required input(s) for ${mode} authentication: ${missing.join(', ')}. ` +
            `Set them on the action and retry.`);
    }
}

/**
 * Picks the credential for the configured auth mode. Managed identity wins
 * over federated identity, which wins over a client secret, as before.
 */
export function createCredential(inputs: AuthInputs): TokenCredential {
    if (inputs.managedIdentity == 'true') {
        // A client ID selects a user-assigned identity; without one the
        // system-assigned identity is used.
        return inputs.clientId
            ? new ManagedIdentityCredential({ clientId: inputs.clientId })
            : new ManagedIdentityCredential();
    }

    if (inputs.federatedIdentity == 'true') {
        requireInputs('federated identity', inputs, ['clientId', 'tenantId']);
        core.debug(`Authenticating with federated credentials: client ${inputs.clientId}, tenant ${inputs.tenantId}`);
        return new ClientAssertionCredential(
            inputs.tenantId,
            inputs.clientId,
            async () => {
                try {
                    return await core.getIDToken(FEDERATED_AUDIENCE);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    throw new Error(
                        'Failed to get the GitHub OIDC token. Ensure the job has `id-token: write` ' +
                        `permission and the clientId and tenantId inputs are set: ${message}`);
                }
            },
            { authorityHost: inputs.authorityHost, httpClient: inputs.httpClient });
    }

    requireInputs('client secret', inputs, ['clientId', 'clientSecret', 'tenantId']);
    core.debug(`Authenticating with a client secret: client ${inputs.clientId}, tenant ${inputs.tenantId}`);
    return new ClientSecretCredential(
        inputs.tenantId,
        inputs.clientId,
        inputs.clientSecret,
        { authorityHost: inputs.authorityHost, httpClient: inputs.httpClient });
}

// A sign-in that never answers would otherwise hold the job until the runner
// kills it.
async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Wraps a credential so that every token it returns is masked in the logs.
 * The credential caches tokens per scope until shortly before they expire,
 * so keeping one provider for the run avoids a sign-in per artifact.
 */
export function createTokenProvider(
    inputs: AuthInputs,
    credential: TokenCredential = createCredential(inputs),
    signInTimeoutMs: number = SIGN_IN_TIMEOUT_MS
): TokenProvider {
    const masked = new Set<string>();

    return {
        async getToken(scope: string): Promise<string> {
            let token: string;
            try {
                const accessToken = await withTimeout(
                    credential.getToken(scope),
                    signInTimeoutMs,
                    `Sign-in to ${inputs.authorityHost} timed out after ${Math.round(signInTimeoutMs / 1000)} s; retry the job.`);
                if (!accessToken) {
                    throw new Error('the credential returned no token');
                }
                token = accessToken.token;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`Azure authentication failed: ${message}`);
            }

            if (!masked.has(token)) {
                core.setSecret(token);
                masked.add(token);
            }
            return token;
        }
    };
}

let provider: TokenProvider | undefined;

/** Returns the run's token provider, creating it on first use. */
export function getTokenProvider(inputs: AuthInputs): TokenProvider {
    if (!provider) {
        provider = createTokenProvider(inputs);
    }
    return provider;
}

/** Returns the provider created by the first sign-in, for later token refreshes. */
export function currentTokenProvider(): TokenProvider {
    if (!provider) {
        throw new Error('No Azure sign-in has happened yet; this is a bug in the action.');
    }
    return provider;
}

/** Test seam: install a fake provider, or pass undefined to reset. */
export function setTokenProvider(p: TokenProvider | undefined): void {
    provider = p;
}
