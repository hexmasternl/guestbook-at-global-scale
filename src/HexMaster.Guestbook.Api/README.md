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

## Proving which datacenter handled a request (`handledByRegion`)

Every regional Container App is handed its own Azure region as the `Guestbook__Region`
environment variable (`infra/modules/region.bicep`), read by
`ConfigurationGuestbookRegionProvider` and defaulting to `local` outside Azure.

`POST /greet` stamps that value onto the entry as `handledByRegion` before persisting it,
and both `POST /greet` and `GET /greetings` return it — so a greeting carries permanent,
verifiable proof of which datacenter served the write, whichever region you happen to be
reading it back from.

- **Separate from `region`**: `region` is the Cosmos DB partition key. It is seeded from
  the same value today, but partition keys are immutable and the partitioning strategy may
  change (the plan floats `/id`), so provenance gets its own field rather than riding on
  the key.
- **Backward compatible**: documents written before this field existed have no
  `handledByRegion`; the repository falls back to their `region`, which held the same
  value. No migration or backfill needed.
