## ADDED Requirements

### Requirement: Resolve an approximate location from a client IP address
The system SHALL provide a `IClientLocationResolver` capable of resolving an approximate `(lat, lng)` for a given client IP address, using an embedded, country-level IP-to-country dataset and a static country-code-to-centroid table, without making any external network call or Cosmos DB read at request time.

#### Scenario: IP resolves to a known country
- **WHEN** the resolver is given a client IP address that maps to a known ISO country code in the embedded dataset
- **THEN** it returns the lat/lng centroid associated with that country code

#### Scenario: IP cannot be mapped to any country
- **WHEN** the resolver is given a client IP address that is private/reserved, unmapped, or otherwise not resolvable to a country
- **THEN** it returns the fixed `(0, 0)` sentinel instead of throwing an exception

#### Scenario: Client IP is null or empty
- **WHEN** the resolver is given a null or empty client IP value
- **THEN** it returns the fixed `(0, 0)` sentinel instead of throwing an exception

### Requirement: Resolution never fails the request
Resolving a location SHALL NOT throw an exception or cause `POST /greet` to fail, regardless of the state of the embedded dataset or the validity of the input IP.

#### Scenario: Underlying geo-IP dataset is missing or unreadable
- **WHEN** the embedded geo-IP database file is missing, corrupt, or fails to load at startup
- **THEN** the resolver logs a warning and subsequently returns the fixed `(0, 0)` sentinel for every lookup, rather than throwing or preventing the API from starting

### Requirement: Client IP is extracted preferring non-spoofable sources
When determining the client IP address to resolve, the system SHALL prefer, in order: the `X-Azure-SocketIP` header, then `X-Azure-ClientIP`, then `X-Forwarded-For`, then the underlying connection's remote IP address.

#### Scenario: Front Door supplies X-Azure-SocketIP
- **WHEN** an incoming request to `POST /greet` includes an `X-Azure-SocketIP` header
- **THEN** the system uses that header's value as the client IP for location resolution, regardless of any other forwarding headers present

#### Scenario: No Front Door headers present
- **WHEN** an incoming request to `POST /greet` has none of `X-Azure-SocketIP`, `X-Azure-ClientIP`, or `X-Forwarded-For`
- **THEN** the system uses the underlying connection's remote IP address as the client IP for location resolution
