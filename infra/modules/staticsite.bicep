// CENTRAL: storage account that hosts the Angular frontend as an Azure Storage
// static website. The account is provisioned here; static website hosting itself
// (the `$web` container + index/error documents) is a data-plane setting enabled
// by the deploy workflow after this account exists, which then uploads the build.

@description('Location for the storage account.')
param location string = resourceGroup().location

@description('Globally-unique storage account name (3-24 lowercase alphanumerics).')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('Tags applied to the storage account.')
param tags object = {}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    // Static website serving requires anonymous blob read on the `$web` container.
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
  tags: tags
}

output storageAccountName string = storage.name
output primaryWebEndpoint string = storage.properties.primaryEndpoints.web
