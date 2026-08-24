## Why

`POST /greet` currently requires the client to supply `lat`/`lng`, and the frontend only *best-effort* prefills those from `navigator.geolocation` (a visitor can deny the browser permission, be on a device without it, or the frontend could otherwise fail to obtain coordinates). When that happens today, there is no way to submit a valid greeting at all, or a client would have to send a fabricated `(0,0)`-style value that isn't actually "unknown." The API should be able to approximate a visitor's location server-side, from their IP address, whenever the client doesn't supply exact coordinates — keeping the "say hi from —" map experience working for everyone.

## What Changes

- Make `lat`/`lng` optional on `POST /greet` (`CreateGuestbookEntryRequest.Lat`/`Lng` become nullable); shallow range validation in the endpoint only applies when a value is present.
- Add a new `IClientLocationResolver` service (mirroring the existing `IGuestbookRegionProvider` pattern) that, given a client IP address, resolves an approximate `(lat, lng)` via: IP → ISO country code → static country-centroid lookup.
- Add an embedded, country-level IP-to-country dataset baked into the `HexMaster.Guestbook.Data` (or equivalent) project as a build asset, loaded once into an in-memory lookup structure at API startup — no external network call or Cosmos DB dependency at request time.
- Add a small static ISO-3166 country-code → centroid lat/lng table (embedded in code).
- Extract the client IP at the endpoint layer (preferring Front Door's `X-Azure-SocketIP`, then `X-Azure-ClientIP`/`X-Forwarded-For`, then `HttpContext.Connection.RemoteIpAddress` for local/non-Front-Door scenarios) and pass it through `CreateGuestbookEntryCommand` for the handler to resolve when `Lat`/`Lng` are absent.
- When IP-based resolution cannot determine a country (private/reserved/unmapped IP) and the client also omitted coordinates, fall back to a fixed `(0, 0)` sentinel rather than rejecting the request.
- No schema change: the persisted `GuestbookEntry`/document shape (`id`, `message`, `lat`, `lng`, `region`, `ts`) stays exactly as-is; the fallback is invisible to the schema and to API consumers.
- **BREAKING**: none for existing callers — `lat`/`lng` become optional (a strict superset of previously-accepted requests); requests that already sent both fields behave identically.

## Capabilities

### New Capabilities
- `client-ip-location-resolution`: Resolving an approximate `(lat, lng)` from a client's IP address (via an embedded, country-level IP→country dataset and a country→centroid table), including the fixed-sentinel fallback when resolution fails entirely.

### Modified Capabilities
- `guestbook-entry-submission`: `POST /greet` no longer requires `lat`/`lng` in the request body; when omitted, the server resolves an approximate location from the client's IP (via `client-ip-location-resolution`) instead of rejecting the request.

## Impact

- **Affected projects**: `HexMaster.Guestbook.Api` (nullable request DTO, shallow validation changes, client-IP extraction at the endpoint, `Program.cs`/DI wiring for the new resolver), `HexMaster.Guestbook` (command/handler changes to call the resolver when coordinates are absent, new `Services/IClientLocationResolver` port), a new or existing infrastructure-adjacent project holding the embedded IP→country dataset and its reader, `HexMaster.Guestbook.Abstractions` (`CreateGuestbookEntryRequest.Lat`/`Lng` become `double?`), `src/Tests/HexMaster.Guestbook.Tests` (resolver unit tests, updated handler/endpoint tests for the optional-coordinates paths).
- **New dependencies**: an embedded geo-IP dataset (format/source to be finalized in design.md) shipped as a build asset inside the API container image; no new Azure resources, no new third-party network calls at request time.
- **No infra-as-code changes**: purely an application-layer addition; no Bicep/Terraform, Front Door, or Cosmos DB configuration changes.
- **API stays stateless**: the in-memory lookup structure is read-only, process-local, and rebuilt identically on every instance/region from the same embedded asset — no shared or divergent server-local state across requests or instances.
