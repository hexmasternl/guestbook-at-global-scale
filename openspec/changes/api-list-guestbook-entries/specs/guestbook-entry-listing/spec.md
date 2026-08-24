## ADDED Requirements

### Requirement: List guestbook entries newest-first
The system SHALL expose `GET /greetings`, returning persisted guestbook entries ordered by creation time (`ts`) descending, so the most recently submitted greeting is always first.

#### Scenario: Listing entries returns newest first
- **WHEN** a client sends `GET /greetings` and multiple entries exist
- **THEN** the response body's `entries` array is ordered by `ts` descending, with the most recently created entry first

#### Scenario: Listing entries when none exist
- **WHEN** a client sends `GET /greetings` and no entries have been persisted yet
- **THEN** the system returns `200 OK` with an empty `entries` array and no `continuationToken`

### Requirement: Configurable page size with default and bounds
The system SHALL accept an optional `pageSize` query parameter controlling how many entries are returned per request, defaulting to 50 when omitted, and SHALL enforce a minimum of 10 and a maximum of 250 entries per page.

#### Scenario: Default page size is used when not specified
- **WHEN** a client sends `GET /greetings` without a `pageSize` parameter
- **THEN** the system returns at most 50 entries in the response

#### Scenario: Requested page size within bounds is honored
- **WHEN** a client sends `GET /greetings?pageSize=100`
- **THEN** the system returns at most 100 entries in the response

#### Scenario: Requested page size below the minimum is clamped
- **WHEN** a client sends `GET /greetings?pageSize=5`
- **THEN** the system treats the request as if `pageSize=10` was specified

#### Scenario: Requested page size above the maximum is clamped
- **WHEN** a client sends `GET /greetings?pageSize=1000`
- **THEN** the system treats the request as if `pageSize=250` was specified

#### Scenario: Non-numeric or non-positive page size is rejected
- **WHEN** a client sends `GET /greetings?pageSize=abc` or `GET /greetings?pageSize=0`
- **THEN** the system returns `400 Bad Request` with a validation error identifying `pageSize` as invalid

### Requirement: Continuation-token based pagination
The system SHALL support paging through results using an opaque `continuationToken` returned in a response and accepted as a query parameter on a subsequent request, without requiring or exposing a total entry count.

#### Scenario: Response includes a continuation token when more entries exist
- **WHEN** a client sends `GET /greetings?pageSize=10` and more than 10 entries exist
- **THEN** the response includes a non-null `continuationToken` that can be used to fetch the next page

#### Scenario: Response omits the continuation token on the last page
- **WHEN** a client sends `GET /greetings` and the returned entries are the last remaining entries
- **THEN** the response's `continuationToken` is `null`

#### Scenario: Client fetches the next page using a returned continuation token
- **WHEN** a client sends `GET /greetings?continuationToken=<token>` using a token returned from a previous response
- **THEN** the system returns the next page of entries following on from where the previous page ended, still ordered newest-first
