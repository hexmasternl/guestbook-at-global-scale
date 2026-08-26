## MODIFIED Requirements

### Requirement: Guestbook entry form fields and client-side validation
The guestbook entry form SHALL collect a message and SHALL derive geographic coordinates (latitude, longitude) automatically from the visitor's browser-resolved geolocation when that is available. Latitude and longitude SHALL NOT be manually entered or edited by the visitor, and SHALL NOT be required to submit the form.

#### Scenario: Message is required
- **WHEN** a visitor attempts to submit the form with an empty or whitespace-only message
- **THEN** the form SHALL display a validation error and SHALL NOT submit the request

#### Scenario: A non-empty message is enough to submit
- **WHEN** a visitor enters a non-empty message
- **THEN** the form's submit control SHALL be enabled regardless of whether a location has been resolved, and SHALL be disabled only while a submission is in flight

### Requirement: Sharing browser location is optional
The guestbook entry form SHALL ask the browser for the visitor's location once when it opens, and SHALL include the resolved coordinates in the submission when the visitor granted access. When location access is denied, unavailable, or still pending, the form SHALL submit the greeting without coordinates and SHALL NOT block or delay submission, leaving the location for the API to approximate from the client's IP address (or to record as unknown).

#### Scenario: Geolocation available and granted
- **WHEN** the guestbook entry form opens and the browser successfully resolves the visitor's location
- **THEN** the resolved coordinates SHALL be used for submission without being displayed as editable fields
- **AND** the form SHALL indicate that the visitor's location will be included

#### Scenario: Geolocation denied or unavailable
- **WHEN** the guestbook entry form opens and geolocation is denied, times out, or is unavailable in the browser
- **THEN** the form SHALL display an informational note — not an error — explaining that the location will be estimated from the visitor's network connection instead
- **AND** the submit control SHALL remain enabled
- **AND** submitting SHALL send the greeting with no latitude/longitude
- **AND** the visitor SHALL be able to ask for their location to be resolved again without closing the dialog

#### Scenario: Submitting while the location is still being resolved
- **WHEN** a visitor submits a valid form while the browser has not yet returned a position (for example, a permission prompt is still on screen)
- **THEN** the form SHALL submit immediately with no latitude/longitude, rather than waiting for the pending location request

#### Scenario: Coordinates are sent together or not at all
- **WHEN** the form submits a greeting
- **THEN** it SHALL send both latitude and longitude, or neither, and SHALL never send one without the other
