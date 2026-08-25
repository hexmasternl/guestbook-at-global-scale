## 1. Infra scaffolding & region list

- [x] 1.1 Create the `infra/` folder with `main.bicep`, `main.bicepparam`, and a `modules/` subfolder
- [x] 1.2 In `main.bicep`, define the single source-of-truth `regions` array — one `{ name, short }` object per line — with Australia Central, West US, West Europe uncommented and East US, South Africa North, West India present but commented (`//`)
- [x] 1.3 Add params: `resourcePrefix`, `containerImage`, and derive globally-unique names via `uniqueString(resourceGroup().id)`; add an `assert`/`if`-guard that fails when `regions` is empty
- [x] 1.4 Add a short `infra/README.md` documenting the one-line region toggle and required GitHub secrets

## 2. Container registry (existing central ACR — not provisioned)

- [x] 2.1 ~~Provision an ACR module~~ **Removed**: use the existing central ACR via GitHub secrets `ACR_LOGIN_SERVER`/`ACR_LOGIN_USERNAME`/`ACR_LOGIN_PASSWORD` for both push and pull
- [x] 2.2 Wire `main.bicep`/`region.bicep` to accept `registryLoginServer`/`registryUsername`/`registryPassword` (secure) and pull with a Container App registry secret

## 3. Identity & Cosmos DB modules

- [x] 3.1 Create `modules/identity.bicep` provisioning one user-assigned managed identity; output its principal ID, client ID, and resource ID
- [x] 3.2 ~~Assign the AcrPull role~~ **Removed**: pull uses central-ACR credentials, so no AcrPull role assignment is needed (identity is used only for Cosmos)
- [x] 3.3 Create `modules/cosmos.bicep`: NoSQL account with `enableMultipleWriteLocations: true`, Session consistency, `locations` projected from `regions` (first = failover priority 0)
- [x] 3.4 Add database `guestbook` and container `entries` with partition key `/region` in `cosmos.bicep`
- [x] 3.5 Add a Cosmos SQL role assignment granting the Built-in Data Contributor role to the managed identity; output the account endpoint

## 4. Per-region Container Apps module

- [x] 4.1 Create `modules/region.bicep` taking a region name, short code, image, registry, managed identity, and Cosmos endpoint
- [x] 4.2 In `region.bicep`, provision a Container Apps environment and a Container App with external ingress (target port 8080) and the user-assigned identity attached
- [x] 4.3 Set app env vars: `Guestbook__Region` = region name, `ConnectionStrings__guestbook-cosmos` = Cosmos endpoint URI, `AZURE_CLIENT_ID` = managed identity client ID; configure registry pull via central-ACR username/password (Container App secret)
- [x] 4.4 Output the Container App ingress FQDN from `region.bicep`
- [x] 4.5 In `main.bicep`, loop `region.bicep` over the `regions` array

## 5. Front Door module

- [x] 5.1 Create `modules/frontdoor.bicep` provisioning a Front Door (Standard) profile, one endpoint, and one origin group with a `GET /health` health probe
- [x] 5.2 Loop origins over the enabled region FQDNs (from the region-module outputs), equal priority/weight for latency-based routing
- [x] 5.3 Add a route mapping the endpoint to the origin group over HTTPS; output the Front Door endpoint hostname
- [x] 5.4 Wire `frontdoor.bicep` into `main.bicep` consuming the per-region FQDN outputs

## 6. GitHub Actions deployment workflow

- [x] 6.1 Create `.github/workflows/deploy-backend.yml` with `workflow_dispatch` and `push` (paths `infra/**`, `src/**`) triggers and `id-token: write` permission
- [x] 6.2 Add `azure/login@v2` OIDC step using `AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID` secrets; `az group create` (idempotent)
- [x] 6.3 Compute a semantic-version tag (`MAJOR.MINOR.<run-number>`) inside the workflow
- [x] 6.4 `docker login` to the central ACR with `ACR_LOGIN_*` secrets, then `docker build` against `src/HexMaster.Guestbook.Api/Dockerfile`, tag `global-guestbook/guestbook-api:<semver>`, and push
- [x] 6.5 Deploy `main.bicep` passing `registryLoginServer`/`registryUsername`/`registryPassword` + `containerImage`; output the Front Door hostname to the job summary

## 6b. Container hardening & naming (C# project)

- [x] 6b.1 Declare container metadata in `HexMaster.Guestbook.Api.csproj`: `ContainerRepository=global-guestbook/guestbook-api`, `ContainerUser=app`
- [x] 6b.2 Add `USER $APP_UID` to the Dockerfile so the container runs non-root (non-privileged)

> **Live-deploy tasks (2.2, 7.2–7.4) require running against your Azure subscription** —
> they provision real, cost-incurring resources and are left for you to run via the
> workflow (with OIDC + `ACR_LOGIN_*` secrets configured). All templates and the
> workflow are authored and compile/lint clean.

## 7. Validation & verification

- [x] 7.1 `az bicep build`/`bicep lint` on all templates with no errors (✓ all green); `az deployment group what-if` for a dry run — _pending: needs a live subscription_
- [ ] 7.2 Run the workflow end-to-end against the target subscription and confirm three Container Apps, a 3-write-region Cosmos account, and one Front Door endpoint exist
- [ ] 7.3 Verify `GET https://<frontdoor-endpoint>/health` returns healthy and a `POST /greet` write succeeds and reads back via `GET /greetings`
- [ ] 7.4 Toggle one region line (e.g. enable East US), re-run the workflow, and confirm the region is added to Container Apps, Cosmos write locations, and Front Door origins
- [x] 7.5 Document the one-time OIDC app-registration + secret setup and any region quota caveats (West India, South Africa North, East US) in `infra/README.md`
