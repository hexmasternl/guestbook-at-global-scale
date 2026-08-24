## Why

The landing page's "Sign the guestbook" button is currently a dead anchor link (`href="#coming-soon"`) that only scrolls to a "coming soon" footer. The backend already exposes a working `POST /greet` endpoint (accepting `message`, `lat`, `lng` and returning the created entry), but the frontend has no way to call it yet. Visitors need an actual way to submit a greeting before the interactive map/live-feed experience can be demoed end-to-end.

## What Changes

- Add a new standalone `AddGuestbookEntry` component (`frontend/guestbook/src/app/features/landing/add-guestbook-entry/`) containing a form to compose and submit a greeting (message + latitude/longitude), using Signal Forms and Angular Material form fields, per the repo's Angular conventions.
- Add a `GuestbookApi` singleton service (`@Service`/`providedIn: 'root'`) that wraps `HttpClient` and calls `POST /greet` against the backend API, mapping the request/response shape already defined by `HexMaster.Guestbook.Api` (`CreateGuestbookEntryRequest` → `GuestbookEntryDto`).
- Wire `provideHttpClient()` into `app.config.ts` and add an API base URL to Angular's environment configuration (dev vs. production), since no HTTP client is configured in the frontend today.
- Change the "Sign the guestbook" button in `Landing` from an anchor link to a button that opens the new form inside an Angular Material (`MatDialog`) modal, replacing the `#coming-soon` scroll-to-footer behavior for that CTA.
- Prefill the form's latitude/longitude from the visitor's resolved geolocation when available (reusing the same `navigator.geolocation` approach as the existing `Globe` component), while still allowing manual entry/override.
- On successful submission, show a success confirmation in the dialog and close it; on failure (validation or network error), surface an inline error and keep the dialog open so the visitor can retry.
- Add a minimal CORS policy to `HexMaster.Guestbook.Api` allowing the local Angular dev-server origin (and a configurable production frontend origin) to call `POST /greet`, since the API currently has no CORS configuration and the browser would otherwise block every request from the new form — this is the smallest backend change needed to make the new frontend capability actually work.
- **BREAKING**: none — purely additive; the existing "how it works"/footer anchor markup and IDs are unaffected except for the CTA's click behavior.

## Capabilities

### New Capabilities
- `frontend-guestbook-entry-form`: A modal dialog, opened from the landing page's "Sign the guestbook" CTA, containing a form that lets a visitor compose and submit a guestbook greeting (message + coordinates) to the `POST /greet` API, with client-side validation, loading/success/error states, and geolocation-assisted coordinate prefill.

### Modified Capabilities
(none — no existing specs cover the landing page CTA's behavior at the requirement level; `frontend-landing-page`'s spec only describes the page as a whole and is not being changed)

## Impact

- **Affected files**: `frontend/guestbook/src/app/features/landing/landing.ts` / `landing.html` (CTA now opens a dialog instead of linking to `#coming-soon`), `frontend/guestbook/src/app/app.config.ts` (add `provideHttpClient`), new `frontend/guestbook/src/environments/` files (API base URL), new `add-guestbook-entry` component folder, new `guestbook-api` service.
- **New dependency surface**: `@angular/material/dialog` and `@angular/common/http` (both already available via existing `@angular/material`/`@angular/core` packages — no new npm packages required).
- **Minimal backend change**: `HexMaster.Guestbook.Api/Program.cs` gains a CORS policy (allowed origins read from configuration) so the browser-based form can call `POST /greet`; the endpoint's request/response contract itself is consumed as-is and is unchanged.
- **Out of scope**: the live map showing pins for all submitted greetings (`GET /greetings` / SSE/polling), CORS/hosting configuration for a deployed (non-local) API origin, and any Aspire AppHost wiring for a combined dev-server experience — those remain future changes.
