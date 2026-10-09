export var armTemplate = "{\n" +
    "  \"$schema\": \"http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#\",\n" +
    "  \"contentVersion\": \"1.0.0.0\",\n" +
    "  \"parameters\": {\n" +
    "    \"workspaceName\": {\n" +
    "      \"type\": \"string\",\n" +
    "      \"metadata\": \"Workspace name\",\n" +
    "      \"defaultValue\": \"myworkspace\"\n" +
    "    },\n" +
    "    \"myworkspace-WorkspaceDefaultSqlServer_connectionString\": {\n" +
    "      \"type\": \"secureString\",\n" +
    "      \"metadata\": \"Secure string for 'connectionString' of 'myworkspace-WorkspaceDefaultSqlServer'\"\n" +
    "    },\n" +
    "    \"myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url\": {\n" +
    "      \"type\": \"string\",\n" +
    "      \"defaultValue\": \"https://examplestorage.dfs.core.windows.net\"\n" +
    "    }\n" +
    "  },\n" +
    "  \"variables\": {\n" +
    "    \"workspaceId\": \"[concat('Microsoft.Synapse/workspaces/', parameters('workspaceName'))]\"\n" +
    "  },\n" +
    "  \"resources\": [\n" +
    "    {\n" +
    "      \"name\": \"[concat(parameters('workspaceName'), '/Pipeline 1 - git')]\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/pipelines\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"activities\": [\n" +
    "          {\n" +
    "            \"name\": \"Notebook 1 - git\",\n" +
    "            \"type\": \"SynapseNotebook\",\n" +
    "            \"dependsOn\": [],\n" +
    "            \"policy\": {\n" +
    "              \"timeout\": \"7.00:00:00\",\n" +
    "              \"retry\": 0,\n" +
    "              \"retryIntervalInSeconds\": 30,\n" +
    "              \"secureOutput\": false,\n" +
    "              \"secureInput\": false\n" +
    "            },\n" +
    "            \"userProperties\": [],\n" +
    "            \"typeProperties\": {\n" +
    "              \"notebook\": {\n" +
    "                \"referenceName\": \"Notebook 1 - git\",\n" +
    "                \"type\": \"NotebookReference\"\n" +
    "              }\n" +
    "            }\n" +
    "          }\n" +
    "        ],\n" +
    "        \"annotations\": [],\n" +
    "        \"lastPublishTime\": \"2021-02-12T06:20:49Z\"\n" +
    "      },\n" +
    "      \"dependsOn\": [\n" +
    "        \"[concat(variables('workspaceId'), '/notebooks/Notebook 1 - git')]\"\n" +
    "      ]\n" +
    "    },\n" +
    "    {\n" +
    "      \"name\": \"[concat(parameters('workspaceName'), '/Notebook 1 - git')]\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/notebooks\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"nbformat\": 4,\n" +
    "        \"nbformat_minor\": 2,\n" +
    "        \"bigDataPool\": {\n" +
    "          \"referenceName\": \"sparkpoolgit\",\n" +
    "          \"type\": \"BigDataPoolReference\"\n" +
    "        },\n" +
    "        \"sessionProperties\": {\n" +
    "          \"driverMemory\": \"28g\",\n" +
    "          \"driverCores\": 4,\n" +
    "          \"executorMemory\": \"28g\",\n" +
    "          \"executorCores\": 4,\n" +
    "          \"numExecutors\": 2,\n" +
    "          \"conf\": {\n" +
    "            \"spark.dynamicAllocation.enabled\": \"false\",\n" +
    "            \"spark.dynamicAllocation.minExecutors\": \"2\",\n" +
    "            \"spark.dynamicAllocation.maxExecutors\": \"2\"\n" +
    "          }\n" +
    "        },\n" +
    "        \"metadata\": {\n" +
    "          \"saveOutput\": true,\n" +
    "          \"synapse_widget\": {\n" +
    "            \"version\": \"0.1\"\n" +
    "          },\n" +
    "          \"kernelspec\": {\n" +
    "            \"name\": \"synapse_pyspark\",\n" +
    "            \"display_name\": \"Synapse PySpark\"\n" +
    "          },\n" +
    "          \"language_info\": {\n" +
    "            \"name\": \"python\"\n" +
    "          },\n" +
    "          \"a365ComputeOptions\": {\n" +
    "            \"id\": \"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-example/providers/Microsoft.Synapse/workspaces/myworkspace/bigDataPools/sparkpoolgit\",\n" +
    "            \"name\": \"sparkpoolgit\",\n" +
    "            \"type\": \"Spark\",\n" +
    "            \"endpoint\": \"https://myworkspace.dev.azuresynapse.net/livyApi/versions/2019-11-01-preview/sparkPools/sparkpoolgit\",\n" +
    "            \"auth\": {\n" +
    "              \"type\": \"AAD\",\n" +
    "              \"authResource\": \"https://dev.azuresynapse.net\"\n" +
    "            },\n" +
    "            \"sparkVersion\": \"2.4\",\n" +
    "            \"nodeCount\": 10,\n" +
    "            \"cores\": 4,\n" +
    "            \"memory\": 28\n" +
    "          }\n" +
    "        },\n" +
    "        \"cells\": [\n" +
    "          {\n" +
    "            \"cell_type\": \"code\",\n" +
    "            \"metadata\": {\n" +
    "              \"microsoft\": {\n" +
    "                \"language\": \"python\"\n" +
    "              }\n" +
    "            },\n" +
    "            \"source\": [\n" +
    "              \"%%pyspark\\r\\n\",\n" +
    "              \"print()\"\n" +
    "            ],\n" +
    "            \"attachments\": null,\n" +
    "            \"outputs\": [],\n" +
    "            \"execution_count\": 2\n" +
    "          }\n" +
    "        ]\n" +
    "      },\n" +
    "      \"dependsOn\": []\n" +
    "    },\n" +
    "   {\n" +
    "      \"name\": \"[concat(parameters('workspaceName'), '/myworkspace-WorkspaceDefaultSqlServer')]\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/linkedServices\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"parameters\": {\n" +
    "          \"DBName\": {\n" +
    "            \"type\": \"String\"\n" +
    "          }\n" +
    "        },\n" +
    "        \"annotations\": [],\n" +
    "        \"type\": \"AzureSqlDW\",\n" +
    "        \"typeProperties\": {\n" +
    "          \"connectionString\": \"[parameters('myworkspace-WorkspaceDefaultSqlServer_connectionString')]\"\n" +
    "        },\n" +
    "        \"connectVia\": {\n" +
    "          \"referenceName\": \"AutoResolveIntegrationRuntime\",\n" +
    "          \"type\": \"IntegrationRuntimeReference\"\n" +
    "        }\n" +
    "      },\n" +
    "      \"dependsOn\": [\n" +
    "        \"[concat(variables('workspaceId'), '/integrationRuntimes/AutoResolveIntegrationRuntime')]\"\n" +
    "      ]\n" +
    "    }\n"+
    "  ]\n" +
    "}";

export var armTemplate_complete = "{\n" +
    "  \"$schema\": \"http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#\",\n" +
    "  \"contentVersion\": \"1.0.0.0\",\n" +
    "  \"parameters\": {\n" +
    "    \"workspaceName\": {\n" +
    "      \"type\": \"string\",\n" +
    "      \"metadata\": \"Workspace name\",\n" +
    "      \"defaultValue\": \"myworkspace\"\n" +
    "    },\n" +
    "    \"myworkspace-WorkspaceDefaultSqlServer_connectionString\": {\n" +
    "      \"type\": \"secureString\",\n" +
    "      \"metadata\": \"Secure string for 'connectionString' of 'myworkspace-WorkspaceDefaultSqlServer'\"\n" +
    "    },\n" +
    "    \"myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url\": {\n" +
    "      \"type\": \"string\",\n" +
    "      \"defaultValue\": \"https://examplestorage.dfs.core.windows.net\"\n" +
    "    }\n" +
    "  },\n" +
    "  \"variables\": {\n" +
    "    \"workspaceId\": \"[concat('Microsoft.Synapse/workspaces/', parameters('workspaceName'))]\"\n" +
    "  },\n" +
    "  \"resources\": [\n" +
    "    {\n" +
    "      \"name\": \"[concat(parameters('workspaceName'), '/Pipeline 1 - git')]\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/pipelines\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"activities\": [\n" +
    "          {\n" +
    "            \"name\": \"Notebook 1 - git\",\n" +
    "            \"type\": \"SynapseNotebook\",\n" +
    "            \"dependsOn\": [],\n" +
    "            \"policy\": {\n" +
    "              \"timeout\": \"7.00:00:00\",\n" +
    "              \"retry\": 0,\n" +
    "              \"retryIntervalInSeconds\": 30,\n" +
    "              \"secureOutput\": false,\n" +
    "              \"secureInput\": false\n" +
    "            },\n" +
    "            \"userProperties\": [],\n" +
    "            \"typeProperties\": {\n" +
    "              \"notebook\": {\n" +
    "                \"referenceName\": \"Notebook 1 - git\",\n" +
    "                \"type\": \"NotebookReference\"\n" +
    "              }\n" +
    "            }\n" +
    "          }\n" +
    "        ],\n" +
    "        \"annotations\": [],\n" +
    "        \"lastPublishTime\": \"2021-02-12T06:20:49Z\"\n" +
    "      },\n" +
    "      \"dependsOn\": [\n" +
    "        \"[concat(variables('workspaceId'), '/notebooks/Notebook 1 - git')]\"\n" +
    "      ]\n" +
    "    },\n" +
    "    {\n" +
    "      \"name\": \"[concat(parameters('workspaceName'), '/Notebook 1 - git')]\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/notebooks\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"nbformat\": 4,\n" +
    "        \"nbformat_minor\": 2,\n" +
    "        \"bigDataPool\": {\n" +
    "          \"referenceName\": \"sparkpoolgit\",\n" +
    "          \"type\": \"BigDataPoolReference\"\n" +
    "        },\n" +
    "        \"sessionProperties\": {\n" +
    "          \"driverMemory\": \"28g\",\n" +
    "          \"driverCores\": 4,\n" +
    "          \"executorMemory\": \"28g\",\n" +
    "          \"executorCores\": 4,\n" +
    "          \"numExecutors\": 2,\n" +
    "          \"conf\": {\n" +
    "            \"spark.dynamicAllocation.enabled\": \"false\",\n" +
    "            \"spark.dynamicAllocation.minExecutors\": \"2\",\n" +
    "            \"spark.dynamicAllocation.maxExecutors\": \"2\"\n" +
    "          }\n" +
    "        },\n" +
    "        \"metadata\": {\n" +
    "          \"saveOutput\": true,\n" +
    "          \"synapse_widget\": {\n" +
    "            \"version\": \"0.1\"\n" +
    "          },\n" +
    "          \"kernelspec\": {\n" +
    "            \"name\": \"synapse_pyspark\",\n" +
    "            \"display_name\": \"Synapse PySpark\"\n" +
    "          },\n" +
    "          \"language_info\": {\n" +
    "            \"name\": \"python\"\n" +
    "          },\n" +
    "          \"a365ComputeOptions\": {\n" +
    "            \"id\": \"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-example/providers/Microsoft.Synapse/workspaces/myworkspace/bigDataPools/sparkpoolgit\",\n" +
    "            \"name\": \"sparkpoolgit\",\n" +
    "            \"type\": \"Spark\",\n" +
    "            \"endpoint\": \"https://myworkspace.dev.azuresynapse.net/livyApi/versions/2019-11-01-preview/sparkPools/sparkpoolgit\",\n" +
    "            \"auth\": {\n" +
    "              \"type\": \"AAD\",\n" +
    "              \"authResource\": \"https://dev.azuresynapse.net\"\n" +
    "            },\n" +
    "            \"sparkVersion\": \"2.4\",\n" +
    "            \"nodeCount\": 10,\n" +
    "            \"cores\": 4,\n" +
    "            \"memory\": 28\n" +
    "          }\n" +
    "        },\n" +
    "        \"cells\": [\n" +
    "          {\n" +
    "            \"cell_type\": \"code\",\n" +
    "            \"metadata\": {\n" +
    "              \"microsoft\": {\n" +
    "                \"language\": \"python\"\n" +
    "              }\n" +
    "            },\n" +
    "            \"source\": [\n" +
    "              \"%%pyspark\\r\\n\",\n" +
    "              \"print()\"\n" +
    "            ],\n" +
    "            \"attachments\": null,\n" +
    "            \"outputs\": [],\n" +
    "            \"execution_count\": 2\n" +
    "          }\n" +
    "        ]\n" +
    "      },\n" +
    "      \"dependsOn\": []\n" +
    "    },\n" +
    "   {\n" +
    "      \"name\": \"[concat(parameters('workspaceName'), '/myworkspace-WorkspaceDefaultSqlServer')]\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/linkedServices\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"parameters\": {\n" +
    "          \"DBName\": {\n" +
    "            \"type\": \"String\"\n" +
    "          }\n" +
    "        },\n" +
    "        \"annotations\": [],\n" +
    "        \"type\": \"AzureSqlDW\",\n" +
    "        \"typeProperties\": {\n" +
    "          \"connectionString\": \"[parameters('myworkspace-WorkspaceDefaultSqlServer_connectionString')]\"\n" +
    "        },\n" +
    "        \"connectVia\": {\n" +
    "          \"referenceName\": \"AutoResolveIntegrationRuntime\",\n" +
    "          \"type\": \"IntegrationRuntimeReference\"\n" +
    "        }\n" +
    "      },\n" +
    "      \"dependsOn\": [\n" +
    "        \"[concat(variables('workspaceId'), '/integrationRuntimes/AutoResolveIntegrationRuntime')]\"\n" +
    "      ]\n" +
    "    },\n"+
    "    {\n" +
    "      \"name\": \"[concat(parameters('workspaceName'), '/AutoResolveIntegrationRuntime')]\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/integrationRuntimes\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"type\": \"Managed\",\n" +
    "        \"typeProperties\": {\n" +
    "          \"computeProperties\": {\n" +
    "            \"location\": \"AutoResolve\",\n" +
    "            \"dataFlowProperties\": {\n" +
    "              \"computeType\": \"General\",\n" +
    "              \"coreCount\": 8,\n" +
    "              \"timeToLive\": 0\n" +
    "            }\n" +
    "          }\n" +
    "        }\n" +
    "      },\n" +
    "      \"dependsOn\": []\n" +
    "    }\n" +
    "  ]\n" +
    "}";

export var armParams = "{\n" +
    "\t\"$schema\": \"https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#\",\n" +
    "\t\"contentVersion\": \"1.0.0.0\",\n" +
    "\t\"parameters\": {\n" +
    "\t\t\"workspaceName\": {\n" +
    "\t\t\t\"value\": \"myworkspace\"\n" +
    "\t\t},\n" +
    "\t\t\"myworkspace-WorkspaceDefaultSqlServer_connectionString\": {\n" +
    "\t\t\t\"value\": \"\"\n" +
    "\t\t},\n" +
    "\t\t\"myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url\": {\n" +
    "\t\t\t\"value\": \"https://examplestorage.dfs.core.windows.net\"\n" +
    "\t\t}\n" +
    "\t}\n" +
    "}";

export let expectedArmTemplate = "{\n" +
    "  \"$schema\": \"http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#\",\n" +
    "  \"contentVersion\": \"1.0.0.0\",\n" +
    "  \"parameters\": {\n" +
    "    \"workspaceName\": {\n" +
    "      \"type\": \"string\",\n" +
    "      \"metadata\": \"Workspace name\",\n" +
    "      \"defaultValue\": \"myworkspace\"\n" +
    "    },\n" +
    "    \"myworkspace-WorkspaceDefaultSqlServer_connectionString\": {\n" +
    "      \"type\": \"secureString\",\n" +
    "      \"metadata\": \"Secure string for 'connectionString' of 'myworkspace-WorkspaceDefaultSqlServer'\"\n" +
    "    },\n" +
    "    \"myworkspace-WorkspaceDefaultStorage_properties_typeProperties_url\": {\n" +
    "      \"type\": \"string\",\n" +
    "      \"defaultValue\": \"https://examplestorage.dfs.core.windows.net\"\n" +
    "    }\n" +
    "  },\n" +
    "  \"variables\": {\n" +
    "    \"workspaceId\": \"Microsoft.Synapse/workspaces/MochaTesting\"\n" +
    "  },\n" +
    "  \"resources\": [\n" +
    "    {\n" +
    "      \"name\": \"MochaTesting/Pipeline 1 - git\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/pipelines\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"activities\": [\n" +
    "          {\n" +
    "            \"name\": \"Notebook 1 - git\",\n" +
    "            \"type\": \"SynapseNotebook\",\n" +
    "            \"dependsOn\": [],\n" +
    "            \"policy\": {\n" +
    "              \"timeout\": \"7.00:00:00\",\n" +
    "              \"retry\": 0,\n" +
    "              \"retryIntervalInSeconds\": 30,\n" +
    "              \"secureOutput\": false,\n" +
    "              \"secureInput\": false\n" +
    "            },\n" +
    "            \"userProperties\": [],\n" +
    "            \"typeProperties\": {\n" +
    "              \"notebook\": {\n" +
    "                \"referenceName\": \"Notebook 1 - git\",\n" +
    "                \"type\": \"NotebookReference\"\n" +
    "              }\n" +
    "            }\n" +
    "          }\n" +
    "        ],\n" +
    "        \"annotations\": [],\n" +
    "        \"lastPublishTime\": \"2021-02-12T06:20:49Z\"\n" +
    "      },\n" +
    "      \"dependsOn\": [\n" +
    "        \"Microsoft.Synapse/workspaces/MochaTesting/notebooks/Notebook 1 - git\"\n" +
    "      ]\n" +
    "    },\n" +
    "    {\n" +
    "      \"name\": \"MochaTesting/Notebook 1 - git\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/notebooks\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"nbformat\": 4,\n" +
    "        \"nbformat_minor\": 2,\n" +
    "        \"bigDataPool\": {\n" +
    "          \"referenceName\": \"sparkpoolgit\",\n" +
    "          \"type\": \"BigDataPoolReference\"\n" +
    "        },\n" +
    "        \"sessionProperties\": {\n" +
    "          \"driverMemory\": \"28g\",\n" +
    "          \"driverCores\": 4,\n" +
    "          \"executorMemory\": \"28g\",\n" +
    "          \"executorCores\": 4,\n" +
    "          \"numExecutors\": 2,\n" +
    "          \"conf\": {\n" +
    "            \"spark.dynamicAllocation.enabled\": \"false\",\n" +
    "            \"spark.dynamicAllocation.minExecutors\": \"2\",\n" +
    "            \"spark.dynamicAllocation.maxExecutors\": \"2\"\n" +
    "          }\n" +
    "        },\n" +
    "        \"metadata\": {\n" +
    "          \"saveOutput\": true,\n" +
    "          \"synapse_widget\": {\n" +
    "            \"version\": \"0.1\"\n" +
    "          },\n" +
    "          \"kernelspec\": {\n" +
    "            \"name\": \"synapse_pyspark\",\n" +
    "            \"display_name\": \"Synapse PySpark\"\n" +
    "          },\n" +
    "          \"language_info\": {\n" +
    "            \"name\": \"python\"\n" +
    "          },\n" +
    "          \"a365ComputeOptions\": {\n" +
    "            \"id\": \"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-example/providers/Microsoft.Synapse/workspaces/myworkspace/bigDataPools/sparkpoolgit\",\n" +
    "            \"name\": \"sparkpoolgit\",\n" +
    "            \"type\": \"Spark\",\n" +
    "            \"endpoint\": \"https://myworkspace.dev.azuresynapse.net/livyApi/versions/2019-11-01-preview/sparkPools/sparkpoolgit\",\n" +
    "            \"auth\": {\n" +
    "              \"type\": \"AAD\",\n" +
    "              \"authResource\": \"https://dev.azuresynapse.net\"\n" +
    "            },\n" +
    "            \"sparkVersion\": \"2.4\",\n" +
    "            \"nodeCount\": 10,\n" +
    "            \"cores\": 4,\n" +
    "            \"memory\": 28\n" +
    "          }\n" +
    "        },\n" +
    "        \"cells\": [\n" +
    "          {\n" +
    "            \"cell_type\": \"code\",\n" +
    "            \"metadata\": {\n" +
    "              \"microsoft\": {\n" +
    "                \"language\": \"python\"\n" +
    "              }\n" +
    "            },\n" +
    "            \"source\": [\n" +
    "              \"%%pyspark\\r\\n\",\n" +
    "              \"print()\"\n" +
    "            ],\n" +
    "            \"attachments\": null,\n" +
    "            \"outputs\": [],\n" +
    "            \"execution_count\": 2\n" +
    "          }\n" +
    "        ]\n" +
    "      },\n" +
    "      \"dependsOn\": []\n" +
    "    },\n" +
    "   {\n" +
    "      \"name\": \"MochaTesting/myworkspace-WorkspaceDefaultSqlServer\",\n" +
    "      \"type\": \"Microsoft.Synapse/workspaces/linkedServices\",\n" +
    "      \"apiVersion\": \"2019-06-01-preview\",\n" +
    "      \"properties\": {\n" +
    "        \"parameters\": {\n" +
    "          \"DBName\": {\n" +
    "            \"type\": \"String\"\n" +
    "          }\n" +
    "        },\n" +
    "        \"annotations\": [],\n" +
    "        \"type\": \"AzureSqlDW\",\n" +
    "        \"typeProperties\": {\n" +
    "          \"connectionString\": \"\"\n" +
    "        },\n" +
    "        \"connectVia\": {\n" +
    "          \"referenceName\": \"AutoResolveIntegrationRuntime\",\n" +
    "          \"type\": \"IntegrationRuntimeReference\"\n" +
    "        }\n" +
    "      },\n" +
    "      \"dependsOn\": [\n" +
    "        \"Microsoft.Synapse/workspaces/MochaTesting/integrationRuntimes/AutoResolveIntegrationRuntime\"\n" +
    "      ]\n" +
    "    }\n" +
    "  ]\n" +
    "}";

