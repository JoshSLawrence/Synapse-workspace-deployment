// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


import * as httpClient from 'typed-rest-client/HttpClient';
import * as httpInterfaces from 'typed-rest-client/Interfaces';
import { DeployStatus, Params } from './deploy_utils';
import { SystemLogger } from './logger';

const userAgent: string = 'synapse-github-cicd-deploy-task'
const requestOptions: httpInterfaces.IRequestOptions = {};
const client: httpClient.HttpClient = new httpClient.HttpClient(userAgent, undefined, requestOptions);

export async function getWorkspaceLocation(params: Params, targetWorkspace: string): Promise<string> {
    try {

        return new Promise<string>((resolve, reject) => {
            let resourceManagerEndpointUrl = params.resourceManagerEndpointUrl;
            let subscriptionId = params.subscriptionId;
            let resourceGroup = params.resourceGroup;

            let headers = {
                'Authorization': 'Bearer ' + params.bearer
            }

            let url = `${resourceManagerEndpointUrl}subscriptions/${subscriptionId}/` +
                `resourceGroups/${resourceGroup}/providers/Microsoft.Synapse/workspaces/` +
                `${targetWorkspace}?api-version=2019-06-01-preview`;


            client.get(url, headers).then(async (res) => {
                let resStatus = res.message.statusCode;
                if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                    SystemLogger.info(`Unable to fetch location of workspace, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    return reject(DeployStatus.failed);
                }

                SystemLogger.info(`Able to fetch location of workspace: ${resStatus}; status message: ${res.message.statusMessage}`);
                let body = await res.readBody();
                return resolve(JSON.parse(body)['location']);
            })
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error("Unable to fetch the location of the workspace: " + message);
    }
}
