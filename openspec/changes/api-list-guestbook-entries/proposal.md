## Why

`storyline/demo-app-plan.md` requires a read side (`GET /greetings`) so the map/frontend can render pins for existing guestbook entries. Today only `POST /greet` exists (write side); there is no way to retrieve stored entries. This change adds the first read capability, with pagination so the frontend can page through a potentially large, ever-growing, multi-region set of entries without loading everything at once.

## What Changes

- Add a `GET /greetings` Minimal API endpoint on `HexMaster.Guestbook.Api` that lists guestbook entries, newest first (sorted by `ts` descending), returning a page of `GuestbookEntryDto` records plus pagination metadata.
- Support a `pageSize` query parameter: default `50`, minimum `10`, maximum `250`; values outside this range are clamped (shallow validation returns `400` only for a non-numeric/negative value, not for out-of-range values which are clamped) — see design.md for the exact rule.
- Support an opaque `continuationToken` query parameter for requesting the next page; the API returns a `continuationToken` in the response when more entries are available (`null`/absent when the last page is reached). This uses Cosmos DB's native continuation-token pagination rather than skip/take, avoiding an expensive `COUNT` query and staying efficient as the dataset grows.
- Add a `ListGuestbookEntries` feature slice (query + handler) in `HexMaster.Guestbook`, following ADR 0009 feature-slices structure.
- Add `IGuestbookEntryRepository.ListAsync(...)` to the existing repository port, plus a Cosmos DB implementation querying the `entries` container ordered by `ts DESC` using the SDK's continuation-token support.
- Add `ListGuestbookEntriesResponse` (containing the page of `GuestbookEntryDto` and the next `continuationToken`) to `HexMaster.Guestbook.Abstractions.DataTransferObjects`.
- Add unit tests for the query handler and shallow request validation (xUnit + Moq + Bogus), per the `unit-testing-xunit-moq-bogus` recommendation.
- **BREAKING**: none — this is a net-new read endpoint; no existing contract changes. `IGuestbookEntryRepository` gains a new method, which is additive.

## Capabilities

### New Capabilities
- `guestbook-entry-listing`: Listing persisted guestbook entries via `GET /greetings`, newest-first, with continuation-token-based pagination (default page size 50, min 10, max 250).

### Modified Capabilities
(none — `guestbook-entry-submission` requirements are unchanged; this change only adds a new read path alongside it)

## Impact

- **Affected projects**: `HexMaster.Guestbook.Api` (new endpoint), `HexMaster.Guestbook` (query + handler, repository port extension), `HexMaster.Guestbook.Data.CosmosDb` (repository implementation), `HexMaster.Guestbook.Abstractions` (new response DTO), `src/Tests/HexMaster.Guestbook.Tests` (handler tests).
- **No new projects or NuGet dependencies** — reuses the existing `Aspire.Microsoft.Azure.Cosmos`-backed `CosmosClient` and `entries` container already wired for `POST /greet`.
- **No infra-as-code or AppHost changes** — the container and its `/region` partition key already exist from the previous change.
- **API stays stateless**: pagination state lives entirely in the opaque continuation token returned to and passed back by the client; no server-local session/cache state is introduced.
