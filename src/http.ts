import { HttpClient } from '@actions/http-client';

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
