## ADDED Requirements

### Requirement: Single source-of-truth region list

The infrastructure SHALL derive every regional resource from one region list defined in a single place, where each candidate region is represented by exactly one line. Enabling or disabling a region SHALL require editing only that one line (commenting/uncommenting it). The list SHALL include Australia Central, West US, East US, West Europe, South Africa North, and West India as candidate regions. Australia Central, West US, and West Europe SHALL be enabled by default; East US, South Africa North, and West India SHALL be present but disabled by default. At least one region MUST remain enabled, and the deployment SHALL fail fast if none are.

#### Scenario: Region enabled by uncommenting one line

- **WHEN** an operator uncomments the single line for East US in the region list and redeploys
- **THEN** a Container App, a Cosmos DB write location, and a Front Door origin are provisioned for East US, and no other region's line is edited

#### Scenario: Region disabled by commenting one line

- **WHEN** an operator comments the single line for West US in the region list and redeploys
- **THEN** the West US Container App, its Cosmos DB write location, and its Front Door origin are removed, and all other enabled regions are unaffected

#### Scenario: Empty region list is rejected

- **WHEN** every region line is commented out
- **THEN** the deployment fails with a clear error rather than provisioning zero regions

### Requirement: Subscription-scoped deployment that creates resource groups

The deployment SHALL be subscription-scoped and SHALL create the resource groups it uses. It SHALL create one central resource group holding Front Door, the shared Cosmos DB account, and the shared managed identity, and one resource group per enabled region — created in that region — holding that region's Container Apps resources. Disabling a region SHALL remove that region's resource group and its contents.

#### Scenario: Central and per-region resource groups created

- **WHEN** the deployment completes with three regions enabled
- **THEN** one central resource group (containing Front Door, Cosmos DB, and the managed identity) and three region resource groups (each in its own Azure region, each containing that region's Container Apps environment and app) exist

#### Scenario: Disabling a region removes its resource group

- **WHEN** a region is disabled and the deployment is re-run
- **THEN** that region's resource group and the resources in it are no longer part of the deployment

### Requirement: Per-region stateless compute

The infrastructure SHALL provision, for each enabled region, an Azure Container Apps environment and a Container App running the Guestbook API image in that region's resource group, with external ingress enabled so Front Door can route to it. Each Container App SHALL be configured with its own region name via `Guestbook__Region` and with the Cosmos DB account endpoint, and SHALL expose the `/health` endpoint.

#### Scenario: One app per enabled region

- **WHEN** the deployment completes with three regions enabled
- **THEN** exactly three Container Apps environments and three Container Apps exist, each in its own region-specific resource group and Azure region, each reachable over HTTPS ingress

#### Scenario: Region-specific configuration

- **WHEN** a Container App in West Europe starts
- **THEN** its `Guestbook__Region` value is the West Europe region name and greetings it writes are partitioned under that region

### Requirement: Multi-region Cosmos DB with managed-identity access

The infrastructure SHALL provision a single Cosmos DB (NoSQL) account with multi-region writes enabled and default consistency level Session, whose write locations match the enabled region list with the first-listed region as primary. It SHALL create database `guestbook` and container `entries` with partition key `/region`. Application access SHALL use a managed identity granted the Cosmos data-plane data-contributor role; no account keys or connection strings SHALL be used for application authentication.

#### Scenario: Write locations track the region list

- **WHEN** the region list has Australia Central (first), West US, and West Europe enabled
- **THEN** the Cosmos account has those three write locations with Australia Central at failover priority 0, multiple write locations enabled, and Session consistency

#### Scenario: Keyless application access

- **WHEN** a regional Container App connects to Cosmos DB
- **THEN** it authenticates with its managed identity via the account endpoint, and no account key or key-based connection string is present in the app configuration

#### Scenario: Fixed data topology

- **WHEN** the account is provisioned
- **THEN** database `guestbook` and container `entries` exist with partition key `/region`

### Requirement: Container image from an existing central registry

The infrastructure SHALL pull the Guestbook API image from an existing central container registry (not provisioned by this change), using registry credentials (login server, username, password) supplied as secrets. The password SHALL be held as a Container App secret and passed as a secure parameter so it never appears in deployment outputs or logs. No new container registry and no registry role assignment SHALL be created.

#### Scenario: Image pulled with registry credentials

- **WHEN** a Container App is created referencing an image in the central registry
- **THEN** it authenticates to the registry with the configured username/password (password via a Container App secret) and pulls the image, with no registry resource or role assignment created by the deployment

#### Scenario: Registry password not exposed

- **WHEN** the deployment completes
- **THEN** the registry password is not present in deployment outputs or logs
