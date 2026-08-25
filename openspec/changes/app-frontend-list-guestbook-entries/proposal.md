## Why

The backend already exposes a working read side — `GET /greetings` returns persisted entries newest-first with continuation-token pagination — but nothing in the frontend calls it. Today a visitor can sign the guestbook and then has no way to see their greeting, or anyone else's: the landing page's secondary link ("See how it works") only scrolls to a feature strip, and the footer still promises that the map "is on its way." Until the greetings are visible somewhere, the demo's core claim — *your message appears for everyone, and here is which region handled it* — cannot actually be shown to an audience.

## What Changes

- Add a `/list` route to the Angular app, lazily loading a new standalone `GuestbookList` page component (`frontend/guestbook/src/app/features/guestbook-list/`). The app currently has exactly one route (`''` → `Landing`), so this is the first real multi-route navigation in the frontend.
- Extend `GuestbookApi` with `listEntries({ pageSize?, continuationToken? }): Observable<ListGuestbookEntriesResponse>` calling `GET {apiBaseUrl}/greetings`, and add the matching `ListGuestbookEntriesResponse` TypeScript type. Promote `GuestbookApi` and the entry models out of the `add-guestbook-entry/` folder into a shared location, since a second feature now consumes them.
- Render each entry as a card showing the message, the approximate origin location, the Azure region that handled the write, and a relative timestamp — modern, mobile-first, responsive (single column on phones widening to a multi-column grid), styled exclusively from `_variables.scss` tokens per ADR 0006.
- Show the approximate origin location by resolving the entry's `lat`/`lng` against a small embedded country table client-side (nearest-centroid, no network call), displayed alongside the raw coordinates so the precise value is always visible next to the approximation. The API returns no place name, so this is derived entirely in the browser.
- Show the handling data-center region as a friendly Azure region display name (`westeurope` → "West Europe"), falling back to the raw slug when unmapped and keeping the raw slug available on hover.
- Add Next/Previous pagination driven by the API's continuation tokens, with a client-side stack of visited tokens so "Previous" can walk back through pages already fetched. The API is forward-only and returns no total count, so page numbers and jump-to-page are not offered.
- Handle the empty, loading, and error states of the list explicitly, with a retry affordance on failure.
- Add a back control on the list page that navigates to the landing page (`/`).
- Change the landing page's secondary hero link from "See how it works" (`href="#how-it-works"`) to a "View the guestbook" router link navigating to `/list`, and update the footer copy that still claims the map/feed is unavailable.
- **BREAKING**: none for users. Internally, `GuestbookApi` and `guestbook-entry.models.ts` move to a shared folder, so the existing `AddGuestbookEntry` imports are updated — a mechanical refactor with no behavior change.

## Capabilities

### New Capabilities
- `frontend-guestbook-list`: A `/list` route rendering persisted guestbook entries as a responsive, mobile-first card list — each showing the message, an approximate origin location derived client-side from the entry's coordinates, the handling Azure region, and a timestamp — with Next/Previous continuation-token pagination, explicit empty/loading/error states, and a back control returning to the landing page.

### Modified Capabilities
- `frontend-landing-page`: The hero's secondary call-to-action becomes a "View the guestbook" link navigating to the `/list` route, replacing the in-page "See how it works" scroll anchor. This also retires the existing scenario asserting the landing page's calls-to-action do not invoke `GET /greetings`, since reaching the list page is now precisely their purpose.

## Impact

- **Affected files**: `frontend/guestbook/src/app/app.routes.ts` (new lazy `/list` route), `features/landing/landing.html` + `landing.ts` (secondary CTA becomes a router link; footer copy updated), `features/landing/landing.spec.ts`, `features/landing/add-guestbook-entry/add-guestbook-entry.ts` and its specs (import paths after the service/model move).
- **New files**: a `features/guestbook-list/` folder (page component, entry card, pagination state, specs), a shared `guestbook-api.ts` + `guestbook-entry.models.ts` location, and a country-lookup module plus its embedded country table.
- **No new npm dependencies**: `@angular/router` and `@angular/material` are already pinned; the country table ships as project source data (~5 KB gzipped), not a package.
- **No backend changes**: `GET /greetings` is consumed exactly as it already exists, including its 10/50/250 page-size bounds and opaque continuation tokens. The API's existing CORS policy already allows `GET`.
- **No infra changes**: `public/staticwebapp.config.json` already rewrites unmatched paths to `/index.html`, so deep-linking `/list` on Azure Static Web Apps works with no configuration edit.
- **API stays stateless**: all pagination state (the current token and the visited-token stack) lives in the browser; the frontend never asks the API to remember a position.
- **Out of scope**: the interactive world map with pins, live/real-time updates (SSE or polling) as new entries arrive, filtering or searching entries, per-entry detail views, and city-level geocoding accuracy.
