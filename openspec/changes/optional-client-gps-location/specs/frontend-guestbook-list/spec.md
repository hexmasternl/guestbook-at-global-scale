## MODIFIED Requirements

### Requirement: Each entry shows its message, approximate origin, handling region, and time
Each guestbook entry in the list SHALL display its message, an approximate origin location derived from its coordinates, the data-center region that handled it, and its posting time. An entry whose location is unknown (no coordinates) SHALL say so instead of showing a derived place or coordinates.

#### Scenario: A complete entry is displayed

- **WHEN** an entry is rendered in the list
- **THEN** the entry's message text is displayed
- **AND** an approximate origin location is displayed
- **AND** the handling data-center region is displayed
- **AND** the entry's posting time is displayed

#### Scenario: Approximate origin is derived without a network call

- **WHEN** an entry's origin location is displayed
- **THEN** the location label is derived in the browser from the entry's latitude and longitude, with no additional network request made per entry

#### Scenario: Approximate origin is presented alongside the exact coordinates

- **WHEN** an entry's origin location is displayed
- **THEN** the location is labelled as approximate rather than presented as an exact place
- **AND** the entry's latitude and longitude as returned by the API remain visible alongside the approximate label

#### Scenario: Origin location cannot be determined

- **WHEN** an entry's coordinates do not resolve to any known place
- **THEN** the entry still renders with its message, region, and time, showing the coordinates without an approximate place name, and no error is surfaced to the visitor

#### Scenario: The entry has no location at all

- **WHEN** an entry is returned with `lat` and `lng` as `null` — its origin is unknown
- **THEN** the entry renders with its message, region, and time, and its location is stated as unknown
- **AND** no place name and no coordinates are shown for it, in particular no substitute coordinate such as `0.0° N, 0.0° E`
