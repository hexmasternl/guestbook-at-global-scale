// The Front Door route binding the endpoint to the origin group. Deployed after all
// origins exist (via a dependsOn in main.bicep) so the origin group is non-empty when
// the route references it.

@description('Existing Front Door profile name.')
param profileName string

@description('Existing Front Door endpoint name within the profile.')
param endpointName string

@description('Existing origin group name within the profile.')
param originGroupName string

resource profile 'Microsoft.Cdn/profiles@2023-05-01' existing = {
  name: profileName
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' existing = {
  parent: profile
  name: endpointName
}

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' existing = {
  parent: profile
  name: originGroupName
}

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'guestbook-route'
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
