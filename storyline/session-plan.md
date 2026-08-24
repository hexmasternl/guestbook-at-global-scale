# When Success Hits the Fan: Going Global in Azure
### Conference session plan

**Format suggestion:** 45–60 min talk (adjust chapter timing proportionally). Level: intermediate/advanced — audience already knows the basics of Azure App Service, SQL Database, etc.

**Core narrative:** You built something in one region. It worked. Then it got popular — in another country, another continent — and the assumptions baked into your architecture started to crack. This talk is the story of un-baking those assumptions: understanding the infrastructure you're standing on, spreading your compute, and finally spreading your data (the hard part).

---

## Opening (5 min) — Set up "the fan"

Don't open with theory — open with the failure mode everyone in the room recognizes.

- Cold open: a fictional (or your own) app's growth story. Local launch → happy users → a tweet/App Store feature/press mention goes global → latency complaints from Sydney, Singapore, São Paulo start rolling in.
- Show a real or simulated latency map: users in Europe hitting a single US-based App Service. Concretely show the round-trip cost (e.g., ~150–250ms extra just from geography, before app logic even runs).
- State the three symptoms of "success hitting the fan": **latency** (far users), **availability** (single point of regional failure), **compliance** (data residency demands once you have EU/international customers).
- Promise: by the end, they'll know how to answer "what happens when this datacenter goes away" and "what happens when our users are on the other side of the planet" — for compute *and* data.
- One-slide roadmap of the three chapters, framed as the story's progression: **Know your foundation → Spread your app → Spread your data.**

---

## Chapter 1 — How Azure's global infrastructure actually works (10–12 min)

Goal: give the audience the mental model and vocabulary they'll need for chapters 2 and 3. Keep it visual — a zoomed-out world map that progressively zooms in to a single datacenter.

1. **The hierarchy, top to bottom**
   - Geography → Region → Availability Zone → Datacenter. Define each precisely (a geography is a compliance/data-residency boundary containing multiple regions; a region is one or more datacenters networked with low-latency links; an Availability Zone is a physically separate datacenter or set of datacenters within a region with its own power, cooling, and networking).
   - Visual: nested-boxes diagram (Geography > Region > AZ > Datacenter).

2. **Availability Zones — protecting against datacenter failure, not regional failure**
   - What an AZ actually buys you: surviving a power outage, cooling failure, or fire in one building — not a regional-scale event (earthquake, widescale network failure).
   - Which Azure resources are "zone redundant" out of the box (App Service Premium v3, Azure SQL zone-redundant configuration, zone-redundant Storage) vs. things you must explicitly configure.
   - Live/slide demo: deploying an App Service Plan or SQL Database with zone redundancy toggled on — show it's often a checkbox, not an architecture change.

3. **Region pairs — the twin location concept, and why it's changing**
   - Explain the classic model: Microsoft pairs many regions (e.g., West US ↔ East US) for staggered platform updates and, for some services, geo-replication.
   - Important nuance to include (this will make you look current, not textbook): **not every region has a pair anymore.** Many newer Azure regions are unpaired and rely on Availability Zones as their primary resilience mechanism instead of a twin region. Frame this as "the pairing model was v1 of Azure's resilience story — AZs are v2."
   - Practical takeaway: don't assume a pair exists — check per-region, and don't assume a *service* uses pairing for DR just because the region has a pair. Some services do, many don't, and you often have to design cross-region replication yourself.

4. **Datacenter-in-practice: what this means for your Azure bill and design decisions**
   - Latency inside a region (single-digit ms) vs. across regions (tens to hundreds of ms) vs. across continents.
   - Set up the "so what": chapter 1 was about the map. Chapters 2 and 3 are about how you actually live on that map.

**Chapter close-out line:** "Now you know the neighborhood. Let's talk about putting your house in more than one of them."

---

## Chapter 2 — Hosting your app across regions & controlling traffic (12–15 min)

Goal: move from "one region" to "many regions, and the client always lands close to home."

1. **Why multi-region hosting, restated as two separate problems**
   - Problem A: **latency** — get the user to the nearest healthy instance.
   - Problem B: **availability** — if a region goes down, traffic should land somewhere healthy without the user noticing.
   - Emphasize these are related but not identical problems — some tools solve one, some solve both.

2. **The building block: deploying the same app to multiple regions**
   - Multiple App Service instances / Container Apps / AKS clusters in different regions, deployed via the same pipeline (mention deployment slots + multi-region release pipelines briefly — this is a good spot for a "yes, your CI/CD also needs to think globally" aside).
   - Statelessness as a prerequisite: you can't traffic-route across regions if your app has server-local session/cache state. This is a natural bridge into chapter 3.

3. **Traffic distribution options — compare, don't just list**
   - **Azure Traffic Manager** (DNS-based): routing methods — performance (latency-based), geographic, weighted, priority (active/passive). Explain the DNS caveat: it's DNS-level, so failover isn't instant (TTL-bound), and it doesn't inspect Layer 7 traffic.
   - **Azure Front Door** (global HTTP/S layer, anycast): latency-based + priority + weighted routing, health probes, path-based routing, integrated WAF/CDN. Explain why this is usually the modern default over Traffic Manager for HTTP(S) workloads — faster failover, actual request-level routing, TLS termination at the edge.
   - **Azure Load Balancer / Application Gateway** — clarify these are *regional*, not global — important so the audience doesn't confuse layers. Good moment for a simple diagram: Front Door (global) → Application Gateway/Load Balancer (regional) → App instances.
   - Quick comparison table on a slide: Traffic Manager vs. Front Door vs. regional Load Balancer/App Gateway — scope, protocol, failover speed, typical use case.

4. **Geo-routing the client, concretely**
   - Live/slide demo: a Front Door profile with two backend regions, latency-based routing, and a simulated client from two geographies (or a "show, don't tell" using a VPN/traceroute) hitting different backends.
   - Talk about health probes and what "unhealthy" triggers a failover, and realistic failover timing expectations — set audience expectations correctly (this is not always sub-second).

5. **The compliance angle, briefly**
   - Geographic routing isn't just performance — mention data-residency-driven routing (e.g., EU traffic must be served/processed by EU infrastructure), foreshadowing chapter 3.

**Chapter close-out line:** "Your app can now run anywhere. But it's still asking the same database on the other side of the planet for every answer. Let's fix that."

---

## Chapter 3 — Globally distributing your data (15–18 min, the meaty finale)

Goal: this is the hardest and most valuable part of the talk — spend the most time here and be honest about trade-offs (CAP theorem territory, but keep it practical, not academic).

1. **Frame the core tension up front**
   - One slide: consistency vs. latency vs. availability — you can optimize for two, not all three, across regions. This primes every option that follows as "which trade-off am I choosing."

2. **Pattern 1 — Single primary database, read replicas near users**
   - Azure SQL Database / Azure Database for PostgreSQL geo-replication: one writable primary, readable secondaries in other regions.
   - Good for: read-heavy global apps (docs, catalogs, dashboards). Writes still go home to the primary — call out the latency cost for writes from far-away users explicitly.
   - Failover groups: automatic vs. manual failover, and what actually happens to your connection strings/app config during a failover (a great "gotcha" moment for the audience).

3. **Pattern 2 — Database per region (data partitioned by geography)**
   - Each region owns its own data (e.g., EU customers' data lives and stays in EU database).
   - Good for: data residency/compliance requirements, and workloads where cross-region users rarely need each other's data.
   - The catch: cross-region queries/reporting become genuinely hard — you need an aggregation strategy (ETL into a central reporting store, or federated queries) if you ever need a global view.

4. **Pattern 3 — Globally distributed, multi-write database (Cosmos DB)**
   - Azure Cosmos DB as the "designed for this" option: multi-region writes, tunable consistency levels (strong, bounded staleness, session, consistent prefix, eventual) — spend real time on this slide since it's the crux of the trade-off conversation.
   - Conflict resolution strategies when multiple regions write concurrently (last-write-wins, custom merge procedures).
   - Good for: apps that genuinely need low-latency writes from everywhere (collaborative apps, IoT, gaming, global e-commerce carts).

5. **Pattern 4 — Cache in front of everything**
   - Azure Cache for Redis (geo-replicated) or CDN-level caching for read-mostly data, as the "cheap win" before reaching for multi-write databases.
   - Good moment to say: "Before you reach for Cosmos DB's multi-write complexity, ask whether a well-placed cache solves 80% of your latency problem for 20% of the complexity."

6. **Decision framework (the payoff slide)**
   - A simple flowchart/decision tree the audience can screenshot: *Do writes need to be low-latency from multiple regions? → Does data need to stay in-region for compliance? → Is the workload read-heavy?* → routes to one of the four patterns above.
   - This is the slide people photograph — make it dense but legible.

**Chapter close-out line:** "You now have an app that lives everywhere, and data that behaves — whether that means one true copy, many true copies, or copies that agree to disagree politely."

---

## Closing (5 min)

- Recap the story arc in one slide: **datacenter → app → data**, each layer building on the last.
- One "if you remember nothing else" takeaway per chapter (3 bullets total).
- A realistic caution: going global adds cost and operational complexity — encourage the audience to only take on the region(s) their actual user base justifies, not to globalize preemptively. This lands well as a talk-closer because it's honest, not just a feature tour.
- Call to action: link to a sample repo/architecture diagram if you build one, and a slide with region-pair/AZ documentation links for follow-up.
- Q&A.

---

## Suggested demo ideas (pick 2–3, don't try all of them live)

- Toggling zone redundancy on an App Service Plan / SQL Database in the portal.
- A Front Door profile routing between two live regional backends, shown from two simulated client locations.
- A Cosmos DB account with multi-region writes enabled, showing the consistency-level dropdown and a quick conflict-resolution example.
- A "what does my connection string do during a SQL failover group failover" walkthrough — very concrete and audience loves gotcha moments like this.

## Timing summary (45 min version)

| Section | Minutes |
|---|---|
| Opening / the fan | 5 |
| Ch. 1 — Datacenter foundations | 10 |
| Ch. 2 — App hosting & traffic | 12 |
| Ch. 3 — Data patterns | 15 |
| Closing / Q&A | 3–5 |
