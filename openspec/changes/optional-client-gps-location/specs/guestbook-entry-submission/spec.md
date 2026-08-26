## MODIFIED Requirements

### Requirement: Submit a guestbook greeting via POST /greet
The API SHALL expose `POST /greet`, accepting a JSON body with `message` (string, required), `lat` (number, optional), and `lng` (number, optional), and SHALL create a new guestbook entry persisted in Cosmos DB. When `lat`/`lng` are omitted, the API SHALL resolve an approximate location from the client's IP address; when that resolution also yields nothing, the entry SHALL be persisted with an unknown location rather than a fabricated coordinate.

#### Scenario: Valid greeting with coordinates is accepted and persisted
- **WHEN** a client sends `POST /greet` with a non-empty `message`, a `lat` between -90 and 90, and a `lng` between -180 and 180
- **THEN** the API creates a new guestbook entry with a server-generated `id`, the submitted `message`/`lat`/`lng`, a server-assigned `region`, and a server-assigned UTC `ts`, persists it to the Cosmos DB `entries` container, and returns HTTP 201 Created with the created entry in the response body

#### Scenario: Missing message is rejected
- **WHEN** a client sends `POST /greet` with an empty or missing `message`
- **THEN** the API returns HTTP 400 Bad Request and does not persist any entry

#### Scenario: Out-of-range coordinates are rejected
- **WHEN** a client sends `POST /greet` with a `lat` outside [-90, 90] or a `lng` outside [-180, 180]
- **THEN** the API returns HTTP 400 Bad Request and does not persist any entry

#### Scenario: Omitted coordinates are resolved from the client's IP address
- **WHEN** a client sends `POST /greet` with a non-empty `message` and omits both `lat` and `lng`
- **THEN** the API resolves an approximate `lat`/`lng` from the client's IP address (via the `client-ip-location-resolution` capability), creates a new guestbook entry using the resolved coordinates, persists it, and returns HTTP 201 Created with the created entry (including the resolved `lat`/`lng`) in the response body

#### Scenario: Entry is stored with an unknown location when no location can be determined
- **WHEN** a client sends `POST /greet` with a non-empty `message`, omits both `lat` and `lng`, and the client's IP address cannot be resolved to a location
- **THEN** the API creates and persists the entry with its location recorded as unknown — `lat` and `lng` both stored as null, never as a substitute coordinate such as `(0, 0)` — and returns HTTP 201 Created with `lat` and `lng` as `null` in the response body

#### Scenario: Partial coordinates (only one of lat/lng supplied) are rejected
- **WHEN** a client sends `POST /greet` with only one of `lat` or `lng` present
- **THEN** the API returns HTTP 400 Bad Request and does not persist any entry

### Requirement: A guestbook entry's coordinates are present together or not at all
A persisted guestbook entry SHALL either carry both a latitude and a longitude, or neither (an unknown location). The domain model SHALL reject an entry created with exactly one of the two, and SHALL treat a stored entry that carries only one of the two as having an unknown location.

#### Scenario: Creating an entry with one coordinate is rejected
- **WHEN** an entry is created with a latitude but no longitude, or vice versa
- **THEN** creation fails with a domain error and nothing is persisted

#### Scenario: Reading back a half-present coordinate pair
- **WHEN** a stored entry is read back carrying only one of latitude/longitude
- **THEN** it is presented as having an unknown location, and reading the surrounding page of entries still succeeds

### Requirement: Guestbook entries are returned with a nullable location
`GET /greetings` and `POST /greet` SHALL return each entry's `lat` and `lng` as nullable numbers, where `null` for both means the entry's location is unknown.

#### Scenario: A listed entry has an unknown location
- **WHEN** a client lists entries and one of them was persisted with an unknown location
- **THEN** that entry is returned with `lat` and `lng` set to `null`, alongside its `id`, `message`, `region`, `handledByRegion`, and `ts`
