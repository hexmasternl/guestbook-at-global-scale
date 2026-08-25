using 'main.bicep'

// Region enable/disable lives in main.bicep (the `regions` array), NOT here — that
// keeps the toggle to a single line of code per region. These parameters are the
// deployment knobs the pipeline fills in.

param resourcePrefix = 'guestbook'

// Central ACR credentials + the image to deploy are supplied by the pipeline from
// GitHub Secrets (ACR_LOGIN_SERVER / ACR_LOGIN_USERNAME / ACR_LOGIN_PASSWORD). The
// image tag is the semantic version produced by the workflow.
param registryLoginServer = readEnvironmentVariable('ACR_LOGIN_SERVER', 'myregistry.azurecr.io')
param registryUsername = readEnvironmentVariable('ACR_LOGIN_USERNAME', '')
param registryPassword = readEnvironmentVariable('ACR_LOGIN_PASSWORD', '')
param containerImage = readEnvironmentVariable('CONTAINER_IMAGE', 'myregistry.azurecr.io/global-guestbook/guestbook-api:1.0.0')
