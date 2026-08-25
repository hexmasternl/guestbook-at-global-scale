// CENTRAL: Azure Static Web App that hosts the Angular frontend.
//
// Content is NOT deployed by this template — Static Web Apps has its own content
// deployment channel. The deploy workflow fetches the app's deployment token
// (`az staticwebapp secrets list`) and uploads the built Angular output through
// the Azure/static-web-apps-deploy action.
//
// No `repositoryUrl`/`branch` is set on purpose: that would put the app in
// GitHub-integrated mode, where Azure writes its own workflow file into the repo.
// Leaving it unset keeps the app in manual-deployment mode, driven by our workflow.

@description('Location for the Static Web App. Static Web Apps is only available in a subset of regions (westus2, centralus, eastus2, westeurope, eastasia).')
@allowed([
  'westus2'
  'centralus'
  'eastus2'
  'westeurope'
  'eastasia'
])
param location string = 'westeurope'

@description('Name of the Static Web App.')
@minLength(2)
@maxLength(60)
param staticWebAppName string

@description('Tags applied to the Static Web App.')
param tags object = {}

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // Lets staticwebapp.config.json (shipped in the build output) drive routing,
    // so the Angular SPA fallback is configured with the app, not the template.
    allowConfigFileUpdates: true
    // Free tier has no staging environments; disabling keeps PR builds from failing.
    stagingEnvironmentPolicy: 'Disabled'
  }
}

output staticWebAppName string = staticWebApp.name
output defaultHostName string = staticWebApp.properties.defaultHostname
