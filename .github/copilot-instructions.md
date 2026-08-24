# Copilot instructions for this repository

## Current state
This repository is **pre-implementation**: it currently contains only planning
documents (`storyline/demo-app-plan.md`, `storyline/session-plan.md`) and no
application code, build tooling, or tests yet. There is no build/test/lint
command to run because no project has been scaffolded. When code is added,
update this file with the actual commands (e.g., `npm test`, `dotnet test`,
how to run a single test) and remove this notice.

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
