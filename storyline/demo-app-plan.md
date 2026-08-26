# Guestbook demo app — plan & architecture
### Supporting demo for "When Success Hits the Fan: Going Global in Azure"

## Concept

A single page: a world map, a text box ("say hi from —"), a submit button. On submit, the client's approximate location + message gets written to Cosmos DB and appears as a pin, in near-real-time, for everyone watching — including other regions.

It's small enough to build and explain in a few minutes, but it exercises every layer of the talk: routing, statelessness, and — the important part — multi-region data writes and conflict resolution, which a todo app or counter never forces you to confront.

---

## Architecture overview

```
                         ┌────────────┐
                         │   Client   │
                         │ browser /  │
                         │  mobile    │
                         └─────┬──────┘
                               │
                               v
                    ┌─────────────────────┐
                    │  Azure Front Door   │
                    │ Latency routing,    │
                    │ health probes       │
                    └──────────┬──────────┘
                     ┌─────────┴─────────┐
                     v                   v
        ┌─────────────────────┐ ┌─────────────────────┐
        │ Region: West Europe │ │  Region: East US     │
        │ ┌─────────────────┐ │ │ ┌─────────────────┐  │
        │ │  Guestbook API  │ │ │ │  Guestbook API  │  │
        │ │ Container App,  │ │ │ │ Container App,  │  │
        │ │   stateless     │ │ │ │   stateless     │  │
        │ └────────┬────────┘ │ │ └────────┬────────┘  │
        └──────────┼──────────┘ └──────────┼───────────┘
                    │                       │
                    v                       v
        ┌───────────────────────────────────────────────┐
        │           Cosmos DB account                    │
        │        Multi-region writes enabled              │
        │  ┌─────────────────────┐ ┌─────────────────────┐│
        │  │ Europe write region │◄►│  US write region    ││
        │  │ Session consistency │ │ Session consistency  ││
        │  └─────────────────────┘ └─────────────────────┘│
        └───────────────────────────────────────────────┘
```

Client traffic hits Azure Front Door, which routes by latency to a Container App in either West Europe or East US. Both regional instances write to the same multi-region Cosmos DB account — one write region per Azure region — which replicate to each other.

---

## Components

### Frontend
One static HTML/JS page (or a small React app): a map (Leaflet, or plain SVG dots) plus a form. Served from the same Container App as the API, or from a Static Web App behind Front Door if you want to demo a static/dynamic split. No build pipeline complexity needed for a demo.

### API — Azure Container Apps, two (or three) regions
- One container image, deployed identically to a Container App in each region (e.g., West Europe + East US; add Southeast Asia for a third pin if you want the multi-write moment to look more dramatic).
- Two endpoints: `POST /greet` (write) and `GET /greetings` (read — or better, Server-Sent Events / simple polling so the map updates live).
- Fully stateless — every request carries what it needs, nothing cached in memory — which is what makes it safe to run identical copies in multiple regions and let Front Door pick any of them.

### Routing — Azure Front Door
- One Front Door profile, two origins (the two regional Container Apps), latency-based routing, health probes on `/health`.
- Live demo hook: open the app from two different network locations (VPN, or a geographically spread room) and show requests landing on different regions.

### Data — Azure Cosmos DB, multi-region writes
- One Cosmos DB account (NoSQL API), multi-region write enabled, with write regions matching the Container Apps regions.
- Container `greetings`, partition key `/id` (or `/region` to show off partition-aligned writes). Minimal schema:

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

- `lat`/`lng` are nullable: a visitor may decline to share their location, and the server's
  IP-based approximation can come up empty. Both `null` means "location unknown" — no
  substitute coordinate is invented (see `src/HexMaster.Guestbook.Api/README.md`).
- Consistency level: **session** as the default — easy to explain, and a good excuse to mention it's a dial, not a fixed setting.
- Conflict resolution: last-writer-wins on `ts` by default. For a stronger "aha" moment, swap in a **custom conflict resolution procedure** — e.g. merge instead of overwrite when two greetings collide at the same instant from different regions.

---

## The live demo moment (worth designing on purpose)

Two browser tabs (or two people), genuinely or artificially located in different regions, submitting a greeting within the same second:

1. Both writes succeed immediately — no waiting on a single primary. This is the thing a single-primary SQL setup couldn't do without a cross-region round trip.
2. Both pins appear on both regions' views shortly after — replication in action.
3. If you rig a genuine collision (same `id`, two regions writing near-simultaneously), show conflict resolution kicking in.

---

## Deployment shape

- **Infra as code**: a Bicep (or Terraform) module parameterized by region, deployed twice (or via a loop) — a clean visual for "this is one template deployed twice, not two separate projects."
- **CI/CD**: one pipeline, one build, fan-out deploy to both Container Apps regions, plus a single Cosmos DB deployment with the two write regions added as a property rather than a separate resource.
- **Config/secrets**: identical across regions — Cosmos connection info from a shared Key Vault, or better, Container Apps' built-in managed identity to Cosmos, so there are no connection strings on screen.

---

## How the app maps to the talk's three chapters

| Chapter | What the app shows |
|---|---|
| 1 — Datacenter foundations | Optional bonus beat: zone-redundant Container Apps environment |
| 2 — Hosting & traffic | Front Door routing the same click to different regions based on latency |
| 3 — Data patterns | The same app swapped between a single-primary Cosmos config and multi-region writes — the audience sees the difference, not just hears about it |
