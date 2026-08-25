// Azure Front Door (Standard) with one endpoint and one origin group fronting every
// enabled regional Container App. All origins share equal priority/weight, so Front
// Door serves the lowest-latency healthy origin (latency-based routing) and fails over
// via /health probes.

@description('Front Door profile name.')
param profileName string

@description('Front Door endpoint name (becomes <name>-<hash>.azurefd.net).')
param endpointName string

@description('Origins to front. Shape: [{ name, host }] where host is the Container App ingress FQDN.')
param origins array

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
  name: 'guestbook-origins'
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

resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = [for o in origins: {
  parent: originGroup
  name: 'origin-${o.name}'
  properties: {
    hostName: o.host
    originHostHeader: o.host
    httpPort: 80
    httpsPort: 443
    // Equal priority + weight across origins => latency-based selection among healthy origins.
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}]

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'guestbook-route'
  dependsOn: [
    origin // ensure all origins exist before the route references the group
  ]
  properties: {
    originGroup: {
      id: originGroup.id
    }
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
}

output endpointHostName string = endpoint.properties.hostName
