// Single multi-region-write Cosmos DB (NoSQL) account with Session consistency.
// Write locations are projected from the enabled-region list; the first region is
// primary (failover priority 0). Application access is keyless: the shared managed
// identity is granted the Built-in Data Contributor data-plane role.

@description('Cosmos DB account name (lowercase, globally unique).')
param accountName string

@description('Enabled regions in priority order. First element is the primary write region. Shape: [{ name, short }].')
param regions array

@description('Principal ID of the managed identity that gets data-plane access.')
param principalId string

@description('Tags applied to the account.')
param tags object = {}

var databaseName = 'guestbook'
var containerName = 'entries'

// Cosmos DB Built-in Data Contributor (data-plane) role definition id.
var dataContributorRoleId = '00000000-0000-0000-0000-000000000002'

resource account 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: accountName
  // The account's own location is the primary (first) region.
  location: regions[0].name
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableMultipleWriteLocations: true
    disableLocalAuth: true // keyless: force managed-identity / AAD auth only
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [for (r, i) in regions: {
      locationName: r.name
      failoverPriority: i
      isZoneRedundant: false
    }]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: account
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: containerName
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: [
          '/region'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource dataPlaneAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-11-15' = {
  parent: account
  name: guid(account.id, principalId, dataContributorRoleId)
  properties: {
    roleDefinitionId: '${account.id}/sqlRoleDefinitions/${dataContributorRoleId}'
    principalId: principalId
    scope: account.id
  }
}

output endpoint string = account.properties.documentEndpoint
output accountName string = account.name
