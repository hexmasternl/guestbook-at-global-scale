> **Partly superseded by `optional-client-gps-location`.** Sharing browser location is now
> optional: the form no longer blocks submission when geolocation is denied, unavailable, or
> still pending — it submits without coordinates and lets the API approximate the location
> from the client IP (or record it as unknown). Everything else here still holds.

## 1. Backend: CORS for local dev

- [x] 1.1 Add a `Cors:AllowedOrigins` configuration section (e.g. `appsettings.Development.json`) defaulting to the Angular dev-server origin (`http://localhost:4200`).
- [x] 1.2 Register a named CORS policy in `HexMaster.Guestbook.Api/Program.cs` that allows the configured origin(s), `GET`/`POST` methods, and default headers (no wildcard origin, no credentials).
- [x] 1.3 Call `UseCors(...)` with the named policy before endpoint mapping, and confirm `POST /greet` responds with the appropriate `Access-Control-Allow-Origin` header for the configured origin.

## 2. Frontend: HTTP client and environment plumbing

- [x] 2.1 Add `provideHttpClient()` to `frontend/guestbook/src/app/app.config.ts`.
- [x] 2.2 Add `environment.ts` / `environment.development.ts` files under `frontend/guestbook/src/environments/` with an `apiBaseUrl` value (pointing at the local API's launch URL in development), and wire `angular.json` file replacements if not already configured by the Angular CLI defaults.
- [x] 2.3 Create a `GuestbookApi` service (`frontend/guestbook/src/app/features/landing/add-guestbook-entry/guestbook-api.ts` or a shared `core`/`data-access` location) using `@Service`/`providedIn: 'root'` and `inject(HttpClient)`, exposing `createEntry(request: { message: string; lat: number; lng: number }): Observable<GuestbookEntryDto>` that calls `POST {apiBaseUrl}/greet`.
- [x] 2.4 Define the `GuestbookEntryDto`/request TypeScript types matching the API's `CreateGuestbookEntryRequest`/`GuestbookEntryDto` shapes.

## 3. Frontend: geolocation prefill helper

- [x] 3.1 Extract a small standalone `resolveCurrentPosition()` helper (e.g. `frontend/guestbook/src/app/features/landing/add-guestbook-entry/geolocation.ts`) wrapping `navigator.geolocation.getCurrentPosition` with the same `{ timeout: 8000, maximumAge: 300_000 }` options used by `Globe`, returning a `Promise<{ lat: number; lng: number } | undefined>` that resolves to `undefined` on denial/timeout/unavailability instead of throwing.
- [x] 3.2 Add a unit test covering the resolved, denied, and unavailable (`navigator.geolocation` missing) cases.

## 4. Frontend: `AddGuestbookEntry` component

- [x] 4.1 Scaffold a standalone `AddGuestbookEntry` component at `frontend/guestbook/src/app/features/landing/add-guestbook-entry/`, importing Angular Material form modules (`MatFormFieldModule`, `MatInputModule`, `MatButtonModule`) and `MatDialogModule`/`MatDialogRef`.
- [x] 4.2 Build the form using Signal Forms (`@angular/forms/signals`) with a single `message` field (required, non-empty), mirroring the API's message validation rule. Latitude/longitude are not form fields — they are resolved from geolocation and never manually entered.
- [x] 4.3 On init, call `resolveCurrentPosition()` and track a `locationStatus = signal<'resolving' | 'available' | 'unavailable'>('resolving')`; when unavailable, show guidance and a "Try again" action that re-resolves location, and keep the submit control disabled until a position resolves.
- [x] 4.4 Add a `status = signal<'idle' | 'submitting' | 'success' | 'error'>('idle')` and `errorMessage = signal<string | undefined>(undefined)`, and implement submit handling: guard on client-side validity, set `submitting`, call `GuestbookApi.createEntry(...)`, and on success set `success` (and close the dialog via `MatDialogRef.close()` immediately or after a brief confirmation delay); on error set `error` and populate `errorMessage` with a generic retry-friendly message, keeping the dialog open and the form editable.
- [x] 4.5 Disable the submit control while `status() === 'submitting'` or while `locationStatus() !== 'available'`, to prevent duplicate submissions and submissions without coordinates.
- [x] 4.6 Style the component per ADR 0006 (consume `_variables.scss` tokens only, no hardcoded colors/spacing/fonts).
- [x] 4.7 Ensure the dialog has an accessible label (e.g. `MatDialogConfig.ariaLabel` or a labelled heading referenced via `aria-labelledby`) describing its purpose ("Sign the guestbook").

## 5. Landing page wiring

- [x] 5.1 Change the "Sign the guestbook" CTA in `landing.html` from an `<a href="#coming-soon">` to a `<button>` (Material button) with a click handler.
- [x] 5.2 In `Landing`, `inject(MatDialog)` and open `AddGuestbookEntry` from the CTA's click handler, passing an accessible label/config.
- [x] 5.3 Remove or repurpose the now-orphaned `#coming-soon` anchor/footer copy if it no longer makes sense once the CTA has a real destination (keep the footer section but drop language implying the feature is "on its way," since it now exists).
- [x] 5.4 Update `landing.spec.ts` to reflect the CTA being a button that opens the dialog instead of an anchor link, and add a test asserting the dialog opens on click.

## 6. Tests

- [x] 6.1 Add unit tests for `AddGuestbookEntry` covering: validation errors (empty message), blocked submission when location is unavailable, retrying location resolution, successful submission (dialog closes, `GuestbookApi.createEntry` called with the resolved coordinates), and failed submission (error message shown, dialog stays open, form remains editable).
- [x] 6.2 Add unit tests for `GuestbookApi.createEntry` using `HttpClientTestingModule`/`provideHttpClientTesting()`, asserting the request method, URL, and body, and that the response is mapped through correctly.
- [x] 6.3 Run `npm run build` and `npm test` in `frontend/guestbook` and confirm both succeed with all new/updated specs passing.

## 7. Backend verification

- [x] 7.1 Run `dotnet build` and `dotnet test` from the repo root and confirm the CORS change compiles and doesn't break existing API tests.
- [x] 7.2 Manually (or via a quick script) verify a cross-origin `POST /greet` request from `http://localhost:4200` succeeds against the local API with the new CORS policy applied.

## 8. Manual end-to-end verification

- [ ] 8.1 Run the API and the Angular dev server locally, open the landing page, click "Sign the guestbook," confirm the dialog opens with focus trapped inside and, when geolocation is granted, the submit control becomes enabled once a position resolves (no coordinates are shown as editable fields).
- [ ] 8.2 Submit a valid entry and confirm a success state appears and the dialog closes, returning focus to the CTA button.
- [ ] 8.3 Submit an invalid entry (e.g. empty message) and confirm client-side validation blocks submission with a visible error, without a network call. Also confirm that denying/blocking geolocation keeps the submit control disabled and shows the "Try again" guidance.
- [ ] 8.4 Simulate a failed request (e.g. stop the API) and confirm the dialog shows an inline error and remains open, allowing retry.
