> **Superseded by `lookup-location-based-on-client-ip` and then `optional-client-gps-location`.**
> `lat`/`lng` are optional on the request (the server falls back to an IP-based
> approximation) and nullable on the response (both `null` means the location is unknown).
> The rest of this requirement still holds.

## ADDED Requirements

### Requirement: Submit a guestbook greeting via POST /greet
The API SHALL expose `POST /greet`, accepting a JSON body with `message` (string), `lat` (number), and `lng` (number), and SHALL create a new guestbook entry persisted in Cosmos DB.

#### Scenario: Valid greeting is accepted and persisted
- **WHEN** a client sends `POST /greet` with a non-empty `message`, a `lat` between -90 and 90, and a `lng` between -180 and 180
- **THEN** the API creates a new guestbook entry with a server-generated `id`, the submitted `message`/`lat`/`lng`, a server-assigned `region`, and a server-assigned UTC `ts`, persists it to the Cosmos DB `entries` container, and returns HTTP 201 Created with the created entry in the response body

#### Scenario: Missing message is rejected
- **WHEN** a client sends `POST /greet` with an empty or missing `message`
- **THEN** the API returns HTTP 400 Bad Request and does not persist any entry

#### Scenario: Out-of-range coordinates are rejected
- **WHEN** a client sends `POST /greet` with `lat` outside [-90, 90] or `lng` outside [-180, 180]
- **THEN** the API returns HTTP 400 Bad Request and does not persist any entry

### Requirement: Region and timestamp are server-assigned
The system SHALL NOT accept `region` or `ts` values from the client request; both SHALL be determined by the server.

#### Scenario: Client-supplied region or timestamp fields are ignored
- **WHEN** a client sends `POST /greet` with extra `region` or `ts` fields in the JSON body
- **THEN** the API ignores those fields and persists the entry using the server-configured region and the current UTC time at the moment of handling

### Requirement: Guestbook entries persist to Azure Cosmos DB via the Aspire client integration
The guestbook entry repository SHALL use the Aspire Azure Cosmos DB client integration (`AddAzureCosmosClient` / `CosmosClient` resolved via dependency injection) to write entries to the `entries` container, and SHALL NOT use connection strings or access keys for any non-emulator (deployed) environment.

#### Scenario: Repository writes using the DI-resolved CosmosClient
- **WHEN** the `CreateGuestbookEntry` command handler executes
- **THEN** it persists the new entry through a repository that depends only on the DI-resolved `CosmosClient` (or an abstraction over it), with no direct instantiation of `CosmosClient` from a raw connection string inside the module or API project

### Requirement: API remains stateless
Handling a `POST /greet` request SHALL NOT rely on any in-memory or server-local state beyond the current request.

#### Scenario: Concurrent requests to different API instances succeed independently
- **WHEN** two `POST /greet` requests are handled by two different, identically-configured instances of the API
- **THEN** both requests succeed independently and neither depends on state held by the other instance
