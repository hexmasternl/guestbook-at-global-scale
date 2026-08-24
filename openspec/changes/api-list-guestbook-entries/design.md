## Context

`HexMaster.Guestbook.Api` currently exposes only `POST /greet` (see the `api-add-guestbook-entry` change). `IGuestbookEntryRepository` has a single `AddAsync` method, and the `entries` Cosmos DB container (partition key `/region`) already holds documents shaped `{ id, message, lat, lng, region, ts }`. This change adds the read side, `GET /greetings`, so the frontend can render existing pins.

This must comply with:
- ADR 0004 (custom CQRS) and ADR 0009 (feature-slices) — a `ListGuestbookEntries` query + handler in `Features/ListGuestbookEntries/`.
- ADR 0005 (Minimal APIs) — a thin `GET /greetings` endpoint delegating to the handler.
- The demo-app-plan's stateless API requirement — pagination state must not live in server memory; it must be fully expressed by request/response data (an opaque continuation token).
- Multi-region reads: the `entries` container is partitioned by `/region`, but a global "all greetings, newest first" listing is a cross-partition query by design (visitors in any region should see pins from all regions). This is acceptable for the demo scale; see Risks.

## Goals / Non-Goals

**Goals:**
- Implement `GET /greetings?pageSize=&continuationToken=` end-to-end: query params → query → Cosmos DB paged read → response DTO with pagination metadata.
- Default `pageSize` is 50; allowed range is 10–250 inclusive.
- Entries are sorted newest-first (`ts` descending).
- Pagination is continuation-token based (opaque, Cosmos-native), not skip/take or page-number based, per explicit decision — no total count/total pages are returned.
- Keep the API stateless: the continuation token is the only piece of paging state, and it round-trips through the client.

**Non-Goals:**
- Filtering by region, date range, or message content — out of scope; only the full newest-first listing is implemented.
- Live/streaming updates (SSE/polling) to the map — a separate future change per `storyline/demo-app-plan.md`.
- Total entry count or "page N of M" UI affordances — deliberately excluded by the continuation-token approach (see the pagination decision below).
- Changes to the `entries` container's partition key or indexing policy.

## Decisions

### 1. Continuation-token pagination, not page-number pagination
The Cosmos DB SDK natively supports opaque continuation tokens via `FeedIterator` (`ReadNextAsync` and `ContinuationToken`). Using this directly avoids an extra `COUNT` query (extra RU cost) to compute a total, and scales correctly as the entries collection grows across multiple write regions. The trade-off (no total count, no jump-to-page-N) was confirmed with the user as acceptable for this demo. Alternative considered — page-number (`pageNumber`/`pageSize`, with `totalCount`) — rejected because it requires a separate count query on every request and doesn't map cleanly onto Cosmos's cursor-based feed API.

### 2. `pageSize` validation: clamp, don't reject, for out-of-range values
- If `pageSize` is absent → default `50`.
- If `pageSize` is present but not a positive integer (e.g. non-numeric, zero, negative) → `400` via shallow validation (consistent with the existing `POST /greet` shallow-validation style).
- If `pageSize` is a positive integer outside `[10, 250]` → **clamp** to the nearest bound (e.g. `5` → `10`, `1000` → `250`) rather than reject. This keeps the endpoint forgiving for a frontend that hasn't been built yet, while still enforcing the plan's stated bounds server-side (the API is the source of truth, since the frontend is explicitly "not existing yet").

### 3. `continuationToken` is opaque and untouched
The API receives a `continuationToken` string, passes it straight to `Container.GetItemQueryIterator<T>(..., continuationToken: token, ...)`, and returns whatever the SDK/`FeedIterator` gives back as the next token. The API does not decode, parse, or validate its contents beyond "is it present"; the Cosmos SDK is the sole owner of the token's format. If the SDK rejects an invalid/expired token, that surfaces as an unhandled `CosmosException` for now (see Risks) — no custom retry/refresh logic is added in this change.

### 4. Query shape
```csharp
var query = new QueryDefinition("SELECT * FROM c ORDER BY c.ts DESC");
using var iterator = _container.GetItemQueryIterator<GuestbookEntryDocument>(
    query,
    continuationToken: request.ContinuationToken,
    requestOptions: new QueryRequestOptions { MaxItemCount = request.PageSize });

var page = await iterator.ReadNextAsync(ct);
var nextToken = iterator.HasMoreResults ? page.ContinuationToken : null;
```
This is a cross-partition query (no `PartitionKey` set) because listing must span all regions. `ORDER BY c.ts DESC` requires a composite/range index on `ts`, which Cosmos DB provides by default for a scalar field (no custom indexing policy change needed).

### 5. Repository contract extension
`IGuestbookEntryRepository` gains:
```csharp
Task<GuestbookEntryPage> ListAsync(int pageSize, string? continuationToken, CancellationToken ct);
```
where `GuestbookEntryPage` (a new internal module-level type, not a DTO) wraps `IReadOnlyList<GuestbookEntry>` and the next `string? ContinuationToken`. This keeps the Cosmos-specific continuation-token type (a `string`) out of the domain model itself while still letting the handler pass it straight through to the response DTO.

### 6. Response DTO shape
`ListGuestbookEntriesResponse(IReadOnlyList<GuestbookEntryDto> Entries, string? ContinuationToken)` in `HexMaster.Guestbook.Abstractions.DataTransferObjects`. `ContinuationToken` is `null` when there are no more pages, so the frontend's paging loop can stop by checking for `null`/absence rather than parsing an empty string.

## Risks / Trade-offs

- [No total count means the frontend can't show "page 3 of 12" or jump to an arbitrary page] → Accepted trade-off per the user's explicit choice of cursor-based pagination; revisit only if a future UX requirement needs it.
- [Cross-partition `ORDER BY` query is more expensive (RU-wise) than a single-partition query] → Acceptable at demo scale; the container's default indexing policy already indexes `ts` for range queries, so no schema change is needed.
- [An invalid/expired/tampered `continuationToken` from the client causes an unhandled Cosmos SDK exception] → Acceptable for this change; a global exception-to-`400` mapping is a candidate for a future cross-cutting change, not introduced here to keep this change additive and focused.
- [Clamping out-of-range `pageSize` instead of rejecting could silently surprise a caller who typos a large number] → Accepted: the response always reflects the actual page size used implicitly via `Entries.Count`, so the behavior is observable, not silent data loss.

## Migration Plan

Purely additive: new query/handler, new endpoint, new repository method, new response DTO. No existing data, container schema, or contracts change. Rollback is reverting the commit.

## Open Questions

- None blocking implementation.
