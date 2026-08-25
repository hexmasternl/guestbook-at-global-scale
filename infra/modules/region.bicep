// One Azure Container Apps environment + Container App for a single region.
// Invoked once per enabled region from main.bicep. Stateless: identical everywhere
// except the Guestbook__Region value and the region it runs in.

@description('Azure region canonical name (e.g. westeurope).')
param regionName string

@description('Short region code used in resource names (e.g. weu).')
param regionShort string

@description('Base name prefix for the region resources.')
param namePrefix string

@description('Fully-qualified container image reference (registry/repo:tag).')
param containerImage string

@description('Login server of the central container registry (e.g. myacr.azurecr.io).')
param registryLoginServer string

@description('Username for the central container registry.')
param registryUsername string

@description('Password for the central container registry.')
@secure()
param registryPassword string

@description('Resource ID of the user-assigned managed identity used for Cosmos auth.')
param identityId string

@description('Client ID of the user-assigned managed identity (for DefaultAzureCredential).')
param identityClientId string

@description('Cosmos DB account endpoint URI.')
param cosmosEndpoint string

@description('Origin allowed to call the API from a browser (the frontend Static Web App URL). Scheme + host, no trailing slash.')
param allowedCorsOrigin string

@description('Tags applied to the region resources.')
param tags object = {}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-env-${regionShort}'
  location: regionName
  tags: tags
  properties: {}
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-api-${regionShort}'
  location: regionName
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        {
          name: 'registry-password'
          value: registryPassword
        }
      ]
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: registryLoginServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'guestbook-api'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'Guestbook__Region'
              value: regionName
            }
            {
              // Aspire Cosmos component: endpoint-only connection string => keyless
              // auth via DefaultAzureCredential (see design.md Decision 5).
              name: 'ConnectionStrings__guestbook-cosmos'
              value: cosmosEndpoint
            }
            {
              // Tells DefaultAzureCredential which user-assigned identity to use.
              name: 'AZURE_CLIENT_ID'
              value: identityClientId
            }
            {
              // The frontend is served from a different origin than the API
              // (Static Web App vs Front Door), so the SWA origin must be
              // allow-listed or the browser blocks every call. Array-index
              // syntax maps onto Cors:AllowedOrigins[0] in configuration.
              name: 'Cors__AllowedOrigins__0'
              value: allowedCorsOrigin
            }
          ]
        }
      ]
      scale: {
        // Keep at least one warm replica so Front Door health probes stay green.
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output fqdn string = app.properties.configuration.ingress.fqdn
output appName string = app.name
