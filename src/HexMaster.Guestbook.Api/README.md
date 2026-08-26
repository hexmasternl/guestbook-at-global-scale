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
- **Fail-safe**: any failure (unparsable/unmapped IP, unknown country code) resolves to
  `null` — "location unknown" — and logs at `Debug`; it never fails the request or API
  startup.

## Location is optional, and "unknown" is a real answer

A greeting's location degrades in three explicit steps, and the last one is honest about
having nothing:

1. **Coordinates the client sent.** Sharing browser location is optional, so the frontend
   only has them when the visitor granted access; the dialog never blocks submission on it.
2. **An approximation from the client's IP address**, via the embedded dataset above.
3. **Unknown.** `lat` and `lng` are stored — and returned by both `POST /greet` and
   `GET /greetings` — as `null`. There is deliberately no substitute coordinate: `(0, 0)`
   is a real place in the Gulf of Guinea, and a fabricated pin there is indistinguishable
   from a genuine one. The frontend renders such an entry as "Location unknown".

`lat`/`lng` must be sent together or not at all — one without the other is a 400 — and the
domain model holds the same both-or-neither invariant.

> Entries written before this behavior existed carry the old `(0, 0)` fallback and still
> read back as a coordinate. They were not backfilled: the whole point of the bug is that
> those rows can't be told apart from real ones.

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
