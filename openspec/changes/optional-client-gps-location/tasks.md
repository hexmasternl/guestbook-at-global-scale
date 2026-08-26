## 1. Resolver port: unknown instead of a sentinel

- [x] 1.1 Change `IClientLocationResolver.Resolve` (`HexMaster.Guestbook/Services`) to return `(double Lat, double Lng)?`, documenting `null` as "location unknown" and keeping the never-throws contract.
- [x] 1.2 Update `CsvClientLocationResolver` to return `null` on every failure path (null/empty or unparsable IP, unsupported address family, no matching IP range, country code with no centroid) and drop the `(0, 0)` `UnknownLocation` constant. Keep the existing `Debug`-level miss logging.

## 2. Domain model

- [x] 2.1 Make `GuestbookEntry.Lat`/`Lng` `double?` and add a `HasLocation` property.
- [x] 2.2 Change `GuestbookEntry.Create` to accept `double? lat, double? lng`, throwing a `DomainException` when exactly one is supplied and applying range checks only to supplied values.
- [x] 2.3 Change `GuestbookEntry.Restore` to accept nullable coordinates and normalize a half-present pair to unknown rather than throwing.

## 3. Command, handler, and API contract

- [x] 3.1 Make `CreateGuestbookEntryResult.Lat`/`Lng` nullable; document `CreateGuestbookEntryCommand.Lat`/`Lng` as the client-shared (optional) coordinates.
- [x] 3.2 Update `CreateGuestbookEntryCommandHandler` to use client coordinates when both are present, otherwise the resolver's result when it is non-null, otherwise no location — and include the location (or `unknown`) in its structured log message.
- [x] 3.3 Make `GuestbookEntryDto.Lat`/`Lng` nullable and document what `null` means; update the `CreateGuestbookEntryRequest` doc comment to state that coordinates are optional because GPS access is optional.
- [x] 3.4 Confirm `GuestbookEndpoints` and `CreateGuestbookEntryRequestValidator` need no behavior change (coordinates were already optional and both-or-neither on the wire).

## 4. Persistence

- [x] 4.1 Make `GuestbookEntryDocument.Lat`/`Lng` `double?` (dropping `required`), documenting the unknown-location case, and confirm `CosmosGuestbookEntryRepository` maps through unchanged.

## 5. Backend tests

- [x] 5.1 Update `CsvClientLocationResolverTests`: unresolvable IPs, invalid input, and an empty dataset all assert a `null` result; known-IP assertions unwrap the nullable centroid.
- [x] 5.2 Add `GuestbookEntryTests` coverage: creating with no coordinates yields `HasLocation == false`; exactly one coordinate throws; `Restore` normalizes a half-present pair to unknown.
- [x] 5.3 Add a `CreateGuestbookEntryCommandHandlerTests` case: coordinates omitted and the resolver returning `null` persists an entry with no location and returns null `Lat`/`Lng`.

## 6. Frontend: entry form

- [x] 6.1 Widen `CreateGuestbookEntryRequest` (`core/guestbook/guestbook-entry.models.ts`) to optional/nullable `lat`/`lng`, and `GuestbookEntryDto.lat`/`lng` to `number | null`, with doc comments explaining unknown.
- [x] 6.2 Update `AddGuestbookEntry` to stop gating submission on `locationStatus`, build the request with coordinates only when a position resolved, and reword the location copy as optional (including the "Use my location" retry action).
- [x] 6.3 Restyle the unavailable-location notice as informational (muted `entry-form__location`) rather than an error, and let it wrap on narrow viewports.
- [x] 6.4 Update `add-guestbook-entry.spec.ts`: submits without coordinates when denied; submits without coordinates while still resolving; submits with coordinates when granted; re-resolves on request.

## 7. Frontend: entry list

- [x] 7.1 Make `resolveApproximateCountry` and `formatCoordinates` accept `number | null | undefined` and return `undefined`/`''` for a missing pair; correct the doc comments that described the `(0, 0)` sentinel.
- [x] 7.2 Add a `hasLocation` computed to `GuestbookEntryCard` and render a "Location unknown" label in place of the place/qualifier/coordinates spans, with an `entry-card__unknown` style.
- [x] 7.3 Update `country-lookup.spec.ts` and `guestbook-entry-card.spec.ts` for null coordinates, and reframe the `(0, 0)` test as a genuine coordinate rather than a sentinel.

## 8. Documentation

- [x] 8.1 Update `src/HexMaster.Guestbook.Api/README.md`: the fail-safe fallback is now "unknown" (null coordinates), including the note that entries written before this change keep their `(0, 0)` value.
- [x] 8.2 Add `POST /greet` examples (with and without coordinates) to `HexMaster.Guestbook.Api.http`, replacing the scaffolded weather-forecast request.
- [x] 8.3 Note the nullable `lat`/`lng` in the `storyline/demo-app-plan.md` document schema.
- [x] 8.4 Mark the superseded statements in `openspec/changes/lookup-location-based-on-client-ip` and `openspec/changes/app-frontend-add-guestbook-entry` as replaced by this change, rather than rewriting their history.

## 9. Verification

- [x] 9.1 Build the backend projects and run the xUnit suite (`dotnet run` in `src/Tests/HexMaster.Guestbook.Tests`) — 59 tests pass.
- [x] 9.2 Run `npm test` and `npm run build` in `frontend/guestbook` — 88 tests pass, production build clean.
- [ ] 9.3 Manual end-to-end check with the AppHost running: submit with location granted (pin at the browser position), with location denied (pin at the country centroid), and from a loopback/private client IP with location denied (entry listed as "Location unknown").
