## Why

The Guestbook API is designed to run as identical, stateless copies in multiple Azure regions behind Azure Front Door, writing to a single multi-region Cosmos DB account (`storyline/demo-app-plan.md`). None of that infrastructure exists yet, and there is no way to deploy it. For the "Going Global in Azure" talk, the demo also needs to be reconfigured per conference — turning regions on and off should be a trivial, low-risk edit, not a rewrite of the deployment.

## What Changes

- Add Bicep Infrastructure as Code (under a new top-level `infra/` folder) that provisions the backend: a multi-region Cosmos DB account (multi-region writes, session consistency, `/region` partition), one Azure Container Apps environment + app per enabled region, an Azure Front Door profile, and managed-identity-based (keyless) access to Cosmos (no connection strings, per the plan and ADRs). The container image lives in an existing central ACR (not provisioned here) and is pulled with registry credentials from GitHub Secrets.
- Drive everything from a **single source-of-truth region list** where each of the six regions (Australia Central, West US, East US, West Europe, South Africa North, West India) is one line. Commenting/uncommenting that one line enables/disables the region **everywhere at once** — Container Apps, Cosmos DB write locations, and Front Door origins. Australia Central, West US, and West Europe are enabled by default; the other three ship commented out.
- Configure Azure Front Door with one endpoint and one origin group using **latency-based routing** and `/health` probes, so each client is served from the lowest-latency healthy region.
- Add a **GitHub Actions workflow** that builds and pushes the API container image (via the existing `src/HexMaster.Guestbook.Api/Dockerfile`) and deploys the Bicep template via OIDC-federated Azure login. Because region fan-out lives in Bicep, the workflow itself needs no per-region changes.
- Wire per-region app configuration (`Guestbook:Region`, Cosmos endpoint) so each regional instance reports and partitions by its own Azure region name.

## Capabilities

### New Capabilities
- `multi-region-infrastructure`: Bicep IaC provisioning the multi-region Cosmos DB account and per-region Azure Container Apps (pulling from an existing central ACR), all driven by one toggleable region list with managed-identity access to Cosmos.
- `latency-based-traffic-routing`: An Azure Front Door profile that routes each client to the nearest healthy regional origin via latency-based routing with `/health` probes, and stays consistent with the enabled-region list.
- `automated-deployment-pipeline`: A GitHub Actions workflow that builds/pushes the API image and deploys the infrastructure to Azure, with region selection controlled entirely from the Bicep region list.

### Modified Capabilities
<!-- None: no existing spec-level behavior of the application changes; this is additive deployment/infra. -->

## Impact

- **New files**: `infra/**` (Bicep modules + parameters), `.github/workflows/*.yml` (deploy workflow). No application C# source changes are required by this change; `src/HexMaster.Guestbook.Api/Dockerfile` is consumed as-is.
- **Deployment scope & resource groups**: the deployment is **subscription-scoped** and creates the resource groups itself — 1 central RG (`<prefix>-central-rg`) plus 1 RG per enabled region (`<prefix>-<short>-rg`, in that region). Requires Contributor at the subscription scope.
- **New Azure resources**: in the central RG — 1 Cosmos DB account (NoSQL, multi-region writes, session consistency, DB `guestbook` / container `entries` / PK `/region`), 1 Front Door Standard/Premium profile (endpoint, origin group, route), and a user-assigned managed identity + one Cosmos DB data-plane role assignment; in each region RG — a Container Apps environment + Container App. The container registry is an existing central ACR (not created here).
- **New dependencies / prerequisites**: an Azure subscription with an OIDC-federated app registration (GitHub → Azure) and GitHub secrets for `AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID` plus the central-ACR credentials (`ACR_LOGIN_SERVER`/`ACR_LOGIN_USERNAME`/`ACR_LOGIN_PASSWORD`). No new NuGet/npm dependencies.
- **Config surface**: each Container App gets `Guestbook__Region` (its Azure region), the Cosmos account endpoint, and managed-identity auth; the GeoIP database stays baked into the image at its existing default path.
- **Demo operability**: enabling/disabling a region is a one-line edit re-run through the same workflow; removing a Cosmos write region drops that region's replica (acceptable for the demo).
