## Context

Two earlier changes together made a location mandatory in practice:

- `app-frontend-add-guestbook-entry` (decision 4) resolves coordinates from `navigator.geolocation` only, and keeps the submit control disabled while `locationStatus() !== 'available'`. Its own risk log records this as "acceptable and by design", explicitly to avoid widening the API's then-non-nullable `Lat`/`Lng` contract.
- `lookup-location-based-on-client-ip` made `lat`/`lng` optional on the wire and added the IP → country → centroid fallback, but chose a fixed `(0, 0)` sentinel for total resolution failure, and stated as a goal that the persisted schema stays unchanged.

That contract has since widened anyway (`lat`/`lng` are already optional on `POST /greet`), so the client-side block no longer protects anything, and the sentinel is now the only reason an unresolvable location has to be represented as a real coordinate. This change removes both.

It must comply with:
- ADR 0004/0009 — `IClientLocationResolver` stays a port in `HexMaster.Guestbook/Services/`, its signature changing only in what "failure" looks like.
- ADR 0005 — the endpoint stays thin; the nullable coordinate decision lives in the domain model and command handler, not in the endpoint or the client.
- `frontend/guestbook/CLAUDE.md` — signals, `computed()`, Signal Forms, native control flow.

## Goals / Non-Goals

**Goals:**
- A visitor who never grants browser location access can sign the guestbook.
- Location accuracy degrades in explicit, honest steps: client GPS → IP-derived country centroid → unknown.
- "Unknown" is representable end to end (domain, storage, API, UI) without fabricating a coordinate.
- Both-or-neither stays an invariant: a half-present coordinate pair is never persisted or rendered.

**Non-Goals:**
- Recording *how* a location was determined (client GPS vs. IP vs. unknown) as a stored field — the previous change already decided against this, and nothing here needs it. `lat`/`lng` being `null` is the only distinction that matters to a reader.
- Backfilling the existing `(0, 0)` rows written before this change.
- Any change to the geo-IP dataset, the centroid table, the client-IP header order, or `POST /greet` request validation.
- Suppressing the browser permission prompt, or moving it behind a button. The dialog still asks once on open; only the consequence of "no" changed.

## Decisions

### 1. Unknown is `lat: null, lng: null` — not a sentinel coordinate, and not an extra discriminator field
`(0, 0)` is a genuine coordinate (Gulf of Guinea, ~380 km south of Accra), so using it as "unknown" makes a fabricated pin indistinguishable from a real one — the `country-lookup` table in the frontend happily resolves it to a West African country. Nullable coordinates are the smallest representation that cannot be confused with data: `null` is not a place.

A separate marker (`locationSource: 'client' | 'ip' | 'unknown'`, or a literal `location: "unknown"` string) was considered and rejected — it adds a second source of truth for the same fact, and every consumer would still have to handle absent coordinates.

Alternative considered: keeping `(0, 0)` in storage and translating it to "unknown" at the API boundary — rejected because it moves the fabrication out of sight instead of removing it, and a genuine visitor at `(0, 0)` would be silently relabelled.

### 2. `IClientLocationResolver.Resolve` returns `(double Lat, double Lng)?`
The fail-safe contract is unchanged in spirit — never throw, never fail the request — but failure is now expressed as `null`. The handler treats `null` exactly as it treats absent client coordinates: it stores nothing. `CsvClientLocationResolver`'s four failure paths (null/unparsable IP, non-IP address family, no matching range, country with no centroid) all return `null`, with the existing `Debug`-level miss logging kept.

### 3. Both-or-neither is enforced in the domain model, not just at the endpoint
`GuestbookEntry.Create` throws a `DomainException` when exactly one of `lat`/`lng` is supplied (the endpoint validator already returns a 400 for that on the wire, but the invariant belongs to the model), and range checks still apply to whichever values are present. `GuestbookEntry.Restore` — which deliberately skips creation-time validation — normalizes a half-present pair to unknown instead of throwing, so a malformed stored document degrades to "unknown" rather than failing a whole page of reads. `HasLocation` exposes the distinction for logging and for consumers.

### 4. The client sends coordinates only when it has them, and never waits for them
`AddGuestbookEntry` keeps its single `message` form field and its one-shot `resolveCurrentPosition()` call on open, but:
- the submit control is disabled only while `status() === 'submitting'`;
- `submitForm()` builds `{ message }` and adds `lat`/`lng` only when a position resolved, so an unresolved location omits both keys rather than sending `null`s;
- a still-`resolving` location does **not** delay submission. Waiting would mean waiting on the browser's permission prompt, whose deadline is up to `PROMPT_TIMEOUT_MS` (120 s) — a visitor who submits before deciding gets the IP-based estimate instead, which is the whole point of the fallback.

The `'unavailable'` state is therefore informational, styled as the muted `entry-form__location` note rather than the red `entry-form__error`, and its action reads "Use my location" rather than "Try again".

### 5. The list UI states "Location unknown" rather than hiding the row
`resolveApproximateCountry` and `formatCoordinates` accept `number | null | undefined` and return `undefined`/`''` for a missing pair — the same result they already produced for non-finite input, so callers need no new branches. `GuestbookEntryCard` gains a `hasLocation` computed and renders a single `entry-card__unknown` label in place of the country/qualifier/coordinates spans. Keeping the 📍 row present (rather than omitting it) keeps every card's meta block the same shape, and "unknown" is information a viewer of a global-scale demo should see.

## Risks / Trade-offs

- [Response `lat`/`lng` became nullable — a **BREAKING** change for consumers] → The only consumer is this repo's own frontend, updated in the same change; the API is not yet publicly deployed. TypeScript models were widened to `number | null`, which surfaces every unguarded use at compile time.
- [Entries written before this change keep their `(0, 0)` fallback and still render as a West African country] → Accepted, not migrated: a demo dataset, and the rows are indistinguishable from real ones precisely because of the bug being fixed, so a backfill would have to guess. Documented in `src/HexMaster.Guestbook.Api/README.md`.
- [More visitors will get a coarse, country-centroid location instead of a precise pin, because declining the prompt is now frictionless] → Intended. The demo's point is regional routing and replication, not pin accuracy, and the card already labels derived countries "approx.".
- [A visitor who submits while the permission prompt is still open gets an IP-derived location even though they were about to click "Allow"] → Accepted (decision 4); the alternative is blocking submission on a prompt that can sit open for two minutes.
- [`Restore` silently normalizing a half-present pair could mask a data bug] → Bounded: `Create` and the endpoint validator both reject the shape on write, so a half-present document can only come from outside this API.
