## Context

The `frontend/guestbook/` Angular app (v22, zoneless, signals-first, standalone components — see `AGENTS.md`/`CLAUDE.md`) has exactly one route today:

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing').then((m) => m.Landing) },
];
```

`GuestbookApi` currently wraps only the write path, and lives inside the `add-guestbook-entry/` feature folder alongside `guestbook-entry.models.ts`. The backend read endpoint already exists and is the hard constraint this design is built around:

```
GET /greetings?pageSize={10..250}&continuationToken={opaque}
Response: 200 OK, ListGuestbookEntriesResponse {
            entries: GuestbookEntryDto[],   // { id, message, lat, lng, region, handledByRegion, ts }, ordered ts DESC
            continuationToken: string | null // null on the last page
          }
          400 ValidationProblem when pageSize is non-numeric or <= 0
```

Two properties of that contract shape everything below:

1. **Pagination is forward-only.** Cosmos DB continuation tokens let you fetch *the next* page from a given position and nothing else. There is no offset, no total count (deliberately, per the API's design — a `COUNT` query is expensive and gets worse as the dataset grows), and therefore no page count and no jump-to-page.
2. **There is no place name in the payload.** `GuestbookEntryDto` carries `lat`/`lng` only. Any human-readable origin location has to be derived, and the honest word for the result is "approximately."

The DTO also carries **two distinct region values**, and the difference matters for this page. `region` is the Cosmos DB partition the entry lives in and may be repartitioned; `handledByRegion` is the Azure region of the backend instance that actually served the create request — as its own doc comment puts it, "what proves which datacenter served a given greeting." They start out holding the same value but are deliberately separate. The requested "data center region that handled the request" is therefore `handledByRegion`, and that is what the card displays; `region` is an internal storage detail and is not shown.

Constraints in force:
- ADR 0006 (centralized styling variables) — new component SCSS consumes `_variables.scss` tokens; no hardcoded colors/spacing/fonts.
- Repo Angular conventions (`AGENTS.md`/`CLAUDE.md`) — standalone components, signals for state, `computed()` for derived state, `inject()`, Angular Material for UI components, lazy-loaded feature routes, no explicit `standalone: true`/`OnPush`.
- Accessibility — WCAG AA and AXE-clean: a list whose contents change under pagination needs the change announced, and focus must not be lost when the page swaps.
- Mobile-first and responsive, as requested: layout starts at a phone width and widens.
- The API is stateless and multi-region; the frontend holds pagination state itself and never asks the server to remember a position.

Note: the repo's `copilot-instructions.md` mandates consulting the HexMaster design-guidelines MCP server before planning. That server is **not connected in this session**, so the binding guidance used here is what the repo already records — ADR 0006 for styling tokens, the Angular conventions in `AGENTS.md`/`CLAUDE.md`, and the frontend precedents set by the `app-frontend-add-guestbook-entry` change. Re-check the MCP server before implementing, and reconcile if it says otherwise.

**Assumptions taken on the requester's behalf.** Three decisions were put to the requester and left unanswered; they are recorded here as chosen defaults rather than as open questions, and each is cheap to reverse before implementation: offline country lookup for the origin location (decision 4), Next/Previous pagination (decision 3), and friendly Azure region names (decision 5).

## Goals / Non-Goals

**Goals:**
- Give a visitor a `/list` route showing persisted greetings newest-first, as an appealing, modern, mobile-first, responsive card list.
- Show, per entry: the message, the approximate origin location, the Azure data-center region that handled the request, and when it was posted.
- Let a visitor page forward and backward through entries using the API's continuation tokens, without pretending to offer capabilities (page numbers, totals) the backend cannot support.
- Give the list page a back control returning to the landing page, and turn the landing page's secondary CTA into the entry point for the list.
- Handle loading, empty, and error states explicitly — a demo that shows a blank box when a region hiccups is worse than one that says what happened.
- Keep the list accessible under pagination: announced page changes, managed focus, keyboard-operable controls.

**Non-Goals:**
- The interactive world map with pins — still a later change; this is a list, not a map.
- Live/real-time updates (SSE, polling, websockets) as new entries arrive. The list reflects the moment it was fetched, plus an explicit refresh.
- Filtering, searching, or sorting other than the API's fixed newest-first order.
- Per-entry detail routes or deep links to an individual greeting.
- City-level or street-level location accuracy — country-level is the ceiling here by design (decision 4).
- Encoding pagination position in the URL (`/list?token=...`) — see decision 3's rejected alternative.
- Any backend, infra, or CORS change. `GET /greetings` and the existing SWA fallback are consumed exactly as-is.

## Decisions

### 1. A lazily-loaded `/list` route with a top-level `features/guestbook-list/` folder

The route is added to `app.routes.ts` as `{ path: 'list', loadComponent: () => import('./features/guestbook-list/guestbook-list').then((m) => m.GuestbookList) }`, matching the existing lazy-loading style and `AGENTS.md`'s "implement lazy loading for feature routes." The component folder sits at `features/guestbook-list/` — a sibling of `features/landing/`, not a child of it, because the list is its own destination reachable by URL rather than a piece of the landing page's UI (which is the reasoning that put `add-guestbook-entry/` *inside* `features/landing/`, and it does not apply here).

A wildcard/`**` fallback route is deliberately not added: no unknown-route handling exists today, and inventing a 404 page is scope creep. `public/staticwebapp.config.json` already rewrites unmatched paths to `/index.html`, so deep-linking `/list` works on Azure Static Web Apps with no infra edit.

Alternative considered: an eagerly-imported route — rejected; the list page is not on the landing page's critical path, and the app already lazy-loads its only route.

### 2. `GuestbookApi` and the entry models move to a shared `core/guestbook/` location

`GuestbookApi` and `guestbook-entry.models.ts` currently live under `features/landing/add-guestbook-entry/`. With a second, unrelated feature consuming them, a cross-feature import (`../../landing/add-guestbook-entry/guestbook-api`) would encode a dependency that does not conceptually exist. They move to `src/app/core/guestbook/` (`guestbook-api.ts`, `guestbook-entry.models.ts`), and `AddGuestbookEntry` plus its specs update their import paths. The service keeps its `@Service()`/root-provided shape and gains one method:

```ts
listEntries(options?: { pageSize?: number; continuationToken?: string }):
  Observable<ListGuestbookEntriesResponse>
```

building query params only for values actually supplied, so an absent `pageSize` lets the API apply its own default rather than the frontend hardcoding a duplicate of it.

Alternative considered: leaving the service where it is and importing across features — rejected as the kind of import that quietly becomes load-bearing. Alternative considered: a second, list-specific service — rejected; one API surface, one client service, per "design services around a single responsibility" where the responsibility is *the guestbook API*.

### 3. Next/Previous over a client-side token stack; no page numbers, no URL state

The component holds:

```ts
private readonly tokenStack = signal<(string | undefined)[]>([undefined]); // one entry per visited page
protected readonly pageNumber = computed(() => this.tokenStack().length);
private nextToken: string | null = null;   // from the latest response
```

"Next" pushes the current response's `continuationToken` and fetches with it; "Previous" pops and re-fetches with the token now on top. Previous therefore re-requests a page rather than replaying a cache — one extra round trip, but it means a visitor stepping back sees current data instead of a stale snapshot, and it keeps only tokens (a few hundred bytes) in memory rather than every entry fetched during the session. "Next" is disabled when the latest response's `continuationToken` is `null`; "Previous" is disabled on the first page. A "Page N" indicator is shown, but deliberately without "of M" — the API cannot supply M.

Fetching happens in a single `loadPage(token)` method that owns the `status` transitions, so Next, Previous, retry, and the initial load all share one code path.

**A non-null token does not promise more entries.** Verified against the running API: with exactly 10 stored entries and `pageSize=10`, page one comes back with a non-null `continuationToken`, and following it yields an empty page. Cosmos hands back a token whenever a query *might* have more results, not only when it does. So "Next is enabled" cannot be read as "there is a next page with content", and an empty response is not proof the guestbook is empty — it depends on which page you are on. The empty state is therefore split in two (see decision 7).

Alternative considered: infinite "Load more" appending to one growing list — simpler and a natural fit for continuation tokens, but the request explicitly asked for pagination, and a growing list makes it harder to point an audience at a specific greeting mid-demo. Alternative considered: numbered pages — impossible without a total count; faking it by pre-walking every page would mean N requests just to render a pager. Alternative considered: putting the continuation token in the URL as a query param so pages are linkable and survive a reload — rejected: the tokens are opaque, long, and Cosmos-implementation-specific, they would leak an internal detail into a user-visible URL, and a token pasted later may no longer be valid. `/list` always opens at page one.

### 4. Approximate origin location resolved offline, shown next to the real coordinates

A `country-lookup.ts` module in `features/guestbook-list/` holds a static table of ~250 countries — ISO code, display name, centroid `lat`/`lng`, and a bounding box — and exposes a pure `resolveApproximateCountry(lat, lng): string | undefined`. Resolution filters to countries whose bounding box contains the point, then picks the nearest centroid by squared-degree distance among those candidates, falling back to nearest centroid overall when no box matches (mid-ocean points, `(0,0)` sentinels). Being a pure function over a static table, it is trivially unit-testable and adds no I/O.

The card shows the country name **and** the formatted coordinates (`~ Netherlands · 52.3° N, 4.9° E`). This is the crux of the decision: country-level nearest-centroid is genuinely coarse and will occasionally be wrong near borders — a point in Basel can resolve to France or Germany rather than Switzerland — so the precise value the API actually returned stays on screen next to the approximation instead of being replaced by it. The label is worded as approximate rather than stated as fact.

This meshes with the backend's `lookup-location-based-on-client-ip` change specifically: when the API resolves a location from a client IP it stores the *country centroid*, so for those entries this lookup is the exact inverse of the table that produced them and returns the right country by construction.

Alternative considered: browser reverse-geocoding via a public service (Nominatim, BigDataCloud) — gives city-level labels, but adds a per-entry network round trip, third-party rate limits, a CORS dependency, and a new failure mode on stage during a live conference demo. Rejected. Alternative considered: simplified country border polygons with real point-in-polygon — accurate and still offline, but 200 KB–1 MB gzipped on a page whose sibling route already loads three.js. Rejected as disproportionate to a country-level label. Alternative considered: coordinates only, no name — honest and free, but "52.3° N, 4.9° E" tells a conference audience nothing at a glance. Alternative considered: resolving the country server-side at write time and adding it to `GuestbookEntryDto` — the cleanest long-term answer and worth doing eventually, but a backend + DTO + persistence-shape change, outside a frontend change's scope.

### 5. Azure region slugs mapped to friendly names, raw slug preserved on hover

A small `region-names.ts` map (`westeurope` → "West Europe", `eastus` → "East US", `swedencentral` → "Sweden Central", and the other regions the Bicep templates deploy to) with a fallback returning the raw slug unchanged for anything unmapped, so a newly-added region degrades to something truthful rather than blank or wrong. `local` — the value `ConfigurationGuestbookRegionProvider` falls back to when `Guestbook:Region` is unset — is mapped too, since it is a value our own code produces and will be what a developer sees. The raw slug goes in a `title` attribute on the element. This matters for the talk: "West Europe" reads from the back of a room, and the region badge is the single most important thing on the card for the demo's argument, so it gets visual prominence.

The badge renders `handledByRegion`, not `region` — see the Context note on why those differ.

Alternative considered: raw slugs only — nothing to maintain, but `swedencentral` is a worse thing to project on a screen than "Sweden Central". Alternative considered: fetching region display names from an Azure API — a network dependency and an ARM permission for what is a static naming table.

### 6. Card grid: mobile-first single column, CSS Grid `auto-fit` widening on larger viewports

The list is a semantic `<ul>`/`<li>` (it is a list; screen readers should hear a list with a count) laid out with CSS Grid: one column by default, `repeat(auto-fit, minmax(<min-card-width>, 1fr))` above a token-driven breakpoint. Each card is a small presentational `GuestbookEntryCard` component taking `entry = input.required<GuestbookEntryDto>()`, keeping the page component focused on fetching and pagination while the card owns presentation. Styling comes from `_variables.scss` tokens; the existing glass-surface tokens (`$color-surface-glass`, `$color-surface-glass-border`) and radii give the cards continuity with the landing page's visual language without new tokens. Any genuinely new token (a card min-width, a region-badge color) is added to `_variables.scss` rather than inlined, per ADR 0006.

Timestamps render as a relative string ("2 hours ago") inside a `<time datetime="...">` element carrying the full ISO value, so the human-friendly form does not destroy the precise one. Relative formatting uses `Intl.RelativeTimeFormat`, built into the platform — no date library. Per `CLAUDE.md`, "do not assume globals like `new Date()` are available" in templates, so the formatting happens in TypeScript, not in the template.

Alternative considered: `MatCard`/`MatList` — Angular Material is the house component library and was considered first, but these cards are a bespoke visual treatment (brand gradient, region badge) and Material's card styling would mostly be overridden. Material is still used where it earns its keep: `MatButtonModule` for the pagination and back controls, `MatProgressSpinnerModule` for the loading state, matching the existing dialog's usage.

### 7. Explicit `status` signal for the list states; the error state keeps the last good page

`status = signal<'loading' | 'ready' | 'error'>('loading')` plus `entries = signal<GuestbookEntryDto[]>([])`, with "empty" derived (`computed(() => this.status() === 'ready' && this.entries().length === 0)`) rather than being a fourth status value, since empty is a property of a *successful* response and conflating the two would let an error masquerade as "no greetings yet."

Empty then splits by page number, because of the token behavior noted in decision 3. On page one an empty response really does mean an empty guestbook, and renders an inviting prompt to go sign it. On any later page it means the visitor has walked off the end of the list, and renders "you've reached the end" with a way back — telling someone on page 3 that "no greetings have been posted yet" would be simply false. Error renders an inline message plus a "Try again" control that re-invokes `loadPage` with the same token, and leaves the previously-rendered entries in place instead of blanking the list — a failed *next-page* request should not destroy what the visitor is already reading.

For accessibility under pagination, the list container is an `aria-live="polite"` region announcing the page change, the in-flight state is exposed via `aria-busy`, and after a page loads focus moves to the list's heading (a `tabindex="-1"` target) so a keyboard or screen-reader user is not left with focus on a "Next" button while the content behind them silently changes.

Alternative considered: a route resolver or `httpResource`-style declarative fetch — the imperative `loadPage` is a better fit because pagination is user-event-driven with a token stack the component owns, and a route resolver would put a blank, spinner-free screen between clicks.

### 8. The landing page's secondary CTA becomes a `routerLink` to `/list`

`landing.html`'s `<a class="hero__cta-secondary" href="#how-it-works">See how it works</a>` becomes `<a class="hero__cta-secondary" routerLink="/list">View the guestbook</a>`, with `RouterLink` added to `Landing`'s imports. It stays an `<a>` because it navigates — an anchor is correct here, whereas the primary CTA became a `<button>` in the previous change precisely because it *doesn't* navigate. The `#how-it-works` section and its `id` stay exactly as they are, still reachable by scrolling; only the link changes. The footer's "The interactive map is on its way" copy is updated: the map genuinely is still on its way, but "you can't see any greetings yet" is no longer true, so the copy narrows to the map specifically and points at the list.

## Risks / Trade-offs

- [Nearest-centroid country lookup will be visibly wrong for some entries, especially near European borders or for small countries] → Mitigated by always showing the real coordinates next to the name and wording the label as approximate; a conference demo's entries come mostly from one room, where the country is right and the imprecision never surfaces. If it does become embarrassing, decision 4's rejected alternatives (polygons, or resolving server-side) are both open paths.
- [The embedded country table adds ~5 KB gzipped and a hand-maintained data file] → Acceptable: static reference data on a lazily-loaded route, dwarfed by the three.js payload the landing page already ships, and it never needs updating unless the political map changes.
- [Previous re-fetches instead of replaying a cache, so stepping back costs a round trip] → Acceptable and arguably correct: the visitor sees current data, and in a multi-region demo a re-fetch may legitimately surface new entries that arrived meanwhile. If it feels sluggish on stage, caching fetched pages by token is a contained follow-up.
- [Continuation tokens can be invalidated or shift as new entries are written mid-session, since the list is newest-first and the dataset grows from the front] → A greeting submitted while a visitor sits on page 3 can cause an entry to repeat or be skipped across a page boundary. Inherent to token pagination over a live, front-growing dataset; not worth solving here. Returning to page one always gives a consistent view, and that is what a demo actually does.
- [No live updates, so a greeting signed during the demo does not appear until the list is reloaded] → Explicitly a non-goal; a manual refresh returns to page one, which is enough for the demo narrative. Real-time is a later change.
- [Moving `GuestbookApi` and the models touches the existing `AddGuestbookEntry` feature and its specs] → Low risk: import-path-only edits with no behavior change, and the frontend test suite covers the write path, so a mistake surfaces immediately as a build or test failure.
- [`GET /greetings` reads from whichever region Front Door routes to, under Cosmos session consistency] → A just-submitted greeting may briefly not appear in a list served from a different region. This is a genuine property of the architecture the talk is about, not a defect to hide; the design does nothing to mask it.

## Migration Plan

Purely additive plus one internal move. New route, new feature folder, new `listEntries` method, new country/region lookup modules; `GuestbookApi` and `guestbook-entry.models.ts` relocate with their import sites updated in the same commit. No backend, contract, infra, or persisted-data change; no CORS or `staticwebapp.config.json` edit. The landing page's `#how-it-works` anchor target survives untouched, so nothing else linking to it breaks. Rollback is reverting the commit — the previous state (a landing-page-only app with the in-page scroll link) returns intact, and nothing destructive or stateful occurs along the way.

## Open Questions

- Whether the visited-token stack should be capped (e.g. discard tokens beyond ~50 pages back) — irrelevant at demo scale, worth a thought if the guestbook ever holds tens of thousands of entries.
- Whether the list should expose a page-size control (the API accepts 10–250) or keep a single fixed page size chosen for card-grid aesthetics. Leaning fixed, to keep the UI uncluttered; a control is easy to add later since the service method already takes `pageSize`.
- Whether `country-lookup.ts` belongs in `features/guestbook-list/` or a shared `core/geo/` — depends on whether the eventual map feature needs the same table, which is unknown until the map is designed. Starting local; promote if a second consumer appears, exactly as `GuestbookApi` is being promoted in decision 2.
