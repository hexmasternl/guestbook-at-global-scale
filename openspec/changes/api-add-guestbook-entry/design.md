## Context

`HexMaster.Guestbook.Api` currently only exposes the default template `/weatherforecast` endpoint. `HexMaster.Guestbook` (domain module) and `HexMaster.Guestbook.Data.CosmosDb` (persistence adapter) are empty class-library stubs. There is no `Abstractions` project yet, and the Aspire AppHost (`HexMaster.Guestbook.Aspire.AppHost`) only registers the API project — no Cosmos DB resource exists.

This change introduces the first real feature slice: submitting a guestbook greeting. It must comply with:
- ADR 0002 (modular monolith project layout) — introduces the missing `Abstractions` project.
- ADR 0004 (custom CQRS, no MediatR) and ADR 0009 (feature-slices module structure) — `Features/CreateGuestbookEntry/` with a command + handler.
- ADR 0005 (Minimal APIs) — thin `POST /greet` endpoint delegating to the handler.
- ADR 0003 (Aspire required) — Cosmos DB must be modeled and referenced through Aspire, using **only** the Aspire client libraries (`Aspire.Hosting.Azure.CosmosDB` in the AppHost, `Aspire.Microsoft.Azure.Cosmos` in the data project) per the user's explicit instruction and https://aspire.dev/integrations/databases/efcore/azure-cosmos-db/azure-cosmos-db-host/.
- `unit-testing-xunit-moq-bogus` recommendation for the handler tests.
- The demo-app-plan's stateless API and managed-identity (no connection strings) requirements.

## Goals / Non-Goals

**Goals:**
- Define the `GuestbookEntry` domain model and its stored schema (`id`, `message`, `lat`, `lng`, `region`, `ts`) matching `storyline/demo-app-plan.md`.
- Implement `POST /greet` end-to-end: request → command → domain validation → Cosmos DB write → response DTO.
- Model the Cosmos DB account/database/container in the Aspire AppHost, running as the local emulator for dev/F5, so `dotnet run` on the AppHost works without a live Azure subscription.
- Use the Aspire **client integration** (`AddAzureCosmosClient` + `CosmosClient`) rather than hand-rolling `Microsoft.Azure.Cosmos` SDK setup, per the explicit constraint in this change's request.
- Keep the API fully stateless — the repository is a scoped/singleton Cosmos client wrapper with no in-memory greeting cache.

**Non-Goals:**
- `GET /greetings` (read endpoint) — separate future change.
- Multi-region write configuration, session consistency tuning, or conflict-resolution procedures on the live Azure Cosmos DB account — that's infra-as-code / deployment concern, out of scope for this API-level change.
- Front Door, Container Apps, or any deployed infrastructure (Bicep/Terraform) — local Aspire orchestration only.
- Authentication/authorization or `SubjectId` → `UserId` resolution (ADR 0010) — the guestbook is anonymous; no user identity exists in this feature yet.
- EF Core (`Aspire.Microsoft.EntityFrameworkCore.Cosmos`) — the user specified the Cosmos DB **host**/client integration, not EF Core, and the flat greeting-document schema doesn't need an ORM.

## Decisions

### 1. Use the Aspire Cosmos DB client integration, not EF Core or the raw SDK
`Aspire.Microsoft.Azure.Cosmos` registers a `CosmosClient` via DI with automatic health checks and OpenTelemetry. The repository resolves `CosmosClient` and calls `GetDatabase("guestbook").GetContainer("entries")` directly. Alternative considered: `Aspire.Microsoft.EntityFrameworkCore.Cosmos` — rejected because the schema is a single flat document with no relational/EF benefit, and the user explicitly pointed to the CosmosClient hosting/client integration link.

### 2. Model account → database → container in the AppHost
```csharp
var cosmos = builder.AddAzureCosmosDB("guestbook-cosmos")
    .RunAsEmulator(emulator => emulator.WithDataVolume());
var db = cosmos.AddCosmosDatabase("guestbook", databaseName: "guestbook");
var entries = db.AddContainer("entries", "/region");

builder.AddProject<Projects.HexMaster_Guestbook_Api>("hexmaster-guestbook-api")
    .WithReference(cosmos);
```
Partition key is `/region` (not `/id`) — this anticipates the plan's multi-region write model (one write region per Azure region) and keeps entries from the same region co-located, matching the demo-app-plan's mention of partition-aligned writes. The API project references the **account** resource (`cosmos`), not the database/container resource, so `AddAzureCosmosClient("guestbook-cosmos")` in the API resolves a `CosmosClient` scoped to the whole account; the repository targets `guestbook`/`entries` by name. Alternative considered: referencing the container resource directly for a narrower connection string — rejected because the client integration's `AddAzureCosmosClient` binds at the account level, and the API may need other containers later.

### 3. No connection strings in app config
`RunAsEmulator` is used for local dev only. When deployed (future change), `AddAzureCosmosDB` defaults to Entra ID/managed-identity role-based access (no access key), consistent with the demo-app-plan's "Container Apps' built-in managed identity to Cosmos" requirement. No `WithAccessKeyAuthentication()` call is added.

### 4. Domain model owns validation; endpoint does shallow checks only
`GuestbookEntry.Create(message, lat, lng, region)` enforces invariants (non-empty message within a max length, lat/lng within valid ranges). The endpoint/command only checks for missing required fields (shallow, per ADR 0005) — business rules live in the domain factory method per ADR 0007/pragmatic-DDD guidance.

### 5. `Region` and `Ts` are server-assigned, not client input
`CreateGuestbookEntryRequest` carries only `Message`, `Lat`, `Lng`. `Region` comes from an `IGuestbookRegionProvider` service (initially reading a configured `Region` app setting, e.g. `westeurope`), and `Ts` is `DateTimeOffset.UtcNow` set in the handler. This prevents a client from spoofing which region "wrote" the entry — necessary for the live demo's region-attribution story.

### 6. New `HexMaster.Guestbook.Abstractions` project
Introduced now (didn't exist yet) to hold `CreateGuestbookEntryRequest` and `GuestbookEntryDto` under `DataTransferObjects/`, per ADR 0009. Added to `Guestbook.slnx` and referenced by both `HexMaster.Guestbook.Api` and `HexMaster.Guestbook`.

## Risks / Trade-offs

- [Emulator-only local testing may hide real Azure Cosmos DB RU/latency behavior] → Acceptable for this change; multi-region behavior is validated in a later infra change against a real account.
- [Partition key choice (`/region`) could create hot partitions if one region dominates traffic] → Matches the plan's explicit call-out of partition-aligned writes; revisit if a different key is needed once `GET /greetings` query patterns are known.
- [`CosmosClient` DI registration means a missing/misconfigured Cosmos resource fails API startup health checks] → Desired behavior: Aspire's client integration wires this into `/health`, so the container won't be marked ready until Cosmos is reachable, aligning with Front Door health-probe expectations in the plan.
- [Server-assigned `Region` requires configuration per deployed instance] → Acceptable single new app setting (`Guestbook:Region`), to be set per Container Apps region in the future deployment change.

## Migration Plan

Purely additive: new endpoint, new project, new AppHost resource. No existing data or contracts change. Rollback is reverting the commit; no destructive operations occur (the `entries` container is newly created, nothing to migrate back).

## Open Questions

- None blocking implementation. Final partition key strategy may be revisited once `GET /greetings` (future change) query patterns are defined.
