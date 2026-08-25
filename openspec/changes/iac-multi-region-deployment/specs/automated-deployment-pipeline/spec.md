## ADDED Requirements

### Requirement: Build and publish the API container image

The deployment pipeline SHALL build the Guestbook API image from `src/HexMaster.Guestbook.Api/Dockerfile`, tag it `global-guestbook/guestbook-api` with a semantic version, and push it to the existing central container registry using the registry credentials. The image SHALL run as a non-root (non-privileged) user. The IP→location dataset is embedded in the application, so no external database, license key, or download is required. The registry password SHALL NOT be printed to logs or committed to source control.

#### Scenario: Image built and pushed with a semantic version tag

- **WHEN** the pipeline runs
- **THEN** a `global-guestbook/guestbook-api` image with a semantic-version tag is built (IP→location data embedded in the app), configured to run as a non-root user, and pushed to the central registry

#### Scenario: Registry password kept secret

- **WHEN** the image is pushed
- **THEN** the registry password is provided from a stored secret and does not appear in workflow logs or the repository

### Requirement: Deploy infrastructure via OIDC-authenticated Bicep deployment

The deployment pipeline SHALL authenticate to Azure using OIDC workload-identity federation (no stored cloud credential secrets) and deploy the Bicep templates — the full topology (Cosmos DB, per-region Container Apps, Front Door, and the Cosmos data-plane role assignment) with the pushed image reference and the central-registry credentials. Region selection SHALL be controlled entirely by the Bicep region list, requiring no per-region edits in the workflow.

#### Scenario: End-to-end deploy from a clean resource group

- **WHEN** the pipeline runs against an empty resource group
- **THEN** it logs in via OIDC, pushes the image to the central registry, and deploys Cosmos DB, the enabled-region Container Apps, and Front Door in one run

#### Scenario: Reconfigure regions without touching the workflow

- **WHEN** an operator toggles a region line in the Bicep region list and re-runs the workflow
- **THEN** the deployment converges to the new region set and the workflow definition itself is unchanged

### Requirement: Manually triggerable deployment

The deployment pipeline SHALL be runnable on demand (manual trigger) so a region set can be reconfigured per conference, in addition to any automatic trigger on changes to infrastructure or application source.

#### Scenario: Operator triggers a reconfiguration run

- **WHEN** an operator manually triggers the workflow after editing the region list
- **THEN** the deployment runs and applies the updated region configuration
