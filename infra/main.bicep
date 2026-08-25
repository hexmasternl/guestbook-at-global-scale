//  Guestbook — multi-region backend (Container Apps + Cosmos DB + Front Door)
// ============================================================================
//
//  SINGLE SOURCE OF TRUTH FOR REGIONS  👇
//
//  To enable/disable a region for a conference, comment or uncomment its ONE line
//  below. That single edit adds/removes the region's resource group + Container App,
//  its Cosmos DB write location, AND its Front Door origin — everywhere at once.
//
//  The FIRST uncommented region is the Cosmos DB primary write region.
//  At least one region must stay uncommented — @minLength(1) fails the deployment
//  early (with a clear "array too short" error) if every line is commented out.
//
@minLength(1)
param regions array = [
  //{ name: 'australiacentral', short: 'auc' } // Australia Central
  { name: 'westus', short: 'wus' } // West US
  { name: 'swedencentral', short: 'swc' } // West Europe
  //{ name: 'westeurope', short: 'weu' } // West Europe
  // { name: 'eastus',           short: 'eus' } // East US
  // { name: 'southafricanorth', short: 'san' } // South Africa North
  //{ name: 'westindia', short: 'win' } // West India
]
// ============================================================================

// Subscription-scoped: this deployment creates the resource groups itself.
//  - one CENTRAL resource group  → Front Door + the shared Cosmos DB + managed identity
//  - one resource group PER REGION (in that region) → that region's Container App
targetScope = 'subscription'

@description('Short prefix for resource names (lowercase letters/digits).')
@minLength(3)
@maxLength(11)
param resourcePrefix string = 'guestbook'

@description('Fully-qualified container image reference (registry/repo:tag) to deploy.')
param containerImage string

@description('Login server of the existing central container registry (e.g. myacr.azurecr.io).')
param registryLoginServer string

@description('Username for the existing central container registry.')
param registryUsername string

@description('Password for the existing central container registry.')
@secure()
param registryPassword string

@description('Location for the central resource group (Front Door / Cosmos / identity).')
param centralLocation string = 'westeurope'

@description('Tags applied to all resources.')
param tags object = {
  workload: 'guestbook'
  managedBy: 'bicep'
}

// Short, deterministic suffix for globally-unique names (Cosmos/Front Door).
var suffix = uniqueString(subscription().id, resourcePrefix)

var centralResourceGroupName = '${resourcePrefix}-central-rg'

// ---------------------------------------------------------------------------
// Resource groups (created by this subscription-scoped deployment).
// ---------------------------------------------------------------------------
resource centralResourceGroup 'Microsoft.Resources/resourceGroups@2024-07-01' = {
  name: centralResourceGroupName
  location: centralLocation
  tags: tags
}

resource regionResourceGroups 'Microsoft.Resources/resourceGroups@2024-07-01' = [
  for r in regions: {
    name: '${resourcePrefix}-${r.short}-rg'
    location: r.name
    tags: tags
  }
]

// ---------------------------------------------------------------------------
// CENTRAL: shared user-assigned managed identity (Cosmos data-plane auth).
// The container image is pulled from the central ACR with registry credentials
// (below), not this identity — so no AcrPull role assignment is needed.
// ---------------------------------------------------------------------------
module identity 'modules/identity.bicep' = {
  scope: centralResourceGroup
  name: 'identity'
  params: {
    location: centralLocation
    identityName: '${resourcePrefix}-id'
    tags: tags
  }
}

// ---------------------------------------------------------------------------
// CENTRAL: Cosmos DB — multi-region writes, Session consistency, keyless access.
// ---------------------------------------------------------------------------
module cosmos 'modules/cosmos.bicep' = {
  scope: centralResourceGroup
  name: 'cosmos'
  params: {
    accountName: toLower('${resourcePrefix}-cosmos-${suffix}')
    regions: regions
    principalId: identity.outputs.principalId
    tags: tags
  }
}

// ---------------------------------------------------------------------------
// PER REGION: one resource group (above) with a Container Apps environment + app.
// ---------------------------------------------------------------------------
module regionDeployments 'modules/region.bicep' = [
  for (r, i) in regions: {
    scope: regionResourceGroups[i]
    name: 'region-${r.short}'
    params: {
      regionName: r.name
      regionShort: r.short
      namePrefix: resourcePrefix
      containerImage: containerImage
      registryLoginServer: registryLoginServer
      registryUsername: registryUsername
      registryPassword: registryPassword
      identityId: identity.outputs.identityId
      identityClientId: identity.outputs.clientId
      cosmosEndpoint: cosmos.outputs.endpoint
      tags: tags
    }
  }
]

// ---------------------------------------------------------------------------
// CENTRAL: Front Door — profile + endpoint + origin group.
// ---------------------------------------------------------------------------
module frontDoor 'modules/frontdoor.bicep' = {
  scope: centralResourceGroup
  name: 'frontdoor'
  params: {
    profileName: '${resourcePrefix}-fd'
    endpointName: '${resourcePrefix}-${suffix}'
    tags: tags
  }
}

// One Front Door origin per region. This is a RESOURCE-level module loop, so each origin
// can take a regional Container App FQDN (a cross-resource-group deployment output) as a
// scalar — a property-level loop over the same outputs hits an ARM copy-index limitation.
module frontDoorOrigins 'modules/frontdoor-origin.bicep' = [
  for (r, i) in regions: {
    scope: centralResourceGroup
    name: 'frontdoor-origin-${r.short}'
    params: {
      profileName: frontDoor.outputs.profileName
      originGroupName: frontDoor.outputs.originGroupName
      originName: 'origin-${r.short}'
      host: regionDeployments[i].outputs.fqdn
    }
  }
]

// The route is created after all origins exist so the origin group is non-empty.
module frontDoorRoute 'modules/frontdoor-route.bicep' = {
  scope: centralResourceGroup
  name: 'frontdoor-route'
  params: {
    profileName: frontDoor.outputs.profileName
    endpointName: frontDoor.outputs.endpointName
    originGroupName: frontDoor.outputs.originGroupName
  }
  dependsOn: [
    frontDoorOrigins
  ]
}

@description('Public Front Door hostname clients should use.')
output frontDoorHostName string = frontDoor.outputs.endpointHostName

@description('Cosmos DB account endpoint.')
output cosmosEndpoint string = cosmos.outputs.endpoint

@description('Central resource group name.')
output centralResourceGroupName string = centralResourceGroup.name

@description('Per-region resource group names (each holds that region Container App).')
output regionResourceGroupNames array = [for r in regions: '${resourcePrefix}-${r.short}-rg']
