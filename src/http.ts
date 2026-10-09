import { HttpClient, HttpClientResponse } from '@actions/http-client';

export const userAgent: string = 'synapse-github-cicd-deploy-task';

// Without a socket timeout a stalled connection never settles, so the job
// runs until the runner kills it. Large workspaces take minutes to answer the
// database queries, hence 5 minutes for data-plane calls.
export const DATA_PLANE_SOCKET_TIMEOUT_MS = 300000;

// Redirects stay off: every request carries a bearer token, and none of the
// Azure endpoints used here is expected to redirect.
export function createHttpClient(socketTimeout: number): HttpClient {
    return new HttpClient(userAgent, [], { socketTimeout, allowRedirects: false });
}

export const httpClient: HttpClient = createHttpClient(DATA_PLANE_SOCKET_TIMEOUT_MS);

export function isSuccessStatus(status: number | undefined): boolean {
    return status === 200 || status === 201 || status === 202;
}

export function isRedirectStatus(status: number | undefined): boolean {
    return status !== undefined && status >= 300 && status < 400;
}

export function redirectError(res: HttpClientResponse): Error {
    return new Error(`Unexpected redirect to ${res.message.headers.location ?? 'an unknown location'}; redirects are disabled because every request carries a bearer token.`);
}

/**
 * Reads a response body, always settling. @actions/http-client's own readBody
 * listens only for data and end, so a connection reset or stalled body leaves
 * its promise pending forever and the job can exit green with work undone.
 */
export function readBody(res: HttpClientResponse, idleTimeoutMs: number = DATA_PLANE_SOCKET_TIMEOUT_MS): Promise<string> {
    const message = res.message;
    const host = (message as any).req?.host ?? 'the server';

    return new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let ended = false;

        const fail = (reason: string) => {
            if (!ended) {
                ended = true;
                reject(new Error(`${reason}; re-run the job.`));
            }
        };

        message.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        message.on('end', () => {
            if (!ended) {
                ended = true;
                resolve(Buffer.concat(chunks).toString());
            }
        });
        message.on('error', (err: Error) => fail(`Reading the response from ${host} failed: ${err.message}`));
        message.on('aborted', () => fail(`Connection closed before the response from ${host} was complete`));
        message.on('close', () => {
            if (!message.complete) {
                fail(`Connection closed before the response from ${host} was complete`);
            }
        });
        message.setTimeout(idleTimeoutMs, () => {
            const reason = `No data from ${host} for ${Math.round(idleTimeoutMs / 1000)} s`;
            fail(reason);
            message.destroy(new Error(reason));
        });
    });
}

// A 401 or 403 is almost always a missing role, which the raw status does not say.
export function permissionHint(status: number | undefined, role: string): string {
    return status === 401 || status === 403
        ? ` The identity is likely missing ${role}; grant it and re-run the job.`
        : '';
}
