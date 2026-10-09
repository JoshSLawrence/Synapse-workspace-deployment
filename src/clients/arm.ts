import { OutgoingHttpHeaders } from 'http';
import { httpClient, isRedirectStatus, isSuccessStatus, permissionHint, readBody, redirectError } from '../http';
import { Params } from '../utils/deploy_utils';
import { SystemLogger } from '../utils/logger';

export async function getWorkspaceLocation(params: Params, targetWorkspace: string): Promise<string> {
    try {
        const headers: OutgoingHttpHeaders = {
            'Authorization': 'Bearer ' + params.bearer
        };

        const url = `${params.resourceManagerEndpointUrl}subscriptions/${params.subscriptionId}/` +
            `resourceGroups/${params.resourceGroup}/providers/Microsoft.Synapse/workspaces/` +
            `${targetWorkspace}?api-version=2019-06-01-preview`;

        const res = await httpClient.get(url, headers);
        const resStatus = res.message.statusCode;
        const body = await readBody(res);
        if (isRedirectStatus(resStatus)) {
            throw redirectError(res);
        }
        if (!isSuccessStatus(resStatus)) {
            SystemLogger.info(`Unable to fetch location of workspace, status: ${resStatus}; status message: ${res.message.statusMessage}`);
            throw new Error(`status ${resStatus}: ${body}.` + permissionHint(resStatus, 'a role that can read the workspace (for example Reader) on the resource group'));
        }

        SystemLogger.info(`Able to fetch location of workspace: ${resStatus}; status message: ${res.message.statusMessage}`);
        return JSON.parse(body)['location'];
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error("Unable to fetch the location of the workspace: " + message);
    }
}
