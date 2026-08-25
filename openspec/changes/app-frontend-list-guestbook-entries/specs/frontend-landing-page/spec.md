## MODIFIED Requirements

### Requirement: Headline, sub-headline, and call-to-action

The landing page SHALL present a headline, a supporting sub-headline, and a single primary call-to-action element inviting the visitor toward the guestbook experience, alongside a secondary call-to-action that navigates to the guestbook list page.

#### Scenario: Primary content is visible without scrolling on a standard desktop viewport

- **WHEN** the landing page is loaded on a standard desktop viewport (e.g. 1366x768 or larger)
- **THEN** the headline, sub-headline, animated Earth graphic, and call-to-action button are all visible without requiring the user to scroll

#### Scenario: Primary call-to-action opens the guestbook entry form

- **WHEN** a user activates the primary call-to-action element
- **THEN** the guestbook entry form opens, per the `frontend-guestbook-entry-form` capability

#### Scenario: Secondary call-to-action navigates to the guestbook list

- **WHEN** a user activates the secondary call-to-action element in the hero
- **THEN** the application navigates to the guestbook list route (`/list`), rather than scrolling to a section within the landing page

#### Scenario: Secondary call-to-action is a navigating link

- **WHEN** a user views the secondary call-to-action element
- **THEN** it is rendered as a link to the guestbook list route, so it can be opened in a new tab, has a visible destination on hover, and is operable by keyboard

#### Scenario: The "how it works" section remains reachable

- **WHEN** a user scrolls the landing page after the secondary call-to-action has been repurposed to navigate to the list
- **THEN** the "how it works" feature section is still present on the page with its existing anchor target intact, reachable by scrolling and by any remaining in-page link to it
