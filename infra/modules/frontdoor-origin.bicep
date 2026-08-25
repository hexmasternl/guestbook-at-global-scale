// A single Front Door origin, added to an existing profile/origin group.
// Deployed once per region from a resource-level module loop in main.bicep so that the
// origin host (a cross-resource-group region deployment output) can be passed in as a
// scalar — avoiding the property-loop / cross-scope-output ARM copy limitation.

@description('Existing Front Door profile name.')
param profileName string

@description('Existing origin group name within the profile.')
param originGroupName string

@description('Origin resource name (unique within the origin group).')
param originName string

@description('Origin host name — the regional Container App ingress FQDN.')
param host string

resource profile 'Microsoft.Cdn/profiles@2023-05-01' existing = {
  name: profileName
}

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' existing = {
  parent: profile
  name: originGroupName
}

resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: originGroup
  name: originName
  properties: {
    hostName: host
    originHostHeader: host
    httpPort: 80
    httpsPort: 443
    // Equal priority + weight across origins => latency-based selection among healthy origins.
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}
