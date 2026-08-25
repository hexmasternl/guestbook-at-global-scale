## Context

The Guestbook API (`src/HexMaster.Guestbook.Api`) is already built to run as an identical, stateless container in multiple Azure regions behind Azure Front Door, all writing to one multi-region Cosmos DB account. The runtime already assumes this shape:

- It reads its own region from `Guestbook:Region` (`ConfigurationGuestbookRegionProvider`, defaulting to `"local"`) and persists it as the Cosmos partition key (`/region`, `CosmosGuestbookEntryRepository`).
- It uses the Aspire Cosmos component (`builder.AddAzureCosmosClient("guestbook-cosmos")`, `Program.cs`) — which authenticates with `DefaultAzureCredential` when handed an account **endpoint** rather than a key.
- It exposes `/health` (via `MapDefaultEndpoints`) for Front Door probes and reads Front Door's `X-Azure-*` client-IP headers (`ClientIpResolver`).
- It ships as a container via `src/HexMaster.Guestbook.Api/Dockerfile`. The IP→location dataset is embedded in the app (`HexMaster.Guestbook/Resources/GeoIp.csv.gz`, gzip-compressed), so the build needs no license key or download step.

What is missing is everything below the application: no Bicep, no `.github/workflows/`, no cloud resources. Aspire's `AppHost` (`src/Aspire/.../AppHost.cs`) exists only for local F5/dev orchestration (Cosmos emulator) — it is **not** the production deployment mechanism (ADR 0003: Aspire for local orchestration; production is IaC per `storyline/demo-app-plan.md`).

Binding constraints from the plan and ADRs: managed identity instead of connection strings; one template deployed across regions (not N hand-maintained copies); Cosmos multi-region writes with **session** consistency; container `entries`, database `guestbook`, partition key `/region`. The conference-specific requirement is that enabling/disabling a region must be a single-line edit.

## Goals / Non-Goals

**Goals:**
- Provision the backend from Bicep: multi-region Cosmos DB, per-region Container Apps, Front Door, and a managed identity for Cosmos access (the container registry is an existing central ACR, not provisioned here).
- One **single source-of-truth region list** where each region is exactly one line; commenting a line removes that region from Container Apps, Cosmos write locations, **and** Front Door origins simultaneously.
- Default-enabled: Australia Central, West US, West Europe. Default-disabled (present but commented): East US, South Africa North, West India.
- Front Door latency-based routing with `/health` probes to the lowest-latency healthy region.
- A GitHub Actions workflow that builds/pushes the image and deploys the infra with no per-region edits of its own.

**Non-Goals:**
- No application/C# code changes; the existing `Dockerfile` is consumed unchanged.
- No custom Cosmos conflict-resolution procedure (last-writer-wins on `ts` is kept; the plan lists custom merge as a stretch "aha", out of scope here).
- No frontend hosting/CDN, no custom domains/TLS certs on Front Door (use the default `*.azurefd.net` endpoint).
- No blue/green or canary strategy; a redeploy replaces the active revision. No autoscale tuning beyond sane defaults.
- No Terraform (Bicep chosen per the plan and repo convention).

## Decisions

### 1. Hosting on Azure Container Apps, one environment + app per region
Each enabled region gets its own Container Apps **environment** and **Container App**, created by looping a `region.bicep` module over the region list. External ingress is enabled (target port 8080) so Front Door can reach each app's FQDN. Alternative considered: a single multi-region service (e.g. App Service with regional slots) — rejected because Container Apps is what the plan/copilot-instructions specify and it gives a clean per-region environment boundary for the demo.

### 2. Single source-of-truth region list as a one-line-per-region Bicep array
`infra/main.bicep` holds:

```bicep
var regions = [
  { name: 'australiacentral', short: 'auc' } // Australia Central
  { name: 'westus',           short: 'wus' } // West US
  { name: 'westeurope',       short: 'weu' } // West Europe
  // { name: 'eastus',           short: 'eus' } // East US
  // { name: 'southafricanorth', short: 'san' } // South Africa North
  // { name: 'westindia',        short: 'win' } // West India
]
```

Commenting a line drops the region from *every* downstream loop. This one `var` is the only place a region is toggled. Bicep permits `//` line comments inside array literals, and array elements need no separators, so a clean single-line comment works. Alternatives considered: (a) a `.bicepparam` param array — rejected because the toggle then lives outside the template and object-array params are noisier to comment; (b) a boolean-per-region flag object — rejected because it's two edits (define + reference) and less visually obvious than commenting the line itself.

The **first** entry is authoritative as Cosmos's primary write region (failover priority 0). At least one region MUST remain uncommented; the template asserts this.

### 3. Cosmos DB: one account, region list drives write locations
A single Cosmos DB (NoSQL) account with `enableMultipleWriteLocations: true`, default consistency `Session`, and a `locations` array projected from `regions` (`failoverPriority` = index, `isZoneRedundant: false` for demo cost). Database `guestbook`, container `entries`, partition key `/region` — matching the running code and `AppHost.cs`. Access is via **managed identity**: a Cosmos SQL role assignment granting the Built-in Data Contributor role to the shared user-assigned identity — no keys, no connection strings on screen. Alternative considered: account keys in Key Vault — rejected per the plan's explicit "managed identity, not connection strings" guidance.

### 4. One shared user-assigned managed identity for all regions
A single user-assigned managed identity is attached to every Container App so that **one** Cosmos data-plane role assignment covers all regions, instead of wiring system-assigned identities per app. The app authenticates to Cosmos via `DefaultAzureCredential`, told which identity to use through the `AZURE_CLIENT_ID` env var. (Image **pull** does not use this identity — see Decision 3a.) Alternative considered: system-assigned identity per app — rejected because it multiplies role assignments by region count and complicates the loop.

### 3a. Container image comes from an existing central ACR, pulled with registry credentials
The image is **not** stored in a registry provisioned by this change. A central Azure Container Registry already exists; its login server, username, and password are supplied via GitHub secrets (`ACR_LOGIN_SERVER`/`ACR_LOGIN_USERNAME`/`ACR_LOGIN_PASSWORD`) and used for both push (workflow) and pull. Each Container App is configured with a `registries` entry (server + username + `passwordSecretRef`) and a Container App secret holding the password; `registryPassword` is a `@secure()` Bicep param so it never appears in deployment outputs. Consequently there is **no ACR resource and no AcrPull role assignment** in the templates. Alternative considered: provisioning a dedicated ACR + managed-identity AcrPull — rejected because the org already runs a central registry and cannot assume role-assignment rights on it.

The image is named `global-guestbook/guestbook-api` (declared in the API `.csproj` via `ContainerRepository`) and runs as a **non-root** user (`ContainerUser=app` / `USER $APP_UID` in the Dockerfile) so it never runs privileged. The tag is a **semantic version** computed in the workflow (`MAJOR.MINOR.<run-number>`).

### 5. Cosmos wiring reuses the existing Aspire component via endpoint-only config
The app already calls `AddAzureCosmosClient("guestbook-cosmos")`. In production the Container App sets `ConnectionStrings__guestbook-cosmos` to the **account endpoint URI** (`https://<acct>.documents.azure.com:443/`, no key) plus `AZURE_CLIENT_ID`; the Aspire component then uses token credentials with the user-assigned identity. This needs zero code change. Each app also sets `Guestbook__Region` to its region `name`. Alternative considered: injecting an account key connection string — rejected (keys) per Decision 3.

### 6. Front Door Standard: one endpoint, one origin group, latency routing, `/health` probes
An `Microsoft.Cdn` (Front Door Standard) profile with a single endpoint and a single origin group. Origins are looped from the **same** region list, each pointing at its Container App ingress FQDN, all equal priority/weight so Front Door serves the lowest-latency healthy origin. Health probes hit `GET /health` (the app's existing endpoint). A single route maps the endpoint to the origin group and forwards HTTPS. The default `<endpoint>.azurefd.net` hostname is used. Optionally the Container Apps can be locked to Front Door via the `X-Azure-FDID` header / origin-group ID, noted as a hardening follow-up, not done here to keep the demo simple. Alternative considered: Traffic Manager (DNS-based) — rejected because Front Door is specified in the plan and gives real latency routing + health at the edge.

Because the region Container Apps live in **other resource groups**, the origins are created by a **resource-level module loop** (`modules/frontdoor-origin.bicep`, one per region) that takes each region's FQDN as a scalar `host`, rather than a property-level `for` inside a single Front Door module. A property-level loop that dereferences a cross-resource-group module loop's `.outputs` compiles but fails at deploy with an ARM `copyIndex` error (the scope's resource-group name is emitted as an unnamed `copyIndex()`, illegal in a property copy). Front Door is therefore three modules: profile+endpoint+origin-group, per-region origin, and the route (deployed after the origins so the group is non-empty).

### 7. GitHub Actions: OIDC login, build/push to central ACR, then full deploy
Ordered steps after `azure/login@v2` via OIDC federation:
1. `az group create` (idempotent).
2. Compute the semantic version tag (`MAJOR.MINOR.<run-number>`).
3. `docker login` to the central ACR with the `ACR_LOGIN_*` secrets, `docker build` against `src/HexMaster.Guestbook.Api/Dockerfile`, tag `global-guestbook/guestbook-api:<semver>`, push.
4. Deploy `infra/main.bicep` passing the ACR credentials + `containerImage`; `main.bicep` deploys Cosmos, per-region Container Apps (which pull with the ACR credentials), and Front Door.

Triggered by `workflow_dispatch` (the primary conference-reconfig path — flip a region line, run the workflow) and by `push` to `main` under `infra/**`/`src/**`. Cloud auth comes from OIDC (`AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID`); stored secrets are the ACR credentials (`ACR_LOGIN_SERVER`/`ACR_LOGIN_USERNAME`/`ACR_LOGIN_PASSWORD`). Alternative considered: a per-region job matrix — rejected because Bicep already fans out over regions, so a matrix would duplicate the source of truth.

### 8. Subscription-scoped deployment that creates its own resource groups
`main.bicep` is `targetScope = 'subscription'` and creates the resource groups as part of the deployment: one **central** RG (`<prefix>-central-rg`, in `centralLocation`) holding Front Door, the shared Cosmos DB account, and the shared managed identity; and **one RG per enabled region** (`<prefix>-<short>-rg`, created in that region) holding the region's Container Apps environment + app. Central resources are deployed via modules scoped to the central RG; each region module is scoped to its own region RG (`scope: regionResourceGroups[i]`). Cross-RG wiring uses module outputs (identity/Cosmos → region apps; region FQDNs → Front Door origins). Globally-unique names (Cosmos, Front Door endpoint) derive from `resourcePrefix` + `uniqueString(subscription().id, resourcePrefix)`. This requires the deployment principal to have **Contributor at the subscription scope** (to create RGs). Alternative considered: a single resource-group-scoped deployment into one pre-created RG — rejected because the requested topology is a dedicated central RG plus an isolated, region-local RG per region.

## Risks / Trade-offs

- **Changing the Cosmos region list is a live data-plane operation** → Adding/removing a Cosmos write region takes minutes and **drops that region's replica's data** when removed. Mitigation: documented as expected demo behavior; reconfigure between conferences, not mid-demo; the primary (first) region is never the one toggled casually.
- **Container Apps public ingress is reachable directly, bypassing Front Door** → Mitigation noted (lock to `X-Azure-FDID`) but deferred; acceptable for a demo where the origins hold no secrets.
- **Container App holds the ACR password as a secret** → Stored as a Container App secret and passed as a `@secure()` Bicep param (never in outputs/logs); acceptable given the org's central-registry credential model. Rotating the ACR password requires a redeploy.
- **Region count changes Front Door origin set and Cosmos failover priorities on every run** → Idempotent; Bicep converges to the current region list. Trade-off: no gradual rollout — a run replaces the topology.
- **Embedded GeoIp dataset adds to assembly size (~14 MB)** → The dataset is gzip-compressed (trimmed to `type,startNum,endNum,CC`, ~14 MB — well under GitHub's 100 MB file limit), compiled into the `HexMaster.Guestbook` DLL, and decompressed + parsed once at startup (~1s). Accepted trade-off for a fully self-contained image with no license key, download, or runtime file dependency.
- **Quota/region availability** → Not all subscriptions can create Container Apps or Cosmos in all six regions (esp. West India, South Africa North). Mitigation: those three ship disabled; enabling one may require a quota request, called out in tasks.
- **Cost of always-on multi-region infra** → Mitigation: minimal Container Apps scale (min replicas 0–1), non-zone-redundant Cosmos, Front Door Standard tier; tear down the RG after a conference.

## Migration Plan

1. One-time: create the Azure AD app registration with a GitHub OIDC federated credential and grant it Owner/Contributor + User Access Administrator (for role assignments) on the target subscription/RG; set GitHub secrets.
2. Run the workflow via `workflow_dispatch` → provisions everything in the default-3 regions.
3. To reconfigure: uncomment/comment region line(s) in `infra/main.bicep`, commit, re-run the workflow.
4. Rollback: re-run with the previous region list / previous image tag (semantic-version tags, e.g. `1.0.41`); or `az group delete` to tear down entirely.

## Open Questions

- Target Azure subscription and whether West India / South Africa North / East US have Container Apps + Cosmos quota available for this subscription (may need a quota request before enabling).
- Preferred `resourcePrefix` and resource group name for the deployment.
- Whether to lock Container Apps ingress to Front Door (`X-Azure-FDID`) now or leave open for the demo.
