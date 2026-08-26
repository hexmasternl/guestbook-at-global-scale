> **Partly superseded by `optional-client-gps-location`.** Sharing browser location is now
> optional: the form no longer blocks submission when geolocation is denied, unavailable, or
> still pending — it submits without coordinates and lets the API approximate the location
> from the client IP (or record it as unknown). Everything else here still holds.

## ADDED Requirements

### Requirement: Sign the guestbook opens a modal entry form
The landing page's "Sign the guestbook" call-to-action SHALL open a modal dialog containing the guestbook entry form, instead of navigating or scrolling to another page section.

#### Scenario: Opening the dialog from the CTA
- **WHEN** a visitor activates the "Sign the guestbook" button on the landing page
- **THEN** a modal dialog opens containing the guestbook entry form
- **AND** the landing page behind it is visually dimmed/inert while the dialog is open

#### Scenario: Dialog is accessible
- **WHEN** the guestbook entry dialog opens
- **THEN** focus moves into the dialog and is trapped within it while open
- **AND** the dialog is announced as a modal dialog with an accessible label describing its purpose
- **AND** pressing Escape or activating a visible close control closes the dialog and returns focus to the "Sign the guestbook" button

### Requirement: Guestbook entry form fields and client-side validation
The guestbook entry form SHALL collect a message and SHALL derive geographic coordinates (latitude, longitude) automatically from the visitor's browser-resolved geolocation. Latitude and longitude SHALL NOT be manually entered or edited by the visitor.

#### Scenario: Message is required
- **WHEN** a visitor attempts to submit the form with an empty or whitespace-only message
- **THEN** the form SHALL display a validation error and SHALL NOT submit the request

#### Scenario: Valid input enables submission
- **WHEN** a visitor enters a non-empty message and the visitor's location has been resolved
- **THEN** the form's submit control SHALL be enabled and submitting SHALL send the request to the API using the resolved coordinates

### Requirement: Coordinates are resolved from geolocation; submission is blocked without them
The guestbook entry form SHALL automatically resolve the visitor's latitude/longitude from the browser's geolocation API and SHALL use those coordinates for submission. When geolocation is unavailable, denied, or times out, the form SHALL block submission and inform the visitor, rather than sending a request without coordinates.

#### Scenario: Geolocation available and granted
- **WHEN** the guestbook entry form opens and the browser successfully resolves the visitor's location
- **THEN** the resolved coordinates SHALL be used for submission without being displayed as editable fields
- **AND** the submit control SHALL be enabled once a valid message is entered

#### Scenario: Geolocation denied or unavailable
- **WHEN** the guestbook entry form opens and geolocation is denied, times out, or is unavailable in the browser
- **THEN** the form SHALL display a message explaining that location access is required
- **AND** the submit control SHALL remain disabled
- **AND** the visitor SHALL be able to retry resolving their location without closing the dialog

### Requirement: Submission calls the guestbook API and reflects request state
Submitting the guestbook entry form SHALL call the backend `POST /greet` endpoint and SHALL reflect the in-flight, success, and error states of that call in the dialog.

#### Scenario: Submission in progress
- **WHEN** a visitor submits a valid form
- **THEN** the dialog SHALL show a loading/submitting state
- **AND** the submit control SHALL be disabled to prevent duplicate submissions while the request is in flight

#### Scenario: Successful submission
- **WHEN** the `POST /greet` request succeeds
- **THEN** the dialog SHALL show a success confirmation
- **AND** the dialog SHALL close (immediately or after a brief confirmation), returning focus to the "Sign the guestbook" button

#### Scenario: Failed submission
- **WHEN** the `POST /greet` request fails (validation error response or network/server error)
- **THEN** the dialog SHALL remain open and SHALL display an inline error message
- **AND** the visitor SHALL be able to correct the form and retry submission without reopening the dialog
