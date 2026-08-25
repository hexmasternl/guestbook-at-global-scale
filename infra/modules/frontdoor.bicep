// Azure Front Door (Standard): the profile, one endpoint, and one origin group.
// Origins (one per region) and the route are created by separate modules
// (frontdoor-origin.bicep / frontdoor-route.bicep) so that origin host names can be
// sourced from cross-resource-group region deployments via a resource-level module
// loop (a property-level loop cannot dereference a cross-scope module loop's outputs).

@description('Front Door profile name.')
param profileName string

@description('Front Door endpoint name (becomes <name>-<hash>.azurefd.net).')
param endpointName string

@description('Origin group name.')
param originGroupName string = 'guestbook-origins'

@description('Tags applied to the Front Door profile.')
param tags object = {}

resource profile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: profileName
  location: 'global'
  tags: tags
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: profile
  name: endpointName
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: profile
  name: originGroupName
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 30
    }
  }
}

output profileName string = profile.name
output endpointName string = endpoint.name
output originGroupName string = originGroup.name
output endpointHostName string = endpoint.properties.hostName
