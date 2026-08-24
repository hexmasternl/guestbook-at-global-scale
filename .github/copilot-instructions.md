# Copilot instructions for this repository

## MANDATORY: Consult the HexMaster Coding Guidelines MCP server first
This repository's code must comply with the HexMaster design-guidelines MCP
server (`hexmaster-design-guidelines-*` tools: `list_docs`, `list_docs_by_type`,
`search_docs`, `search_docs_by_tag`, `get_doc`). Treat its ADRs,
recommendations, and structure templates as binding rules, not suggestions.

- **Before creating any plan** (feature plan, refactor plan, new-project
  scaffold, architecture change), call the MCP server to list/search the
  relevant ADRs, designs, recommendations, and structures, and read the full
  text of every document that could govern the change with `get_doc` before
  writing the plan. The plan must explicitly conform to what you find.
- **Before manipulating code** (creating, moving, or editing projects/files),
  re-check the MCP server for any ADR/recommendation/structure relevant to
  the area you're touching (e.g. project layout, CQRS, minimal APIs,
  observability, testing, identity) and make the change compliant with it.
  If a change would violate an ADR, stop and flag the conflict instead of
  proceeding.
- Key documents already known to apply here: ADR 0001 (.NET 10), ADR 0002
  (modular monolith project structure), ADR 0003 (Aspire required for
  ASP.NET web services), ADR 0004 (custom CQRS, no MediatR), ADR 0005
  (Minimal APIs over controllers), ADR 0008 (OpenTelemetry observability),
  ADR 0009 (feature-slices module structure, supersedes ADR 0007), plus the
  `unit-testing-xunit-moq-bogus` recommendation and the
  `feature-slices-module-structure` / `minimal-api-endpoint-organization`
  structure templates. Always re-query the MCP server rather than relying
  solely on this list, as guidance may be added or updated.

## Current state
The repository has moved past pure planning: a .NET 10 solution has been
scaffolded under `src/` (see below), but it is still early/skeleton code
(default templates, no real Guestbook domain logic yet). Build/test with the
standard .NET CLI from the repo root:
- Build: `dotnet build` (or open `Guestbook.slnx`)
- Test: `dotnet test`
There is no frontend build pipeline (the plan calls for a single static
page with no build step).

## Projects in `src/` and how they map to the plans
| Project | Relates to (`storyline/demo-app-plan.md`) | Notes |
|---|---|---|
| `src/HexMaster.Guestbook.Api` | The stateless API container (`POST /greet`, `GET /greetings`, `/health`) deployed per-region behind Front Door | Currently the default ASP.NET Web API template (`/weatherforecast`) — guestbook endpoints not yet implemented. Should follow ADR 0005 (Minimal APIs) and ADR 0004 (CQRS handlers) once built out |
| `src/HexMaster.Guestbook` | Domain/module project — will hold the `greeting` domain model, feature slices, and command/query handlers per ADR 0009 | Currently an empty class library stub |
| `src/HexMaster.Guestbook.Data.CosmosDb` | The Cosmos DB persistence adapter — multi-region writes, session consistency, `greetings` container described in the plan | Currently an empty class library stub; should use managed identity, not connection strings, per the plan's deployment guidance |
| `src/Aspire/HexMaster.Guestbook.Aspire` (`.AppHost`, `.ServiceDefaults`) | Local orchestration of the API + Cosmos DB emulator/dependencies; ServiceDefaults wires OpenTelemetry/health checks per ADR 0003/ADR 0008 | Present per ADR 0003's mandate to adopt Aspire for ASP.NET web services |
| `src/Tests/HexMaster.Guestbook.Tests` | Test coverage for the domain/API/data projects | Currently an empty xUnit stub; should follow the `unit-testing-xunit-moq-bogus` recommendation (xUnit + Moq + Bogus) when populated |

Not yet present in `src/`: a `Core/` project for shared CQRS interfaces
(`ICommandHandler`/`IQueryHandler`), an `.Abstractions` project for DTOs, a
frontend `App/` project for the map/form page, and infra-as-code
(Bicep/Terraform) for Front Door + multi-region Container Apps + Cosmos DB.
When these are added, follow ADR 0002's canonical top-level layout and the
`feature-slices-module-structure` template — consult the MCP server first as
described above.

## What this repo is for
It supports a conference talk, **"When Success Hits the Fan: Going Global in
Azure"** (see `storyline/session-plan.md`), which argues that scaling an app
globally requires progressively addressing: (1) Azure's physical
infrastructure hierarchy, (2) multi-region app hosting/traffic routing, and
(3) multi-region data replication. The demo app to be built
(`storyline/demo-app-plan.md`) is a **global guestbook**: a world map where
visitors submit a short "say hi from —" message that gets geo-tagged and
appears as a pin in near-real-time for everyone, including users in other
regions.

## Planned architecture (from `storyline/demo-app-plan.md`)
Read this file in full before implementing — it is the source of truth for
design decisions. Key points to preserve when building the app:

- **Frontend**: a single static page (map + form), no build pipeline
  required. May be served from the same container as the API, or from a
  Static Web App behind Front Door.
- **API**: one container image deployed identically to Azure Container Apps
  in two (or three) regions (e.g., West Europe + East US). Two endpoints:
  `POST /greet` (write) and `GET /greetings` (read, or SSE/polling for live
  updates). The API **must remain fully stateless** — no in-memory
  session/cache state — since identical copies run in multiple regions
  behind latency-based routing. This statelessness requirement is
  foundational; don't introduce server-local state when adding features.
- **Routing**: Azure Front Door in front of the regional Container Apps,
  latency-based routing, health probes on `/health`.
- **Data**: Azure Cosmos DB (NoSQL API), multi-region writes enabled, one
  write region per Container Apps region, **session** consistency by
  default. Schema is a flat greeting document:
  ```json
  {
    "id": "guid",
    "message": "hi from...",
    "lat": 52.3,
    "lng": 4.9,
    "region": "westeurope",
    "ts": "2026-08-24T10:00:00Z"
  }
  ```
  Conflict resolution is last-writer-wins on `ts` by default, with an
  optional custom merge procedure as a stretch goal.
- **Deployment**: infra as code (Bicep/Terraform) parameterized by region and
  deployed once per region (not duplicated as separate projects); one CI/CD
  pipeline that fans out to both regions; use managed identity from
  Container Apps to Cosmos DB instead of connection strings/secrets.

## Conventions to follow when adding code
- Treat "one template/pipeline, deployed N times" as a hard requirement —
  avoid copy-pasted per-region infra files or app code forks.
- Keep the API stateless; any per-request context must travel with the
  request, not live in server memory.
- Favor identity-based auth (managed identity) over connection
  strings/secrets when wiring Container Apps to Cosmos DB or other Azure
  resources.
- The live demo depends on multi-region writes succeeding independently and
  replicating visibly — don't introduce a single-primary write path, as that
  would undercut the app's purpose.
