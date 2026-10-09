// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


import * as core from '@actions/core';
import { appendDefaultScope, getTokenProvider } from './auth';

export enum DeployStatus {
    success = 'Success',
    failed = 'Failed',
    skipped = 'Skipped'
}

export enum Env {
    prod = 'Azure Public',
    mooncake = 'Azure China',
    usnat = 'Azure US Government',
}

export interface Params {
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
    tenantId: string;
    managedIdentity: string;
    federatedIdentity: string;
    activeDirectoryEndpointUrl: string;
    resourceManagerEndpointUrl: string;
    bearer: string,
    resourceGroup: string,
}

export type ResourceType = 'credential' | 'sqlPool' | 'bigDataPool' | 'sqlscript' | 'notebook' | 'sparkjobdefinition'
    | 'linkedService' | 'pipeline' | 'dataset' | 'trigger' | 'integrationRuntime' | 'dataflow'
    | 'managedVirtualNetworks' | 'managedPrivateEndpoints' | 'kqlScript' | 'database';


export async function getParams(dataplane: boolean = false, env: string = ""): Promise<Params> {
    let environment: string;
    let resourceGroup: string;
    let clientId: string;
    let clientSecret: string;
    let subscriptionId: string;
    let tenantId: string;
    let managedIdentity: string;
    let federatedIdentity: string;
    let activeDirectoryEndpointUrl: string;
    let resourceManagerEndpointUrl: string;

    try {
        environment = env || core.getInput('Environment');
        resourceGroup = core.getInput("resourceGroup");
        clientId = core.getInput("clientId");
        clientSecret = core.getInput("clientSecret");
        subscriptionId = core.getInput("subscriptionId");
        tenantId = core.getInput("tenantId");
        managedIdentity = core.getInput("managedIdentity");
        federatedIdentity = core.getInput("federatedIdentity");
        activeDirectoryEndpointUrl = getAdEndpointUrl(environment);
        resourceManagerEndpointUrl = getRmEndpointUrl(environment);

    } catch (err) {
        throw new Error("Unable to parse the secret: " + err);
    }

    try {
        if (dataplane) {
            resourceManagerEndpointUrl = await getRMUrl(environment);
        }

        const tokenProvider = getTokenProvider({
            clientId,
            clientSecret,
            tenantId,
            managedIdentity,
            federatedIdentity,
            authorityHost: activeDirectoryEndpointUrl
        });
        const bearer: string = await tokenProvider.getToken(appendDefaultScope(resourceManagerEndpointUrl));

        let params: Params = {
            'clientId': clientId,
            'clientSecret': clientSecret,
            'subscriptionId': subscriptionId,
            'tenantId': tenantId,
            'managedIdentity': managedIdentity,
            'federatedIdentity': federatedIdentity,
            'activeDirectoryEndpointUrl': activeDirectoryEndpointUrl,
            'resourceManagerEndpointUrl': resourceManagerEndpointUrl,
            'bearer': bearer,
            'resourceGroup': resourceGroup
        };
        return params;

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error("Failed to fetch Bearer: " + message);
    }
}

export async function getRMUrl(env: string): Promise<string> {
    switch (env) {
        case Env.prod.toString():
            return `https://dev.azuresynapse.net`;
        case Env.mooncake.toString():
            return `https://dev.azuresynapse.azure.cn`;
        case Env.usnat.toString():
            return `https://dev.azuresynapse.usgovcloudapi.net`;
        default:
            throw new Error('Environment validation failed');
    }
}

export function getAdEndpointUrl(env: string): string {
    switch (env) {
        case Env.prod.toString():
            return `https://login.microsoftonline.com/`;
        case Env.mooncake.toString():
            return `https://login.chinacloudapi.cn/`;
        case Env.usnat.toString():
            return `https://login.microsoftonline.us/`;
        default:
            throw new Error('Environment validation failed');
    }
}

export function getRmEndpointUrl(env: string): string {
    switch (env) {
        case Env.prod.toString():
            return `https://management.azure.com/`;
        case Env.mooncake.toString():
            return `https://management.chinacloudapi.cn/`;
        case Env.usnat.toString():
            return `https://management.usgovcloudapi.net/`;
        default:
            throw new Error('Environment validation failed');
    }
}



