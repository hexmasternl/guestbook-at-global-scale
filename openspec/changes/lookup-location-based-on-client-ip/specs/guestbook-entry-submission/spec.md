> **Partly superseded by `optional-client-gps-location`.** The `(0, 0)` sentinel this
> change chose for an unresolvable location has been replaced by nullable `lat`/`lng` —
> both `null` means "unknown" — end to end (domain, Cosmos document, and both API
> responses). Everything else here still holds.

## MODIFIED Requirements

### Requirement: Submit a guestbook greeting via POST /greet
The API SHALL expose `POST /greet`, accepting a JSON body with `message` (string, required), `lat` (number, optional), and `lng` (number, optional), and SHALL create a new guestbook entry persisted in Cosmos DB. When `lat`/`lng` are omitted, the API SHALL resolve an approximate location from the client's IP address instead of rejecting the request.

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
- **THEN** the API resolves an approximate `lat`/`lng` from the client's IP address (via the `client-ip-location-resolution` capability), creates a new guestbook entry using the resolved coordinates, persists it to the Cosmos DB `entries` container, and returns HTTP 201 Created with the created entry (including the resolved `lat`/`lng`) in the response body

#### Scenario: Partial coordinates (only one of lat/lng supplied) are rejected
- **WHEN** a client sends `POST /greet` with only one of `lat` or `lng` present
- **THEN** the API returns HTTP 400 Bad Request and does not persist any entry
