> **Partly superseded by `optional-client-gps-location`.** Sharing browser location is now
> optional: the form no longer blocks submission when geolocation is denied, unavailable, or
> still pending — it submits without coordinates and lets the API approximate the location
> from the client IP (or record it as unknown). Everything else here still holds.

## Context

The `frontend/guestbook/` Angular app (v22, zoneless, signals-first, standalone components — see `AGENTS.md`/`CLAUDE.md`) currently has a single `Landing` feature route. Its "Sign the guestbook" CTA is a dead anchor (`href="#coming-soon"`). The backend (`HexMaster.Guestbook.Api`) already implements `POST /greet`:

```
POST /greet
Request:  { "message": string, "lat": number, "lng": number }
Response: 201 Created, GuestbookEntryDto { id, message, lat, lng, region, ts }
          400 ValidationProblem on bad input (message empty; lat/lng out of range)
```

The frontend has no `HttpClient` provider, no environment configuration, and the API has no CORS policy — none of this plumbing exists yet, since this is the first capability that talks to the backend at all.

Constraints in force:
- ADR 0006 (centralized styling variables) — no hardcoded colors/spacing/fonts in new component SCSS; must consume `_variables.scss`.
- Repo Angular conventions (`AGENTS.md`) — standalone components, signals, `input()`/`output()`/`model()`, Signal Forms preferred over Reactive/template-driven forms, `inject()`, no explicit `OnPush`/`standalone: true`.
- Accessibility — WCAG AA + AXE clean; a modal dialog has specific focus-management/ARIA requirements (focus trap, labelled dialog, return focus to trigger on close, Escape-to-close).
- The API is stateless and multi-region — the frontend must not assume a single fixed backend origin in production, only for local dev.

## Goals / Non-Goals

**Goals:**
- Let a visitor open a modal from the landing page's "Sign the guestbook" CTA, fill in a message (and optionally adjust auto-detected coordinates), and submit it to `POST /greet`.
- Provide clear loading, success, and error states inside the dialog.
- Keep the dialog accessible: proper `role="dialog"`/`aria-modal`, labelled by its heading, focus trapped and returned to the trigger button on close, dismissible via Escape and a visible close control.
- Establish the minimal HTTP/environment/CORS plumbing needed for this and future API-calling features, without over-building it.

**Non-Goals:**
- Rendering the live map / list of existing greetings (`GET /greetings`) — this change only covers the write path and the dialog UI.
- Real-time updates (SSE/polling) after submission.
- Production CORS/hosting topology (Front Door, Static Web Apps origin rules) — only a configurable allowed-origins list is introduced; actual production values are an infra/deployment concern for a later change.
- Rate-limit-aware UX (e.g., showing a specific "too many requests" message tailored to `RateLimitPartitions.CreateGreetingPolicy`) beyond generic error handling — the API already rate-limits; the frontend just surfaces whatever error status comes back generically.

## Decisions

### 1. Angular Material `MatDialog` for the modal, not a custom overlay
`MatDialog` is already a project dependency (`@angular/material` is pinned in `package.json`) and provides built-in focus trapping, `aria-modal`, Escape-to-close, and focus restoration on close — satisfying the accessibility goals with no extra code. A hand-rolled `<dialog>`/overlay implementation would duplicate this behavior and risk missing an ARIA/focus-management edge case.
Alternative considered: native `<dialog>` element — viable and zero-dependency, but the repo already standardizes on Angular Material for UI components (per `AGENTS.md`), and `MatDialog` integrates with the existing Material theme/tokens more directly. Rejected in favor of consistency.

### 2. New `AddGuestbookEntry` standalone component rendered via `MatDialog.open()`
`Landing` injects `MatDialog` and calls `dialog.open(AddGuestbookEntry, { ariaLabel: 'Sign the guestbook' })` from a click handler on the CTA button (now a `<button>`, not an `<a>`, since it no longer navigates anywhere). `AddGuestbookEntry` lives at `frontend/guestbook/src/app/features/landing/add-guestbook-entry/`, alongside the existing `globe/` sub-feature, keeping the landing page's own CTA-triggered UI colocated under `features/landing/`.
Alternative considered: a top-level `features/guestbook-entry/` folder — rejected for this change since the form is only reachable from the landing page's CTA today; if a second entry point appears later (e.g. from the map), it can be promoted to a shared location then.

### 3. Signal Forms for the message field; coordinates are not form fields
Per `AGENTS.md`, Signal Forms (`@angular/forms/signals`) are preferred for new forms. The form only has one field: `message` (required, non-empty, mirrors the API's validation). Latitude/longitude are **not** part of the form model or UI — they are resolved automatically from geolocation (see decision 4) and submission is blocked entirely until they're available, so no separate client-side range validation for them is needed in the form.
Alternative considered: Reactive Forms (`FormGroup`/`Validators`) — the documented fallback when Signal Forms don't fit, but Signal Forms are explicitly preferred and there's no blocker to using them here for the single `message` field.

### 4. Geolocation-only coordinates; submission blocked until resolved
Rather than importing `Globe` (a heavy three.js-backed component) into the dialog just to read coordinates, a small standalone function (`resolveCurrentPosition()`) wraps `navigator.geolocation.getCurrentPosition` with the same `{ timeout: 8000, maximumAge: 300_000 }` options `Globe` already uses, returning a `Promise<{ lat: number; lng: number } | undefined>`. `AddGuestbookEntry` calls it on init and tracks a `locationStatus = signal<'resolving' | 'available' | 'unavailable'>('resolving')`. Latitude/longitude are **never entered or edited by hand** — the submit control stays disabled while `locationStatus() !== 'available'`, and an "unavailable" state shows guidance plus a "Try again" action that re-invokes `resolveCurrentPosition()`. This was changed from the original design (which prefilled editable lat/lng fields) because manual coordinate entry undermines the app's core "geo-tagged pin" concept and the API's non-nullable `Lat`/`Lng` contract was left unchanged.
Alternative considered: reading the coordinates already resolved by the on-page `Globe` instance (via a shared signal) — rejected because it would couple the form to the landing page's decorative globe being present/successful, whereas the dialog should resolve its own location independently.
Alternative considered: making `lat`/`lng` nullable end-to-end (API/domain/storage) so a request could be sent without coordinates — rejected as a larger, out-of-scope domain change; an entry without coordinates has no meaningful place on the map, so blocking submission client-side is simpler and requires no backend changes.

### 5. `GuestbookApi` service wrapping `HttpClient`, environment-driven base URL
A `providedIn: 'root'` service (`@Service`, per `AGENTS.md`'s Angular v22 preference) exposes `createEntry(request: { message: string; lat: number; lng: number }): Observable<GuestbookEntryDto>`, calling `POST {apiBaseUrl}/greet`. `apiBaseUrl` comes from a new `environment.ts`/`environment.development.ts` pair (standard Angular CLI convention), defaulting to `http://localhost:5xxx` (the API's local launch profile) in development and left as a relative-path/placeholder for production, to be finalized when the app is actually deployed alongside the API.
Alternative considered: hardcoding the URL in the service — rejected, since dev vs. eventual production origins will differ and environment files are the standard Angular mechanism for this.

### 6. Minimal CORS policy on the API, allowed origins from configuration
`Program.cs` adds `builder.Services.AddCors(...)` with a named policy allowing the origin(s) listed in a new `Cors:AllowedOrigins` configuration array (defaulting to the Angular dev-server origin, e.g. `http://localhost:4200`, in `appsettings.Development.json`), and `app.UseCors(...)` before endpoint mapping. Only the origin, `GET`/`POST` methods, and default headers needed for a JSON POST are allowed — no wildcard origins, no credentials.
Alternative considered: a wildcard (`AllowAnyOrigin`) policy — rejected as unnecessarily permissive for an API that will later run in multiple regions behind Front Door with a known frontend origin.

### 7. Submission state as a signal, not a service-level loading store
`AddGuestbookEntry` holds its own `status = signal<'idle' | 'submitting' | 'success' | 'error'>('idle')` and `errorMessage = signal<string | undefined>(undefined)`, updated from the `createEntry` call's `next`/`error` callbacks (or `finalize`). This keeps state local and simple, matching "keep components small" and avoiding a shared store for a single, short-lived dialog interaction.

## Risks / Trade-offs

- [No production API origin/CORS value is finalized yet] → Acceptable: only local dev is required to work end-to-end for this change; the `Cors:AllowedOrigins`/environment values are configuration, not code, so they're trivial to update once a deployed frontend origin exists.
- [Geolocation may be denied/unavailable, blocking submission entirely] → Acceptable and by design: since coordinates are no longer manually enterable, a visitor without location access simply cannot sign the guestbook until they grant access and retry; this matches the app's core "geo-tagged pin" concept and avoids widening the API's non-nullable `Lat`/`Lng` contract.
- [Rate limiting on `POST /greet` could reject a submission] → The dialog shows the generic error state (message: "Something went wrong, please try again") for any non-2xx response including 429; a friendlier "you're doing that too fast" message is a nice-to-have deferred to a follow-up if it becomes an actual demo issue.
- [Adding `HttpClientModule`/`provideHttpClient` and a CORS policy touches shared app-wide config (`app.config.ts`, `Program.cs`)] → Low risk: both are additive, standard, and don't change existing behavior for any other route/endpoint.

## Migration Plan

Purely additive: new component/service/environment files on the frontend, one new `provideHttpClient()` provider registration, one new CORS policy + `UseCors` call on the API. No existing data, contracts, or routes change. Rollback is reverting the commit; nothing destructive occurs, and no persisted data format changes.

## Open Questions

- Final production frontend origin (for the real `Cors:AllowedOrigins` value and the production `environment.ts` API base URL) — to be resolved once frontend hosting/deployment (Static Web App / Front Door) is designed in a later change.
- Whether a friendlier rate-limit-specific error message is worth adding before the live conference demo, or whether the generic error state is sufficient — deferred pending a dry run of the demo flow.
