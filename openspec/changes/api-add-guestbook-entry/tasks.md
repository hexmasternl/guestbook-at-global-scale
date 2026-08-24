## 1. Solution structure — new Abstractions project

- [x] 1.1 Create `src/HexMaster.Guestbook.Abstractions/HexMaster.Guestbook.Abstractions.csproj` (net10.0 class library) and add it to `Guestbook.slnx`.
- [x] 1.2 Add `DataTransferObjects/CreateGuestbookEntryRequest.cs` (`sealed record CreateGuestbookEntryRequest(string Message, double Lat, double Lng)`).
- [x] 1.3 Add `DataTransferObjects/GuestbookEntryDto.cs` (`sealed record GuestbookEntryDto(Guid Id, string Message, double Lat, double Lng, string Region, DateTimeOffset Ts)`).
- [x] 1.4 Add project reference from `HexMaster.Guestbook.Api` and `HexMaster.Guestbook` to `HexMaster.Guestbook.Abstractions`.

## 2. Core CQRS abstractions

- [x] 2.1 Check whether a shared `Core` project with `ICommandHandler<TCommand, TResult>` / `ICommandHandler<TCommand>` / `IQueryHandler<TQuery, TResult>` exists; if not, add `src/Core/HexMaster.Guestbook.Core` with these interfaces per ADR 0004, and reference it from `HexMaster.Guestbook`.

## 3. Domain model (HexMaster.Guestbook)

- [x] 3.1 Add `DomainModels/GuestbookEntry.cs` with a private constructor and a `Create(string message, double lat, double lng, string region)` factory that validates: `message` non-empty and within a max length (e.g. 280 chars), `lat` in [-90, 90], `lng` in [-180, 180]; throws `DomainException` on violation. Sets `Id` (new `Guid`) and `Ts` (`DateTimeOffset.UtcNow`) internally.
- [x] 3.2 Add `IGuestbookEntryRepository.cs` at the module root with `Task AddAsync(GuestbookEntry entry, CancellationToken ct)`.
- [x] 3.3 Add `Services/IGuestbookRegionProvider.cs` with `string GetCurrentRegion()`, sourcing the value from configuration (e.g. `Guestbook:Region`, default `"local"` for the emulator/dev scenario).

## 4. Feature slice: CreateGuestbookEntry

- [x] 4.1 Add `Features/CreateGuestbookEntry/CreateGuestbookEntryCommand.cs` (`sealed record CreateGuestbookEntryCommand(string Message, double Lat, double Lng)`) and `CreateGuestbookEntryResult.cs` (`sealed record CreateGuestbookEntryResult(Guid Id, string Message, double Lat, double Lng, string Region, DateTimeOffset Ts)`).
- [x] 4.2 Add `Features/CreateGuestbookEntry/CreateGuestbookEntryCommandHandler.cs` implementing `ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult>`: resolves region via `IGuestbookRegionProvider`, calls `GuestbookEntry.Create(...)`, persists via `IGuestbookEntryRepository.AddAsync`, logs creation, returns the result.
- [x] 4.3 Add `GuestbookModuleRegistration.cs` with `AddGuestbookModule(this IServiceCollection services)` registering the command handler and `IGuestbookRegionProvider` implementation.

## 5. Cosmos DB persistence adapter (HexMaster.Guestbook.Data.CosmosDb)

- [x] 5.1 Add the `Aspire.Microsoft.Azure.Cosmos` NuGet package reference to `HexMaster.Guestbook.Data.CosmosDb.csproj`.
- [x] 5.2 Add a reference from `HexMaster.Guestbook.Data.CosmosDb` to `HexMaster.Guestbook` (to implement `IGuestbookEntryRepository`).
- [x] 5.3 Add `GuestbookEntryDocument.cs` — the flat Cosmos JSON shape (`id`, `message`, `lat`, `lng`, `region`, `ts`). Implemented with **Newtonsoft.Json** `[JsonProperty]` attributes (not `System.Text.Json`), since the Cosmos SDK's default `CosmosClient` serializer is Newtonsoft-based and ignores `System.Text.Json` attributes — confirmed via a live emulator write that initially failed with a missing-`id` error until switched.
- [x] 5.4 Add `CosmosGuestbookEntryRepository.cs` implementing `IGuestbookEntryRepository`, depending on a DI-resolved `CosmosClient` (from `Aspire.Microsoft.Azure.Cosmos`) plus configured database/container names, mapping `GuestbookEntry` ↔ `GuestbookEntryDocument`, and calling `container.CreateItemAsync(...)` with `PartitionKey(document.Region)`.
- [x] 5.5 Add a `CosmosDbRegistration.cs` extension (`AddGuestbookCosmosDb(this IServiceCollection services, IConfiguration configuration)`) registering `IGuestbookEntryRepository` → `CosmosGuestbookEntryRepository`, and reading database/container names from configuration (defaults: `guestbook` / `entries`).

## 6. API endpoint (HexMaster.Guestbook.Api)

- [x] 6.1 Add `Endpoints/GuestbookEndpoints.cs` with `MapGuestbookEndpoints(this IEndpointRouteBuilder app)`: `POST /greet` maps `CreateGuestbookEntryRequest` → `CreateGuestbookEntryCommand`, invokes the handler, and returns `Results.Created($"/greetings/{result.Id}", ...)` mapped to `GuestbookEntryDto`.
- [x] 6.2 Add shallow request validation (endpoint filter or inline check) for missing/empty `Message` and out-of-range `Lat`/`Lng`, returning `Results.ValidationProblem(...)` (400) before invoking the handler.
- [x] 6.3 Update `Program.cs`: remove the template `/weatherforecast` sample code, call `builder.Services.AddGuestbookModule()` and `builder.Services.AddGuestbookCosmosDb(builder.Configuration)`, call `app.MapGuestbookEndpoints()`.
- [x] 6.4 Add `AddAzureCosmosClient` wiring in `Program.cs` (or in `AddGuestbookCosmosDb`) using the Aspire-injected connection name (e.g. `builder.AddAzureCosmosClient("guestbook-cosmos")`), matching the name used in the AppHost.

## 7. Aspire AppHost wiring

- [x] 7.1 Add the `Aspire.Hosting.Azure.CosmosDB` NuGet package reference to `HexMaster.Guestbook.Aspire.AppHost.csproj`.
- [x] 7.2 In `AppHost.cs`, add `var cosmos = builder.AddAzureCosmosDB("guestbook-cosmos").RunAsEmulator(emulator => emulator.WithDataVolume());`, then `var db = cosmos.AddCosmosDatabase("guestbook", databaseName: "guestbook"); var entries = db.AddContainer("entries", "/region");`.
- [x] 7.3 Update the API project registration to `.WithReference(cosmos)`.

## 8. Tests (HexMaster.Guestbook.Tests)

- [x] 8.1 Add `xunit`, `Moq`, and `Bogus` package references to `HexMaster.Guestbook.Tests.csproj` if not already present; add a project reference to `HexMaster.Guestbook`.
- [x] 8.2 Add `DomainModels/GuestbookEntryTests.cs`: valid creation succeeds; empty/too-long message throws `DomainException`; out-of-range lat/lng throws `DomainException`.
- [x] 8.3 Add `CreateGuestbookEntry/CreateGuestbookEntryCommandHandlerTests.cs` using `Mock<IGuestbookEntryRepository>` and `Mock<IGuestbookRegionProvider>`: valid command persists an entry and returns the expected result; repository `AddAsync` is invoked exactly once; invalid command (empty message) throws before persistence is attempted.
- [x] 8.4 Add a `Factories/GuestbookEntryFaker.cs` using Bogus for generating valid test messages/coordinates with a deterministic seed where assertions depend on generated values.

## 9. Verification

- [x] 9.1 Run `dotnet build` on `Guestbook.slnx` and confirm it succeeds with the new project included.
- [x] 9.2 Run `dotnet test` and confirm all new tests pass. (10/10 passed)
- [x] 9.3 Start the AppHost (`dotnet run --project src/Aspire/HexMaster.Guestbook.Aspire/HexMaster.Guestbook.Aspire.AppHost`) and confirm the Cosmos DB emulator resource and API both report healthy, then exercise `POST /greet` (e.g. via the `.http` file or curl) and confirm a 201 response with the persisted entry. Verified live: emulator, database, container, and API all reported Healthy; `POST /greet` with valid input returned 201 with the persisted entry; invalid input (empty message, out-of-range lat) returned 400 with validation errors.
