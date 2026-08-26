## MODIFIED Requirements

### Requirement: Resolve an approximate location from a client IP address
The system SHALL provide a `IClientLocationResolver` capable of resolving an approximate `(lat, lng)` for a given client IP address, using an embedded, country-level IP-to-country dataset and a static country-code-to-centroid table, without making any external network call or Cosmos DB read at request time. When no location can be determined, the resolver SHALL report that the location is unknown rather than returning a fabricated coordinate.

#### Scenario: IP resolves to a known country
- **WHEN** the resolver is given a client IP address that maps to a known ISO country code in the embedded dataset
- **THEN** it returns the lat/lng centroid associated with that country code

#### Scenario: IP cannot be mapped to any country
- **WHEN** the resolver is given a client IP address that is private/reserved, unmapped, or otherwise not resolvable to a country
- **THEN** it reports the location as unknown (a null result) instead of throwing an exception or returning a coordinate

#### Scenario: Resolved country has no known centroid
- **WHEN** the resolver maps a client IP to a country code for which no centroid is known
- **THEN** it reports the location as unknown (a null result)

#### Scenario: Client IP is null or empty
- **WHEN** the resolver is given a null or empty client IP value
- **THEN** it reports the location as unknown (a null result) instead of throwing an exception

### Requirement: Resolution never fails the request
Resolving a location SHALL NOT throw an exception or cause `POST /greet` to fail, regardless of the state of the embedded dataset or the validity of the input IP.

#### Scenario: Underlying geo-IP dataset is missing or unreadable
- **WHEN** the embedded geo-IP dataset is missing, corrupt, or fails to load at startup
- **THEN** the resolver logs a warning and subsequently reports every lookup as unknown, rather than throwing or preventing the API from starting
