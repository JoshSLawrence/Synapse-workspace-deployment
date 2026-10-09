export const DATASETPAYLOAD = {
    id: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-example/providers/Microsoft.Synapse/workspaces/myworkspace/datasets/OutParquet",
    name: "OutParquet",
    type: "Microsoft.Synapse/workspaces/datasets",
    etag: "00000000-0000-0000-0000-000000000000",
    properties: {
        linkedServiceName: {
            referenceName: "myworkspace-WorkspaceDefaultStorage",
            type: "LinkedServiceReference"
        },
        annotations: [],
        type: "Parquet",
        typeProperties: {
            location: {
                type: "AzureBlobFSLocation",
                folderPath: "TestPipeline",
                fileSystem: "examplefs"
            },
            compressionCodec: "snappy"
        },
        schema: []
    }
}

export const PIPELINEPAYLOAD = {
    inputs: [
        {
            type: "DatasetReference",
            referenceName: "SourceDataset_pqd"
        }
    ],
    outputs: [
        {
            type: "DatasetReference",
            referenceName: "DestinationDataset_pqd"
        }
    ]
}

export const DEFAULTARTIFACTSQL = {
    "name": "[concat(parameters('workspaceName'), '/test-WorkspaceDefaultSqlServer')]",
    "type": "Microsoft.Synapse/workspaces/linkedServices",
    "apiVersion": "2019-06-01-preview",
    "properties": {
        "parameters": {
            "DBName": {
                "type": "String"
            }
        },
        "annotations": [],
        "type": "AzureSqlDW",
        "typeProperties": {
            "connectionString": "[parameters('myworkspace-WorkspaceDefaultSqlServer_connectionString')]"
        },
        "connectVia": {
            "referenceName": "AutoResolveIntegrationRuntime",
            "type": "IntegrationRuntimeReference"
        }
    },
    "dependsOn": [
        "[concat(variables('workspaceId'), '/integrationRuntimes/AutoResolveIntegrationRuntime')]"
    ]
}

export const DEFAULTARTIFACTSTORAGE = {
    "name": "[concat(parameters('workspaceName'), '/test-WorkspaceDefaultStorage')]",
    "type": "Microsoft.Synapse/workspaces/linkedServices",
    "apiVersion": "2019-06-01-preview",
    "properties": {
        "annotations": [],
        "type": "AzureBlobFS",
        "typeProperties": {
            "url": "[parameters('myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url')]"
        },
        "connectVia": {
            "referenceName": "AutoResolveIntegrationRuntime",
            "type": "IntegrationRuntimeReference"
        }
    },
    "dependsOn": [
        "[concat(variables('workspaceId'), '/integrationRuntimes/AutoResolveIntegrationRuntime')]"
    ]
}

export const DEFAULTARTIFACTCREDENTAILS = {
    "name": "[concat(parameters('workspaceName'), '/WorkspaceSystemIdentity')]",
    "type": "Microsoft.Synapse/workspaces/credentials",
    "apiVersion": "2019-06-01-preview",
    "properties": {
        "type": "ManagedIdentity",
        "typeProperties": {}
    },
    "dependsOn": []
}

export const DEFAULTARTIFACTFAIl1 = {
    "name": "[concat(parameters('workspaceName'), '/test-WorkspaceStorage')]",
    "type": "Microsoft.Synapse/workspaces/linkedServices",
    "apiVersion": "2019-06-01-preview",
    "properties": {
        "annotations": [],
        "type": "AzureBlobFS",
        "typeProperties": {
            "url": "[parameters('myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url')]"
        },
        "connectVia": {
            "referenceName": "AutoResolveIntegrationRuntime",
            "type": "IntegrationRuntimeReference"
        }
    },
    "dependsOn": [
        "[concat(variables('workspaceId'), '/integrationRuntimes/AutoResolveIntegrationRuntime')]"
    ]
}

export const DEFAULTARTIFACTFAIl2 = {
    "name": "[concat(parameters('workspaceName'), '/test-WorkspaceDefaultStorage')]",
    "type": "Microsoft.Synapse/workspaces/linked",
    "apiVersion": "2019-06-01-preview",
    "properties": {
        "annotations": [],
        "type": "AzureBlobFS",
        "typeProperties": {
            "url": "[parameters('myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url')]"
        },
        "connectVia": {
            "referenceName": "AutoResolveIntegrationRuntime",
            "type": "IntegrationRuntimeReference"
        }
    },
    "dependsOn": [
        "[concat(variables('workspaceId'), '/integrationRuntimes/AutoResolveIntegrationRuntime')]"
    ]
}

export const DEFAULTARTIFACTFAIl3 = {
    "name": "[concat(parameters('workspaceName'), '/test-WorkspaceDefaultStorage')]",
    "type": "Microsoft.Synapse/workspaces/linkedServices",
    "apiVersion": "2019-06-01-preview",
    "properties": {
        "annotations": [],
        "type": "SparkPool",
        "typeProperties": {
            "url": "[parameters('myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url')]"
        },
        "connectVia": {
            "referenceName": "AutoResolveIntegrationRuntime",
            "type": "IntegrationRuntimeReference"
        }
    },
    "dependsOn": [
        "[concat(variables('workspaceId'), '/integrationRuntimes/AutoResolveIntegrationRuntime')]"
    ]
}

export const DEFAULTARTIFACT4 = {
    "name": "[concat(parameters('workspaceName'), '/Credential2')]",
    "type": "Microsoft.Synapse/workspaces/credentials",
    "apiVersion": "2019-06-01-preview",
    "properties": {
        "type": "ServicePrincipal",
        "typeProperties": {
            "tenant": "[parameters('Credential2_properties_typeProperties_tenant')]",
            "servicePrincipalId": "[parameters('Credential2_properties_typeProperties_servicePrincipalId')]",
            "servicePrincipalKey": "[parameters('Credential2_properties_typeProperties_servicePrincipalKey')]"
        }
    },
    "dependsOn": [
        "[concat(variables('workspaceId'), '/linkedServices/AzureKeyVault1')]"
    ]
}

