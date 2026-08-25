// ============================================================================
//  Guestbook — multi-region backend (Container Apps + Cosmos DB + Front Door)
// ============================================================================
//
//  SINGLE SOURCE OF TRUTH FOR REGIONS  👇
//
//  To enable/disable a region for a conference, comment or uncomment its ONE line
//  below. That single edit adds/removes the region's Container App, its Cosmos DB
//  write location, AND its Front Door origin — everywhere at once.
//
//  The FIRST uncommented region is the Cosmos DB primary write region.
//  At least one region must stay uncommented — @minLength(1) fails the deployment
//  early (with a clear "array too short" error) if every line is commented out.
//
@minLength(1)
param regions array = [
  { name: 'australiacentral', short: 'auc' } // Australia Central
  { name: 'westus', short: 'wus' } // West US
  { name: 'westeurope', short: 'weu' } // West Europe
  // { name: 'eastus',           short: 'eus' } // East US
  // { name: 'southafricanorth', short: 'san' } // South Africa North
  // { name: 'westindia',        short: 'win' } // West India
]
// ============================================================================

targetScope = 'resourceGroup'

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

@description('Location for global/primary resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Tags applied to all resources.')
param tags object = {
  workload: 'guestbook'
  managedBy: 'bicep'
}

// Short, deterministic suffix for globally-unique names (Cosmos/Front Door).
var suffix = uniqueString(resourceGroup().id)

// ---------------------------------------------------------------------------
// Shared user-assigned managed identity (Cosmos data-plane auth).
// The container image is pulled from the central ACR with registry credentials
// (below), not this identity — so no AcrPull role assignment is needed.
// ---------------------------------------------------------------------------
module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    location: location
    identityName: '${resourcePrefix}-id'
    tags: tags
  }
}

// ---------------------------------------------------------------------------
// Cosmos DB — multi-region writes, Session consistency, keyless access.
// ---------------------------------------------------------------------------
module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: {
    accountName: toLower('${resourcePrefix}-cosmos-${suffix}')
    regions: regions
    principalId: identity.outputs.principalId
    tags: tags
  }
}

// ---------------------------------------------------------------------------
// One Container Apps environment + app per enabled region.
// ---------------------------------------------------------------------------
module regionDeployments 'modules/region.bicep' = [for r in regions: {
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
}]

// ---------------------------------------------------------------------------
// Front Door — latency routing across all enabled regional origins.
// ---------------------------------------------------------------------------
module frontDoor 'modules/frontdoor.bicep' = {
  name: 'frontdoor'
  params: {
    profileName: '${resourcePrefix}-fd'
    endpointName: '${resourcePrefix}-${suffix}'
    origins: [for (r, i) in regions: {
      name: r.short
      host: regionDeployments[i].outputs.fqdn
    }]
    tags: tags
  }
}

@description('Public Front Door hostname clients should use.')
output frontDoorHostName string = frontDoor.outputs.endpointHostName

@description('Cosmos DB account endpoint.')
output cosmosEndpoint string = cosmos.outputs.endpoint

@description('Per-region Container App FQDNs (origins behind Front Door).')
output regionFqdns array = [for (r, i) in regions: {
  region: r.name
  fqdn: regionDeployments[i].outputs.fqdn
}]
