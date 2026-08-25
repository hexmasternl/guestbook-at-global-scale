# HexMaster.Guestbook.Api

## IP-based location fallback (embedded GeoIp.csv.gz)

`POST /greet` resolves an approximate `lat`/`lng` from the client's IP address when the
request omits coordinates. This uses the `Resources/GeoIp.csv.gz` dataset **embedded in
the `HexMaster.Guestbook` assembly** — no external database, download, license key, or
network call is involved. The dataset is gzip-compressed (~14 MB, well under GitHub's
100 MB file limit) with one row per range: `type,startNum,endNum,CC`.

- **How it works**: at startup, `CsvClientLocationResolver` decompresses and parses the
  embedded dataset once into sorted, in-memory IP-range tables (one for IPv4, one for
  IPv6) and resolves an IP by binary-searching the ranges to an ISO country code, then
  mapping that to a centroid via `CountryCentroids`.
- **Everywhere the same**: because the dataset ships inside the assembly, every
  environment (local `dotnet run`/F5, Aspire, and every deployed region) behaves
  identically with no configuration.
- **Fail-safe**: any failure (unparsable/unmapped IP, unknown country code) resolves to a
  fixed `(0, 0)` sentinel and logs at `Debug`; it never fails the request or API startup.
