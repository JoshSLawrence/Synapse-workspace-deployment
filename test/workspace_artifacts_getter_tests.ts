import chai = require('chai');
import { typeMap } from "../src/clients/artifacts_client";
import { Resource } from "../src/utils/arm_template_utils";
import { removeManagedPrivateEndpointsFromDeletion } from "../src/utils/workspace_artifacts_getter";

function resource(name: string, type: string): Resource {
    return { name, type, isDefault: false, content: '', dependson: [] };
}

describe('removeManagedPrivateEndpointsFromDeletion', function () {
    const pipeline = resource('pipeline1', 'Microsoft.Synapse/workspaces/pipelines');
    const endpoint = resource('iac-endpoint', 'Microsoft.Synapse/workspaces/managedVirtualNetworks/managedPrivateEndpoints');
    const notebook = resource('notebook1', 'Microsoft.Synapse/workspaces/notebooks');

    it('Should drop managed private endpoints and keep the order of the rest when MPEs are not deployed', function () {
        const result = removeManagedPrivateEndpointsFromDeletion([pipeline, endpoint, notebook], false, typeMap);
        chai.assert.deepEqual(result, [pipeline, notebook]);
    });

    it('Should keep managed private endpoints when MPEs are deployed', function () {
        const result = removeManagedPrivateEndpointsFromDeletion([pipeline, endpoint, notebook], true, typeMap);
        chai.assert.deepEqual(result, [pipeline, endpoint, notebook]);
    });
});
