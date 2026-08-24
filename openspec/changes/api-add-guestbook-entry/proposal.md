## Why

The Guestbook API currently only exposes the default ASP.NET template endpoint (`/weatherforecast`). The demo needs its first real capability: letting a visitor submit a "say hi from —" greeting so it can be geo-tagged, persisted, and later shown as a pin on the map. This is the write side (`POST /greet`) described in `storyline/demo-app-plan.md` and is the foundation every later capability (multi-region reads, live map updates, conflict resolution) builds on.

## What Changes

- Add a `POST /greet` Minimal API endpoint on `HexMaster.Guestbook.Api` that accepts a greeting submission (message, latitude, longitude) and returns the created guestbook entry.
- Add a `GuestbookEntry` domain model and a `CreateGuestbookEntry` feature slice (command + handler) in `HexMaster.Guestbook`, following ADR 0009 feature-slices structure.
- Add `CreateGuestbookEntryRequest` / `GuestbookEntryDto` records in `HexMaster.Guestbook.Abstractions.DataTransferObjects` (new `Abstractions` project, not yet present in `src/`).
- Add an `IGuestbookEntryRepository` port (module project) and its Cosmos DB implementation in `HexMaster.Guestbook.Data.CosmosDb`, using the Aspire Azure Cosmos DB **client** integration only (`Aspire.Microsoft.Azure.Cosmos`, `AddAzureCosmosClient`) — no raw `Microsoft.Azure.Cosmos` SDK wiring outside what Aspire provides.
- Wire an Azure Cosmos DB account/database/`entries` container in the Aspire AppHost (`Aspire.Hosting.Azure.CosmosDB`), running as the local emulator for `dotnet run`/F5, with the API referencing it via `WithReference`.
- Set the `Region` field on each entry from server-side configuration (not client input), matching the plan's stored schema (`id`, `message`, `lat`, `lng`, `region`, `ts`).
- Add unit tests for the command handler and shallow request validation (xUnit + Moq + Bogus), per the `unit-testing-xunit-moq-bogus` recommendation.
- **BREAKING**: none — this is a net-new endpoint; no existing contract changes.

## Capabilities

### New Capabilities
- `guestbook-entry-submission`: Accepting, validating, and persisting a new guestbook greeting (message + geo-coordinates) via `POST /greet`, stored in Cosmos DB with a server-assigned id, region, and timestamp.

### Modified Capabilities
(none — no existing specs in `openspec/specs/`)

## Impact

- **Affected projects**: `HexMaster.Guestbook.Api` (new endpoint, Program.cs wiring), `HexMaster.Guestbook` (domain model, feature slice, module registration), `HexMaster.Guestbook.Data.CosmosDb` (repository implementation), `src/Aspire/HexMaster.Guestbook.Aspire/HexMaster.Guestbook.Aspire.AppHost` (Cosmos DB resource wiring), `src/Tests/HexMaster.Guestbook.Tests` (handler tests).
- **New project**: `HexMaster.Guestbook.Abstractions` (DTOs), added to `Guestbook.slnx`, per ADR 0009 module layout.
- **New dependencies**: `Aspire.Hosting.Azure.CosmosDB` (AppHost project), `Aspire.Microsoft.Azure.Cosmos` (Data.CosmosDb project) — both official Aspire integrations, no direct `Microsoft.Azure.Cosmos` SDK package added outside of what the Aspire client integration brings transitively.
- **No infra-as-code changes** in this change — Bicep/Terraform for the deployed multi-region Cosmos DB account is out of scope; only local Aspire orchestration (emulator) is covered. Production provisioning is a future change.
- **API stays stateless**: no server-local session/cache state is introduced.
