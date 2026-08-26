## Why

Sharing a browser GPS location is still effectively mandatory: the entry form blocks submission until `navigator.geolocation` returns a position (`app-frontend-add-guestbook-entry`, design decision 4), and when the server's IP-based fallback can't map a client IP it fabricates a `(0, 0)` coordinate (`lookup-location-based-on-client-ip`, decision 5). Both are wrong for a public guestbook: a visitor who declines the browser prompt cannot sign at all, and `(0, 0)` is a real place in the Gulf of Guinea, so a stored greeting is indistinguishable from a genuine pin there.

## What Changes

- **Client**: the entry form treats location as optional. It still asks the browser once on open, but the submit control is never gated on the outcome — a denied, unsupported, or still-pending geolocation submits the greeting **without** `lat`/`lng`. The "location required, try again" error becomes an informational note explaining the server will estimate the location from the network connection instead, with an optional "Use my location" retry.
- **Server**: `IClientLocationResolver.Resolve` returns `(double Lat, double Lng)?` instead of a `(double, double)` with a `(0, 0)` failure sentinel. `null` means "unknown".
- **Domain/storage/API**: `GuestbookEntry.Lat`/`Lng`, `GuestbookEntryDocument.lat`/`lng`, `CreateGuestbookEntryResult` and `GuestbookEntryDto` become nullable. `null`/`null` **is** the stored representation of an unknown location — no fabricated coordinate, no extra marker field. `GuestbookEntry` enforces both-or-neither (a half-present pair throws; `Restore` normalizes one to unknown), and exposes `HasLocation`.
- **Frontend list**: `resolveApproximateCountry`/`formatCoordinates` accept `null`/`undefined` and return `undefined`/`''`; an entry card with no coordinates renders "Location unknown" instead of a country and a coordinate pair.
- **BREAKING**: `GuestbookEntryDto.lat`/`lng` in `GET /greetings` and `POST /greet` responses can now be `null`. Any consumer that assumed a number must handle it. `POST /greet` request handling is unchanged (both-or-neither optional, as before).
- Not changed: `POST /greet` validation rules, the IP-lookup dataset and its country-centroid mapping, the Cosmos partition key, and the `handledByRegion` provenance field.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `guestbook-entry-submission`: an entry whose location cannot be determined at all is persisted and returned with `lat`/`lng` as `null` (unknown), rather than a `(0, 0)` coordinate.
- `client-ip-location-resolution`: the resolver signals failure with `null` ("unknown") instead of the fixed `(0, 0)` sentinel.
- `frontend-guestbook-entry-form`: browser location is optional — submission is never blocked on it, and coordinates are sent only when the visitor granted access.
- `frontend-guestbook-list`: an entry with no coordinates is displayed as an unknown location instead of a derived country plus coordinates.

## Impact

- **Affected projects**: `HexMaster.Guestbook` (domain model, resolver port, CSV resolver, create handler), `HexMaster.Guestbook.Abstractions` (both DTOs), `HexMaster.Guestbook.Data.CosmosDb` (document shape), `src/Tests/HexMaster.Guestbook.Tests` (domain, handler, resolver tests), `frontend/guestbook` (entry models, `AddGuestbookEntry` + template + styles, `country-lookup`, `GuestbookEntryCard` + template + styles, and their specs).
- **API contract**: response `lat`/`lng` become nullable (see BREAKING above). Request contract unchanged.
- **Stored data**: no migration. Documents written before this change that carry a `(0, 0)` fallback keep it and still read back as a coordinate in the Gulf of Guinea; only entries written from now on record unknown as `null`. Backfilling is possible but not worth it for a demo dataset.
- **No infra-as-code changes**: no Bicep, Front Door, or Cosmos configuration is affected — the partition key and container schema are untouched (Cosmos is schemaless with respect to a newly-nullable property).
