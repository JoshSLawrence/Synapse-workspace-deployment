// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


import { OutgoingHttpHeaders } from 'http';
import { httpClient, isSuccessStatus } from '../http';
import { DeployStatus, Params } from './deploy_utils';
import { SystemLogger } from './logger';

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
        if (!isSuccessStatus(resStatus)) {
            SystemLogger.info(`Unable to fetch location of workspace, status: ${resStatus}; status message: ${res.message.statusMessage}`);
            throw new Error(DeployStatus.failed);
        }

        SystemLogger.info(`Able to fetch location of workspace: ${resStatus}; status message: ${res.message.statusMessage}`);
        const body = await res.readBody();
        return JSON.parse(body)['location'];
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error("Unable to fetch the location of the workspace: " + message);
    }
}
