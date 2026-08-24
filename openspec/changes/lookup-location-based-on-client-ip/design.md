## Context

`POST /greet` currently requires `lat`/`lng` (non-nullable `double`s) and rejects anything outside valid ranges (`GuestbookEntry.Create`, `HexMaster.Guestbook.DomainModels`). The in-progress frontend change (`app-frontend-add-guestbook-entry`) only best-effort prefills coordinates via `navigator.geolocation`; a visitor who denies the browser prompt, uses a device without geolocation, or otherwise fails to get coordinates currently has no valid way to submit a greeting.

This change adds a server-side, IP-based fallback so a missing `lat`/`lng` doesn't block submission. It must comply with:
- ADR 0004/0009 — the resolver is a port (`IClientLocationResolver`) in the `HexMaster.Guestbook` module's `Services/` folder, mirroring the existing `IGuestbookRegionProvider`/`ConfigurationGuestbookRegionProvider` pattern exactly.
- ADR 0005 — the endpoint stays thin; HttpContext/header inspection (client IP extraction) happens at the endpoint layer, not inside the command handler or domain model.
- The demo-app-plan's stateless-API requirement — the resolver's in-memory lookup structure is read-only and rebuilt identically from the same build-time asset on every instance/region; nothing is written to or shared via server-local state across requests.
- `unit-testing-xunit-moq-bogus` — the resolver is mocked in handler/endpoint tests exactly like `IGuestbookRegionProvider` is today; the concrete MaxMind-backed implementation gets its own narrow test using MaxMind's small public-domain test database (see Decision 4).

## Goals / Non-Goals

**Goals:**
- Let a client omit `lat`/`lng` on `POST /greet` and still get a valid entry, with an approximate location resolved server-side from their IP.
- Keep resolution fully local to the running API instance: no external network call and no Cosmos DB read on the request path.
- Keep the persisted schema (`id`, `message`, `lat`, `lng`, `region`, `ts`) unchanged — the fallback is invisible to consumers and to storage.
- Resolve to country-level precision only (IP → ISO country code → static centroid), not city-level.
- Fail safe: if resolution can't determine a country at all (private/reserved/unmapped IP, missing/corrupt dataset), fall back to a fixed `(0, 0)` sentinel rather than rejecting the request or crashing the API.

**Non-Goals:**
- City/street-level precision, or any third-party geo-IP API call at request time.
- Tracking/persisting whether a given entry's location was client-supplied vs. IP-derived (explicitly decided against — no schema change).
- Distinguishing or rejecting spoofed `X-Forwarded-For`/`X-Azure-ClientIP` values — acceptable risk for a cosmetic, non-security-critical demo feature.
- Any Cosmos DB storage of the geo-IP dataset (rejected in favor of an image-embedded asset — see Decision 3).
- Refreshing the geo-IP dataset without a redeploy — refresh happens via image rebuild, which is acceptable for this demo.

## Decisions

### 1. Client IP extraction order, at the endpoint layer
`GuestbookEndpoints.CreateGuestbookEntry` resolves the client IP from (first match wins):
1. `X-Azure-SocketIP` (Front Door's true TCP-socket-derived IP — not influenceable by anything the client sends)
2. `X-Azure-ClientIP`, then `X-Forwarded-For` (last-appended value)
3. `HttpContext.Connection.RemoteIpAddress` (local/dev, no Front Door in front)

This is a small internal helper (e.g. `ClientIpResolver.Resolve(HttpContext)`), not middleware — it runs once per request only inside the `/greet` POST handler, keeping the read endpoint and other routes untouched. The resolved IP (a string, possibly null) is passed into `CreateGuestbookEntryCommand`; header parsing/trust logic never leaks into the command handler or domain model. Alternative considered: `Microsoft.AspNetCore.HttpOverrides.ForwardedHeadersMiddleware` — rejected because it rewrites `RemoteIpAddress`/scheme globally for every route and requires configuring trusted proxies/networks, which is more machinery than this cosmetic, single-endpoint need justifies.

### 2. `IClientLocationResolver` port, mirroring `IGuestbookRegionProvider`
```csharp
// HexMaster.Guestbook/Services/IClientLocationResolver.cs
public interface IClientLocationResolver
{
    (double Lat, double Lng) Resolve(string? clientIp);
}
```
`CreateGuestbookEntryCommandHandler` calls `Resolve(command.ClientIp)` only when `command.Lat`/`command.Lng` are null, then proceeds exactly as today. `CreateGuestbookEntryCommand` gains a `ClientIp` field and `Lat`/`Lng` become `double?`. This keeps the handler's existing shape and test style (mock `IClientLocationResolver` the same way `IGuestbookRegionProvider` is already mocked) instead of introducing a different registration/injection pattern.

### 3. Geo-IP dataset: MaxMind GeoLite2-Country, downloaded and baked into the container image at build time — not committed to git, not stored in Cosmos
- Use MaxMind's free `GeoLite2-Country.mmdb` (country-level; smaller and simpler than `GeoLite2-City`) and the official `MaxMind.GeoIP2`/`MaxMind.Db` NuGet packages to read it.
- The `.mmdb` file (several MB, binary) is **not committed to source control** and **not stored in Cosmos DB** (rejected — Cosmos's 2 MB per-document limit forces chunking/reassembly for no benefit here, and it would add a per-region Cosmos read dependency at startup for an asset that has nothing to do with guestbook data). Instead, the Dockerfile/CI build step downloads it using MaxMind's `geoipupdate` tool (or a direct signed download) authenticated with a `MAXMIND_LICENSE_KEY` build secret, and copies it into the image at a fixed path (e.g. `/app/geoip/GeoLite2-Country.mmdb`).
- This also satisfies MaxMind's license requirement that redistributed copies be refreshed periodically: every image rebuild pulls the current database.
- The API reads the path from configuration (`Guestbook:GeoIp:DatabasePath`), defaulting to the baked-in image path; local Aspire (`dotnet run`/F5) developers point it at a locally-downloaded copy via `appsettings.Development.json`/user secrets, or leave it unset (see Decision 5 for the missing-file behavior).
- Alternative considered: public-domain RIR delegated-extended stats (no license key/account needed) — rejected in favor of MaxMind for this change because it's a purpose-built, well-maintained format with an official .NET reader; can be revisited if the license-key dependency proves inconvenient.

### 4. Country → centroid table: small static, embedded lookup, not a licensed dataset
A `CountryCentroids` static class holds a `IReadOnlyDictionary<string, (double Lat, double Lng)>` keyed by ISO 3166-1 alpha-2 code (~250 entries), sourced from a public-domain country-centroid dataset and hardcoded directly in `HexMaster.Guestbook/Services/CountryCentroids.cs`. Unlike the IP→country data, this table is small and static enough to genuinely live as literal code — no build asset or reader needed.

### 5. Resolver behavior when the database is missing, unreadable, or the IP can't be mapped
`MaxMindClientLocationResolver` loads the `.mmdb` file once at startup (registered as a singleton). If the file is missing/corrupt, or the client IP can't be mapped to a country, or the resolved country code has no centroid entry, `Resolve` returns the fixed `(0, 0)` sentinel rather than throwing — this is a best-effort cosmetic feature, so it must never fail API startup or the `/greet` request. A warning is logged (once at startup for a load failure; per-miss at `Debug` level for lookup misses, to avoid log spam) so the condition is observable without being disruptive.

### 6. Test strategy avoids needing a real MaxMind license in CI
- `CreateGuestbookEntryCommandHandlerTests` and endpoint tests mock `IClientLocationResolver` (Moq), exactly as `IGuestbookRegionProvider` is mocked today — no real `.mmdb` file involved.
- A narrow, separate test for `MaxMindClientLocationResolver` itself uses MaxMind's small, public-domain `GeoIP2-Country-Test.mmdb` (published in MaxMind's open-source test-data repo for exactly this purpose) checked into the test project, so CI never needs a license key or network access.

## Risks / Trade-offs

- [MaxMind license key required to build the production image] → Acceptable one-time setup (free account); stored as a CI/build secret, never committed. Documented in the AppHost/Dockerfile README as part of this change's tasks.
- [Country-level precision means all visitors from a large country cluster at one centroid] → Accepted trade-off per explicit product decision; still visually communicates "this came from a real country."
- [Image rebuild is the only refresh path — no live update between deploys] → Acceptable for a demo; documented as a known limitation, not a defect.
- [VPNs/corporate NAT resolve to the exit node's country, not the visitor's real location] → Acceptable; explicitly decided this is a cosmetic, not security-relevant, feature.
- [`X-Forwarded-For`/`X-Azure-ClientIP` can be influenced by the client] → Explicitly accepted; `X-Azure-SocketIP` is preferred first specifically because it isn't influenceable, but no rejection/validation logic is added for the other headers.
- [Missing/misconfigured dataset path in an environment] → Mitigated by the fail-safe `(0,0)` fallback (Decision 5) — never blocks a submission or crashes the API.

