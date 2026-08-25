## 1. Pre-flight

- [ ] 1.1 Re-check the HexMaster design-guidelines MCP server (`list_docs`, `search_docs`, `get_doc`) for any frontend-relevant ADR, recommendation, or structure template governing Angular routing, feature-folder layout, shared services, or styling; reconcile design.md's decisions with whatever it says and flag any conflict before writing code (the server was not connected when this change was planned).
- [ ] 1.2 Confirm `GET /greetings` responds as documented against the locally-running API (empty result, populated result, and a `continuationToken` round trip) so the frontend is built against observed behavior rather than the contract on paper.

## 2. Shared API client and models

- [ ] 2.1 Create `frontend/guestbook/src/app/core/guestbook/` and move `guestbook-api.ts` + `guestbook-entry.models.ts` there from `features/landing/add-guestbook-entry/`, keeping `GuestbookApi`'s `@Service()`/root-provided shape and its existing `createEntry` behavior unchanged.
- [ ] 2.2 Update the import paths in `add-guestbook-entry.ts`, `add-guestbook-entry.spec.ts`, and `guestbook-api.spec.ts` (moving the latter alongside the service), and confirm `npm test` still passes for the write path before adding anything new.
- [ ] 2.3 Add a `ListGuestbookEntriesResponse` interface (`entries: GuestbookEntryDto[]`, `continuationToken: string | null`) to `guestbook-entry.models.ts`, matching the API's `ListGuestbookEntriesResponse`.
- [ ] 2.4 Add `listEntries(options?: { pageSize?: number; continuationToken?: string }): Observable<ListGuestbookEntriesResponse>` to `GuestbookApi`, calling `GET {apiBaseUrl}/greetings` and building query params only for the values actually supplied, so an omitted `pageSize` lets the API apply its own default.
- [ ] 2.5 Extend `guestbook-api.spec.ts` with `provideHttpClientTesting()` cases asserting: the request URL and `GET` method; that no `pageSize`/`continuationToken` params are sent when omitted; that both are sent when supplied; and that the response body is passed through unchanged.

## 3. Region name mapping

- [ ] 3.1 Add `region-names.ts` mapping the Azure region slugs the infra actually deploys to (check `infra/` Bicep for the current list — at least `westeurope`, `eastus`, `swedencentral`) to display names, exposing a `regionDisplayName(slug: string): string` that returns the raw slug unchanged when unmapped.
- [ ] 3.2 Add unit tests for `regionDisplayName` covering a mapped slug, an unmapped slug (returned verbatim), and an empty/whitespace value.

## 4. Offline approximate-country lookup

- [ ] 4.1 Add a static country table (ISO code, display name, centroid lat/lng, bounding box) as project source data under the list feature, covering the ~250 ISO-3166 countries. Keep it a plain data module with no runtime dependencies.
- [ ] 4.2 Implement a pure `resolveApproximateCountry(lat: number, lng: number): string | undefined` that narrows to countries whose bounding box contains the point, picks the nearest centroid among those candidates, and falls back to the nearest centroid overall when no bounding box matches.
- [ ] 4.3 Implement a pure coordinate formatter producing a readable hemisphere form (e.g. `52.3° N, 4.9° E`) from a lat/lng pair, including the zero and negative cases.
- [ ] 4.4 Add unit tests for both: a clearly-inland point resolving to the expected country, a mid-ocean point falling back without throwing, the `(0, 0)` sentinel, and a border-adjacent point asserted only as "resolves to one of the neighbouring countries" so the test documents the known imprecision instead of pinning it to a wrong answer.

## 5. Relative timestamp formatting

- [ ] 5.1 Implement a pure relative-time formatter over `Intl.RelativeTimeFormat` turning an ISO timestamp into "just now" / "2 hours ago" / "3 days ago", taking the reference "now" as an argument rather than reading the clock internally, so it stays testable and no `new Date()` global is assumed in a template.
- [ ] 5.2 Add unit tests covering seconds, minutes, hours, days, and a far-past timestamp.

## 6. `GuestbookEntryCard` presentational component

- [ ] 6.1 Create a standalone `GuestbookEntryCard` at `features/guestbook-list/guestbook-entry-card/` taking `entry = input.required<GuestbookEntryDto>()`, with `computed()` values for the approximate country, the formatted coordinates, the region display name, and the relative timestamp.
- [ ] 6.2 Render the message, the approximate location labelled as approximate with the exact coordinates alongside it, the region as a visually prominent badge carrying the raw slug in a `title` attribute, and the timestamp inside a `<time datetime="...">` element holding the exact ISO value.
- [ ] 6.3 Handle the degenerate cases in the template: no resolved country (show coordinates only, no error), and a long or unbroken message (wrap within the card, never overflow).
- [ ] 6.4 Style the card from `_variables.scss` tokens only, reusing the existing glass-surface/radius tokens for continuity with the landing page; add any genuinely new token (card min-width, region-badge color) to `_variables.scss` rather than inlining it, per ADR 0006.
- [ ] 6.5 Add unit tests asserting the rendered message, region display name and `title` slug, presence of the coordinates, the `<time>` element's `datetime` attribute, and the no-resolved-country fallback.

## 7. `GuestbookList` page component

- [ ] 7.1 Create a standalone `GuestbookList` at `features/guestbook-list/`, injecting `GuestbookApi` and importing `MatButtonModule`, `MatProgressSpinnerModule`, `RouterLink`, and `GuestbookEntryCard`.
- [ ] 7.2 Add the state signals: `entries`, `status = signal<'loading' | 'ready' | 'error'>('loading')`, `tokenStack = signal<(string | undefined)[]>([undefined])`, the latest response's next token, and a `computed()` `isEmpty` derived from `status() === 'ready' && entries().length === 0` (not a fourth status value).
- [ ] 7.3 Implement a single `loadPage(token: string | undefined)` that owns every `status` transition and is the one code path used by the initial load, Next, Previous, and retry.
- [ ] 7.4 Implement `nextPage()` (push the current next token, load it) and `previousPage()` (pop, re-fetch the token now on top), disabling Next when the latest `continuationToken` is `null`, disabling Previous on the first page, and disabling both while a request is in flight.
- [ ] 7.5 Show the current page number without a total or an entry count, and load the first page on init so `/list` always opens at page one.
- [ ] 7.6 Render the four states: loading (spinner, `aria-busy`), populated (the card grid), empty (a "no greetings yet" message inviting the visitor to sign the guestbook, semantically distinct from the error state), and error (inline message plus a "Try again" control re-invoking `loadPage` with the same token, leaving any already-rendered entries on screen).
- [ ] 7.7 Add a back control (`routerLink="/"`) present and operable in all four states.
- [ ] 7.8 Mark the entries up as a semantic `<ul>`/`<li>`, put the list container in an `aria-live="polite"` region, and move focus to the list heading (a `tabindex="-1"` target) after each page load so focus is not left on a control whose content has changed beneath it.
- [ ] 7.9 Lay the grid out mobile-first: a single column by default, `repeat(auto-fit, minmax(<token>, 1fr))` above a token-driven breakpoint, with no horizontal page scrolling at any width; style from `_variables.scss` tokens only.
- [ ] 7.10 Add unit tests covering: entries render in the API's returned order; Next fetches with the returned token and Previous re-fetches the prior one; Next disabled on the last page and Previous disabled on the first; both disabled while in flight; the empty state; the error state including retry and the preservation of already-rendered entries; and that a fresh mount starts at page one.

## 8. Routing

- [ ] 8.1 Add `{ path: 'list', loadComponent: () => import('./features/guestbook-list/guestbook-list').then((m) => m.GuestbookList) }` to `app.routes.ts`, matching the existing lazy-loading style. Do not add a wildcard/404 route.
- [ ] 8.2 Verify the built output emits `GuestbookList` (and its country table) as a lazy chunk rather than folding it into the initial bundle, and note the chunk's size.
- [ ] 8.3 Confirm `/list` deep-links correctly under the existing `public/staticwebapp.config.json` navigation fallback with no edit to that file.

## 9. Landing page wiring

- [ ] 9.1 Replace `landing.html`'s `<a class="hero__cta-secondary" href="#how-it-works">See how it works</a>` with a "View the guestbook" `<a routerLink="/list">`, adding `RouterLink` to `Landing`'s imports and keeping the element an anchor (it navigates).
- [ ] 9.2 Leave the `#how-it-works` section and its `id` untouched, and confirm the section is still reachable by scrolling.
- [ ] 9.3 Update the footer copy so it no longer implies greetings are unviewable — narrow the "on its way" language to the interactive map specifically and point at the list.
- [ ] 9.4 Adjust `hero__cta-secondary` styling only as far as the new label requires, still consuming `_variables.scss` tokens.
- [ ] 9.5 Update `landing.spec.ts` to assert the secondary CTA is a link to `/list` with the new label, and that the primary CTA still opens the entry dialog.

## 10. Verification

- [ ] 10.1 Run `npm run build` and `npm test` in `frontend/guestbook` and confirm both succeed with all new and updated specs passing.
- [ ] 10.2 Run an accessibility check (AXE) against `/list` in its populated, empty, loading, and error states, and confirm no violations — paying particular attention to contrast on the region badge, the live-region announcement, and focus placement after a page change.
- [ ] 10.3 Manually verify against the local API with more entries than one page holds: the list renders newest-first; Next and Previous move as expected; Next is disabled on the last page and Previous on the first; the page indicator shows no total.
- [ ] 10.4 Manually verify the empty state against a guestbook with no entries, and the error state by stopping the API mid-session — confirming the already-rendered entries survive the failure and "Try again" recovers.
- [ ] 10.5 Manually verify the responsive layout at a phone width, a tablet width, and a desktop width, including a deliberately long unbroken message, checking for no horizontal scrolling at any width.
- [ ] 10.6 Manually verify keyboard-only operation end to end: reach `/list` from the landing page's secondary CTA, page forward and back, retry after an error, and return via the back control.
- [ ] 10.7 Sanity-check the approximate-location output against real submitted entries and confirm the label reads as approximate with the coordinates visible next to it — note any specific country that resolves wrongly and decide, before the demo, whether it matters.
