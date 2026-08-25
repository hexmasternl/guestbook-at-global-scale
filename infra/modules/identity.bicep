// One user-assigned managed identity shared by every regional Container App.
// Using a single identity means one Cosmos data-plane role assignment covers all
// regions (see design.md Decision 4). Image pull uses central-ACR credentials, not
// this identity, so there is no AcrPull assignment.

@description('Location for the managed identity.')
param location string = resourceGroup().location

@description('Name of the user-assigned managed identity.')
param identityName string

@description('Tags applied to the identity.')
param tags object = {}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: tags
}

output identityId string = identity.id
output principalId string = identity.properties.principalId
output clientId string = identity.properties.clientId
