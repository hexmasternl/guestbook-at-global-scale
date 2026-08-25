## ADDED Requirements

### Requirement: Guestbook list is reachable at the /list route

The frontend SHALL expose a `/list` route that renders a dedicated guestbook list page as its own navigable destination, loaded lazily so its code is not part of the landing page's initial bundle.

#### Scenario: Navigating to the list route

- **WHEN** a visitor navigates to `/list` within the application
- **THEN** the guestbook list page is rendered in place of the landing page
- **AND** the page's code is fetched on demand rather than having been included in the initial application bundle

#### Scenario: Deep-linking directly to the list route

- **WHEN** a visitor loads `/list` directly as the first request of a session (a fresh browser load or a shared link)
- **THEN** the guestbook list page renders, without requiring the visitor to pass through the landing page first

### Requirement: Entries are listed newest-first from the guestbook API

The guestbook list page SHALL retrieve persisted entries from the backend `GET /greetings` endpoint on load and SHALL present them in the order the API returns them, newest first.

#### Scenario: Entries render in newest-first order

- **WHEN** the guestbook list page loads and the API returns multiple entries
- **THEN** the entries are displayed in the API's returned order, with the most recently posted greeting first

#### Scenario: List is exposed as a list to assistive technology

- **WHEN** the guestbook list page renders one or more entries
- **THEN** the entries are marked up as a list, so assistive technology announces them as a list with a count of items

### Requirement: Each entry shows its message, approximate origin, handling region, and time

Each rendered entry SHALL display the message posted by the visitor, an approximate indication of the location the message was sent from, the data-center region that handled the request, and when the entry was posted.

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

#### Scenario: Known data-center region is shown as a readable name

- **WHEN** an entry's region value matches a known data-center region
- **THEN** a human-readable display name for that region is shown
- **AND** the exact region value returned by the API remains available to the visitor

#### Scenario: Unknown data-center region falls back to the raw value

- **WHEN** an entry's region value does not match any known data-center region
- **THEN** the region value returned by the API is displayed unchanged, rather than being shown as blank, unknown, or mapped to an incorrect name

#### Scenario: Posting time is readable and precise

- **WHEN** an entry's posting time is displayed
- **THEN** it is shown in a human-readable relative form (for example, "2 hours ago")
- **AND** the entry's exact timestamp remains available to the visitor and to assistive technology

### Requirement: Visitors can page forward and backward through entries

The guestbook list page SHALL let a visitor move to the next page of entries and back to previously visited pages, using the pagination mechanism the API provides. Because the API is forward-only and reports no total entry count, the page SHALL NOT present a total number of pages, a total entry count, or a control for jumping to an arbitrary page.

#### Scenario: Moving to the next page

- **WHEN** a visitor activates the next-page control while the API has indicated more entries are available
- **THEN** the next page of entries is fetched and replaces the currently displayed entries

#### Scenario: Next-page control is unavailable on the last page

- **WHEN** the API indicates that the currently displayed entries are the last available page
- **THEN** the next-page control is disabled or hidden, so the visitor cannot request a page beyond the end

#### Scenario: Returning to the previous page

- **WHEN** a visitor activates the previous-page control while not on the first page
- **THEN** the previously visited page of entries is fetched and displayed again

#### Scenario: Previous-page control is unavailable on the first page

- **WHEN** the visitor is viewing the first page of entries
- **THEN** the previous-page control is disabled or hidden

#### Scenario: Current position is indicated without a total

- **WHEN** a visitor is viewing any page of entries
- **THEN** the page indicates which page number they are on
- **AND** it does not display a total page count or total entry count

#### Scenario: Pagination state is held by the client

- **WHEN** a visitor pages through entries
- **THEN** the position within the result set is tracked entirely by the frontend and supplied to the API on each request, requiring no server-side session or per-visitor state

#### Scenario: Opening the list always starts at the first page

- **WHEN** a visitor navigates to or reloads `/list`
- **THEN** the first page of entries is displayed, regardless of which page was previously being viewed

#### Scenario: Page changes are announced and focus is managed

- **WHEN** the displayed page of entries changes
- **THEN** the change is announced to assistive technology
- **AND** keyboard focus is placed at the start of the updated list rather than being lost or left on a now-changed control

### Requirement: Loading, empty, and error states are shown explicitly

The guestbook list page SHALL distinguish between a request in progress, a successful response containing no entries, and a failed request, and SHALL render a distinct state for each rather than an indeterminate or blank page.

#### Scenario: Request in progress

- **WHEN** a request for a page of entries is in flight
- **THEN** the page displays a loading indication
- **AND** the in-flight state is exposed to assistive technology
- **AND** the pagination controls are disabled while the request is in flight, so a visitor cannot queue overlapping page requests

#### Scenario: No entries exist yet

- **WHEN** the API returns a successful response containing no entries
- **THEN** the page displays a message stating that no greetings have been posted yet, together with an invitation to sign the guestbook
- **AND** this state is visually and semantically distinct from an error state

#### Scenario: Request fails

- **WHEN** a request for entries fails with a network or server error
- **THEN** the page displays an inline error message
- **AND** the page offers a retry control that re-requests the same page without requiring the visitor to reload or re-navigate

#### Scenario: A failed page request preserves the entries already shown

- **WHEN** a request for a subsequent page fails while entries from a previous page are displayed
- **THEN** the previously displayed entries remain on screen alongside the error message, rather than being cleared

### Requirement: The list page provides a back control to the landing page

The guestbook list page SHALL provide a visible control that navigates the visitor back to the landing page.

#### Scenario: Returning to the landing page

- **WHEN** a visitor activates the back control on the guestbook list page
- **THEN** the application navigates to the landing page route

#### Scenario: Back control is available regardless of list state

- **WHEN** the guestbook list page is in its loading, empty, error, or populated state
- **THEN** the back control is present and operable in every one of those states

### Requirement: The list page is mobile-first and responsive

The guestbook list page SHALL be laid out for small screens first and SHALL adapt to larger viewports, remaining usable and legible across phone, tablet, and desktop widths without horizontal scrolling.

#### Scenario: Narrow viewport

- **WHEN** the guestbook list page is viewed at a phone-sized viewport width
- **THEN** the entries are presented in a single column, with all entry content and the pagination and back controls reachable without horizontal scrolling

#### Scenario: Wide viewport

- **WHEN** the guestbook list page is viewed at a tablet- or desktop-sized viewport width
- **THEN** the entries reflow into multiple columns to use the available width, rather than remaining a single narrow column or stretching to an unreadable line length

#### Scenario: Long message content

- **WHEN** an entry's message is long, or contains a single unbroken run of characters
- **THEN** the message wraps within its entry, without overflowing the entry or forcing the page to scroll horizontally

### Requirement: List page styling uses the centralized design tokens

All colors, spacing, and typography used by the guestbook list page SHALL come from the project's centralized styling variables, consistent with the rest of the application's appearance.

#### Scenario: A design token change propagates to the list page

- **WHEN** a value in the centralized styling variables file is changed
- **THEN** the guestbook list page reflects the new value with no edit to the list page's own styles

#### Scenario: Contrast meets accessibility minimums

- **WHEN** the guestbook list page renders its text, region badges, and controls
- **THEN** all text and interactive elements meet WCAG AA contrast minimums
