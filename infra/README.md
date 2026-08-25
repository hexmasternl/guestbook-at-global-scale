# Guestbook backend infrastructure

Bicep Infrastructure as Code that deploys the Guestbook API as identical, stateless
[Azure Container Apps](https://learn.microsoft.com/azure/container-apps/) in multiple
regions, fronted by [Azure Front Door](https://learn.microsoft.com/azure/frontdoor/)
(latency routing) and backed by one multi-region-write
[Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/) account.

```
Client → Front Door (latency routing, /health probes)
             ├─→ Container App (region A) ─┐
             ├─→ Container App (region B) ─┼─→ Cosmos DB (multi-region writes, Session)
             └─→ Container App (region C) ─┘
```

The container image is pulled from an **existing central Azure Container Registry** (not
provisioned here) using registry credentials stored in GitHub Secrets.

## Enable / disable a region — the one-line toggle

Region selection is the **single source of truth** at the top of
[`main.bicep`](./main.bicep), in the `regions` array. Each candidate region is **one
line**. Comment it out to disable, uncomment to enable:

```bicep
param regions array = [
  { name: 'australiacentral', short: 'auc' } // Australia Central   ← enabled
  { name: 'westus', short: 'wus' } // West US                       ← enabled
  { name: 'westeurope', short: 'weu' } // West Europe               ← enabled
  // { name: 'eastus',           short: 'eus' } // East US          ← disabled
  // { name: 'southafricanorth', short: 'san' } // South Africa North
  // { name: 'westindia',        short: 'win' } // West India
]
```

That one edit adds/removes the region's **Container App**, its **Cosmos DB write
location**, and its **Front Door origin** — all at once. Rules:

- The **first** uncommented region is the Cosmos DB **primary** write region.
- At least one region must stay enabled — `@minLength(1)` fails the deployment early otherwise.
- Defaults: **Australia Central, West US, West Europe** enabled; **East US, South Africa
  North, West India** present but commented.

After editing, re-run the deployment workflow (below).

## Files

| File | Purpose |
|---|---|
| `main.bicep` | Orchestrator + the `regions` source of truth; wires identity, Cosmos, per-region apps, Front Door |
| `main.bicepparam` | Deployment knobs for manual/local runs |
| `modules/identity.bicep` | Shared user-assigned managed identity (Cosmos data-plane auth) |
| `modules/cosmos.bicep` | Multi-region Cosmos DB + keyless data-plane role assignment |
| `modules/region.bicep` | One Container Apps environment + app per region |
| `modules/frontdoor.bicep` | Front Door profile, origin group, origins, route |

## Container image

- Built from [`src/HexMaster.Guestbook.Api/Dockerfile`](../src/HexMaster.Guestbook.Api/Dockerfile).
- Named **`global-guestbook/guestbook-api`** (also declared in the API `.csproj` via
  `ContainerRepository`).
- Runs as a **non-root** user (`USER $APP_UID` / `ContainerUser=app`) — never under a
  privileged account.
- Tag is a **semantic version** produced by the workflow (`MAJOR.MINOR.<run-number>`,
  e.g. `1.0.42`). Bump `VERSION_MAJOR_MINOR` in the workflow for major/minor changes.
- Pushed to and pulled from the existing central ACR using the `ACR_LOGIN_*` secrets.

## Deploy

Deployment runs from [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml)
— trigger it manually (**Run workflow**) or push a change under `infra/**` / `src/**`.
The workflow: logs in via OIDC → computes the semantic version → builds & pushes the
image to the central ACR → deploys the full topology → prints the Front Door endpoint to
the run summary.

### One-time setup

1. **App registration + OIDC federation** — create an Entra app registration, add a GitHub
   federated credential for this repo, and grant it **Contributor** on the target
   subscription (or resource group `guestbook-rg`). Contributor can create the Cosmos DB
   data-plane role assignment; no Azure RBAC role assignments are created by this
   deployment, so `User Access Administrator` is not required.
2. **GitHub secrets** (repo → Settings → Secrets and variables → Actions):

   | Secret | Value |
   |---|---|
   | `AZURE_CLIENT_ID` | App registration (client) ID |
   | `AZURE_TENANT_ID` | Entra tenant ID |
   | `AZURE_SUBSCRIPTION_ID` | Target subscription ID |
   | `ACR_LOGIN_SERVER` | Central ACR login server (e.g. `myregistry.azurecr.io`) |
   | `ACR_LOGIN_USERNAME` | Central ACR username (used to push and pull) |
   | `ACR_LOGIN_PASSWORD` | Central ACR password |
   | `MAXMIND_LICENSE_KEY` | MaxMind license key ([free account](https://www.maxmind.com/en/geolite2/signup)); baked into the image, never logged or committed |

3. Adjust `RESOURCE_GROUP` / `LOCATION` / `RESOURCE_PREFIX` / `VERSION_MAJOR_MINOR` in the
   workflow `env:` if desired.

### Manual / local deploy

```bash
az group create -n guestbook-rg -l westeurope
# Build + push the image to the central ACR (from repo root):
echo "$ACR_LOGIN_PASSWORD" | docker login "$ACR_LOGIN_SERVER" -u "$ACR_LOGIN_USERNAME" --password-stdin
docker build --build-arg MAXMIND_LICENSE_KEY=<key> \
  -f src/HexMaster.Guestbook.Api/Dockerfile \
  -t "$ACR_LOGIN_SERVER/global-guestbook/guestbook-api:1.0.0" .
docker push "$ACR_LOGIN_SERVER/global-guestbook/guestbook-api:1.0.0"
# Deploy:
az deployment group create -g guestbook-rg -f infra/main.bicep \
  -p registryLoginServer="$ACR_LOGIN_SERVER" registryUsername="$ACR_LOGIN_USERNAME" \
     registryPassword="$ACR_LOGIN_PASSWORD" \
     containerImage="$ACR_LOGIN_SERVER/global-guestbook/guestbook-api:1.0.0"
```

## Region quota caveats

Not every subscription can create Container Apps and Cosmos DB in every region. **West
India**, **South Africa North**, and **East US** ship disabled partly for this reason —
before enabling one, confirm the subscription has Container Apps + Cosmos DB availability
and quota there (request a quota increase in the portal if needed). West Europe, West US,
and Australia Central are broadly available.

> Changing the Cosmos region list is a live data-plane operation: adding a write region
> takes a few minutes, and **removing** one drops that region's replica. Reconfigure
> between conferences, not mid-demo.
