## 1. Abstractions — response DTO

- [x] 1.1 Add `DataTransferObjects/ListGuestbookEntriesResponse.cs` in `HexMaster.Guestbook.Abstractions` (`sealed record ListGuestbookEntriesResponse(IReadOnlyList<GuestbookEntryDto> Entries, string? ContinuationToken)`).

## 2. Domain / repository contract (HexMaster.Guestbook)

- [x] 2.1 Add `GuestbookEntryPage.cs` (module-level, not a DTO) at the module root: `sealed record GuestbookEntryPage(IReadOnlyList<GuestbookEntry> Entries, string? ContinuationToken)`.
- [x] 2.2 Extend `IGuestbookEntryRepository` with `Task<GuestbookEntryPage> ListAsync(int pageSize, string? continuationToken, CancellationToken ct);`.

## 3. Feature slice: ListGuestbookEntries

- [x] 3.1 Add `Features/ListGuestbookEntries/ListGuestbookEntriesQuery.cs` (`sealed record ListGuestbookEntriesQuery(int PageSize, string? ContinuationToken)`).
- [x] 3.2 Add `Features/ListGuestbookEntries/ListGuestbookEntriesResult.cs` (`sealed record ListGuestbookEntriesResult(IReadOnlyList<GuestbookEntry> Entries, string? ContinuationToken)`).
- [x] 3.3 Add `Features/ListGuestbookEntries/ListGuestbookEntriesQueryHandler.cs` implementing `IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult>`: calls `IGuestbookEntryRepository.ListAsync(query.PageSize, query.ContinuationToken, ct)` and maps `GuestbookEntryPage` to `ListGuestbookEntriesResult`.
- [x] 3.4 Register `IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult>` → `ListGuestbookEntriesQueryHandler` in `GuestbookModuleRegistration.AddGuestbookModule`.

## 4. Cosmos DB persistence adapter (HexMaster.Guestbook.Data.CosmosDb)

- [x] 4.1 Implement `CosmosGuestbookEntryRepository.ListAsync(pageSize, continuationToken, ct)`: build a `QueryDefinition("SELECT * FROM c ORDER BY c.ts DESC")`, call `_container.GetItemQueryIterator<GuestbookEntryDocument>(query, continuationToken, new QueryRequestOptions { MaxItemCount = pageSize })`, call `ReadNextAsync(ct)` once, map each `GuestbookEntryDocument` back to a `GuestbookEntry`, and return a `GuestbookEntryPage` with the mapped list and `iterator.HasMoreResults ? page.ContinuationToken : null`.
- [x] 4.2 Add a private/internal mapping helper to reconstruct a `GuestbookEntry` from a `GuestbookEntryDocument` (parse `Id` back to `Guid`), mirroring the existing document→domain shape used for `AddAsync`.

## 5. API endpoint (HexMaster.Guestbook.Api)

- [x] 5.1 In `Endpoints/GuestbookEndpoints.cs`, add `GET /greetings` (own route, sibling to the `/greet` group) mapping to a new `ListGuestbookEntries` handler method.
- [x] 5.2 Implement shallow validation: if `pageSize` is supplied and is not a positive integer, return `Results.ValidationProblem(...)` (400); otherwise clamp the effective page size into `[10, 250]`, defaulting to `50` when `pageSize` is absent.
- [x] 5.3 Bind `continuationToken` as an optional string query parameter, pass through unmodified to the query.
- [x] 5.4 Dispatch `ListGuestbookEntriesQuery` via `IQueryHandler<ListGuestbookEntriesQuery, ListGuestbookEntriesResult>`, map each `GuestbookEntry` to `GuestbookEntryDto`, wrap in `ListGuestbookEntriesResponse`, and return `Results.Ok(response)`.
- [x] 5.5 Add `.WithName("ListGuestbookEntries")`, `.Produces<ListGuestbookEntriesResponse>(StatusCodes.Status200OK)`, `.ProducesValidationProblem()` metadata to the new endpoint.
- [x] 5.6 Confirm `Program.cs` already calls `app.MapGuestbookEndpoints()` (no change expected — the new route is added inside the existing extension method).

## 6. Tests (HexMaster.Guestbook.Tests)

- [x] 6.1 Add `ListGuestbookEntries/ListGuestbookEntriesQueryHandlerTests.cs` using `Mock<IGuestbookEntryRepository>`: verifies the handler passes `PageSize`/`ContinuationToken` through to `ListAsync`, and maps the returned `GuestbookEntryPage` into `ListGuestbookEntriesResult` correctly (entries and continuation token).
- [x] 6.2 Extend `Factories/GuestbookEntryFaker.cs` (or add a helper) to generate multiple `GuestbookEntry` instances with distinct `Ts` values for list-ordering assertions.
- [x] 6.3 Add endpoint-level tests (or extend existing `GuestbookEndpoints` test coverage if present) for: default page size (no `pageSize` param), clamping below 10, clamping above 250, and `400` on non-numeric/non-positive `pageSize`.

## 7. Verification

- [x] 7.1 Run `dotnet build` on `Guestbook.slnx` and confirm it succeeds.
- [x] 7.2 Run `dotnet test` and confirm all new and existing tests pass.
- [x] 7.3 Start the AppHost, seed at least one entry via `POST /greet`, then call `GET /greetings` (and `GET /greetings?pageSize=10`) and confirm a `200` response with the expected entries, newest-first, and a `continuationToken` behaving as designed when more than one page of data exists.
