## 1. Abstractions & command shape

- [x] 1.1 Change `CreateGuestbookEntryRequest` (`HexMaster.Guestbook.Abstractions/DataTransferObjects`) to `sealed record CreateGuestbookEntryRequest(string Message, double? Lat, double? Lng)`.
- [x] 1.2 Change `CreateGuestbookEntryCommand` (`HexMaster.Guestbook/Features/CreateGuestbookEntry`) to `sealed record CreateGuestbookEntryCommand(string Message, double? Lat, double? Lng, string? ClientIp)`. `CreateGuestbookEntryResult`/`GuestbookEntryDto` stay unchanged (they always carry a resolved, non-null `lat`/`lng`).

## 2. Country centroid table

- [x] 2.1 Add `HexMaster.Guestbook/Services/CountryCentroids.cs`: a static, read-only `IReadOnlyDictionary<string, (double Lat, double Lng)>` keyed by ISO 3166-1 alpha-2 country code, populated from a public-domain country-centroid dataset (~250 entries), plus a lookup helper that returns `null` for an unknown code.

## 3. Client location resolver port and centroid-only implementation path

- [x] 3.1 Add `HexMaster.Guestbook/Services/IClientLocationResolver.cs`: `public interface IClientLocationResolver { (double Lat, double Lng) Resolve(string? clientIp); }`.
- [x] 3.2 Update `CreateGuestbookEntryCommandHandler` to call `clientLocationResolver.Resolve(command.ClientIp)` when `command.Lat`/`command.Lng` are null, otherwise use the supplied values, then proceed exactly as today (region resolution, `GuestbookEntry.Create`, persistence, logging).
- [x] 3.3 Register `IClientLocationResolver` in `GuestbookModuleRegistration.cs`.

## 4. MaxMind-backed resolver implementation

- [x] 4.1 Add the `MaxMind.GeoIP2` NuGet package reference to `HexMaster.Guestbook` (or a new small adapter project if the module project shouldn't take a direct MaxMind dependency — follow existing project reference conventions).
- [x] 4.2 Add `Services/MaxMindClientLocationResolver.cs` implementing `IClientLocationResolver`: loads a `DatabaseReader` once (singleton) from a configured file path (`Guestbook:GeoIp:DatabasePath`); on `Resolve`, parses `clientIp`, looks up the country via the reader, maps the ISO code through `CountryCentroids`, and returns `(0, 0)` for any failure (null/empty IP, parse failure, lookup miss, missing centroid, or a database that failed to load) — never throws.
- [x] 4.3 Log a warning once at startup if the configured database file is missing/unreadable, and log lookup misses at `Debug` level (not `Warning`/`Error`, to avoid log spam from ordinary private/local IPs).
- [x] 4.4 Register `MaxMindClientLocationResolver` as the `IClientLocationResolver` implementation in `GuestbookModuleRegistration.cs`, reading `Guestbook:GeoIp:DatabasePath` from configuration.

## 5. Client IP extraction at the endpoint layer

- [x] 5.1 Add `HexMaster.Guestbook.Api/ClientIpResolver.cs` (or similar) with a `Resolve(HttpContext)` helper that returns the first present value among: `X-Azure-SocketIP` header, `X-Azure-ClientIP` header, `X-Forwarded-For` header (last value), `HttpContext.Connection.RemoteIpAddress`.
- [x] 5.2 Update `GuestbookEndpoints.CreateGuestbookEntry` to accept `HttpContext` as a parameter, resolve the client IP via `ClientIpResolver`, and pass it into `CreateGuestbookEntryCommand`.
- [x] 5.3 Update the endpoint's shallow validation: `lat`/`lng` range checks only run when the corresponding value is present; add a validation error when exactly one of `lat`/`lng` is supplied (partial coordinates rejected).

## 6. Container image / build asset for the GeoLite2 database

- [x] 6.1 Update the API project's Dockerfile (or add one if not present) with a build stage that downloads `GeoLite2-Country.mmdb` via `geoipupdate` (or a direct signed MaxMind download), authenticated with a `MAXMIND_LICENSE_KEY` build secret, and copies it to a fixed path in the final image (e.g. `/app/geoip/GeoLite2-Country.mmdb`).
- [x] 6.2 Set the default value of `Guestbook:GeoIp:DatabasePath` in `appsettings.json` to the image path from 6.1; document (README or code comment) how a local Aspire/`dotnet run` developer points it at a locally-downloaded copy instead.
- [x] 6.3 Add `MAXMIND_LICENSE_KEY` to the repo's documented CI/build secrets (do not commit the key or the downloaded `.mmdb` file).

## 7. Tests

- [x] 7.1 Add `Services/CountryCentroidsTests.cs`: known codes resolve to expected coordinates; unknown code returns `null`.
- [x] 7.2 Add a small public-domain `GeoIP2-Country-Test.mmdb` (from MaxMind's open-source test-data repo) to the test project, and add `Services/MaxMindClientLocationResolverTests.cs` covering: known test IP resolves to its expected country's centroid; private/reserved IP returns `(0, 0)`; null/empty IP returns `(0, 0)`; missing database file at construction falls back to always returning `(0, 0)` without throwing.
- [x] 7.3 Update `CreateGuestbookEntryCommandHandlerTests.cs` to mock `IClientLocationResolver` (Moq): command with both `Lat`/`Lng` present does not call the resolver; command with both null calls `Resolve` and uses its result in the persisted entry.
- [x] 7.4 Add/update endpoint-level tests (or shallow-validation unit tests) for: omitted `lat`/`lng` is accepted (200/201, not a validation error); exactly one of `lat`/`lng` present is rejected (400); out-of-range values when present are still rejected (400).

## 8. Verification

- [x] 8.1 Run `dotnet build` on `Guestbook.slnx` and confirm it succeeds.
- [x] 8.2 Run `dotnet test` and confirm all new and existing tests pass.
- [x] 8.3 Start the AppHost, exercise `POST /greet` with `lat`/`lng` omitted (e.g. via the `.http` file or curl from a local/dev IP) and confirm a 201 response containing a resolved `lat`/`lng` (falling back to `(0, 0)` for a local loopback IP, since it isn't a real public country IP), and confirm existing requests that still send `lat`/`lng` behave exactly as before.
