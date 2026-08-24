## ADDED Requirements

### Requirement: Static landing page with no build pipeline
The system SHALL provide a static `index.html` page (plus plain CSS/JS assets) served with no build/bundling/transpilation step, as the app's entry point.

#### Scenario: Page loads from static files only
- **WHEN** a browser requests the landing page
- **THEN** the server returns `index.html` and its referenced CSS/JS/image assets unmodified from source, with no server-side rendering, bundler output, or build artifact involved

### Requirement: Animated Earth hero graphic
The landing page SHALL display a hero section featuring a graphical, animated representation of Earth that visually communicates the app's global scale.

#### Scenario: Globe animates by default
- **WHEN** a user loads the landing page with no motion-reduction preference set
- **THEN** the Earth graphic renders as a continuously rotating globe within the hero section

#### Scenario: Globe respects reduced-motion preference
- **WHEN** a user loads the landing page with `prefers-reduced-motion: reduce` set in their browser/OS
- **THEN** the Earth graphic renders as a static, non-animated sphere instead of rotating

### Requirement: Realistic 3D globe with real Earth imagery
The hero's Earth graphic SHALL be rendered as a true 3D object (not a flat/2D approximation) textured with a real, photographic-style Earth map, so it reads as an actual globe rather than a stylized graphic.

#### Scenario: Globe uses a real-world texture
- **WHEN** the landing page renders the hero globe
- **THEN** its surface is textured with a real equirectangular Earth photo (not an abstract/illustrative map), lit to appear three-dimensional

#### Scenario: WebGL unavailable
- **WHEN** the visitor's browser/device does not support WebGL
- **THEN** the page does not crash or show a broken canvas; the globe degrades gracefully (e.g. remains hidden/inert) while the rest of the hero content stays usable

### Requirement: Globe orients toward the visitor's location when permitted
When the visitor's browser grants geolocation access, the hero globe SHALL rotate to face the visitor's real-world location.

#### Scenario: Geolocation permission granted
- **WHEN** a visitor allows the browser's location-sharing prompt
- **THEN** the globe smoothly rotates (or, under `prefers-reduced-motion: reduce`, immediately snaps) until the visitor's resolved latitude/longitude faces the camera, with a small marker shown at that location

#### Scenario: Geolocation permission denied or unavailable
- **WHEN** a visitor denies the location prompt, it times out, or the Geolocation API is unavailable
- **THEN** the globe continues (or resumes) its default idle rotation with no marker shown, and no error is surfaced to the visitor

### Requirement: Headline, sub-headline, and call-to-action
The landing page SHALL present a headline, a supporting sub-headline, and a single primary call-to-action element inviting the visitor toward the guestbook experience.

#### Scenario: Primary content is visible without scrolling on a standard desktop viewport
- **WHEN** the landing page is loaded on a standard desktop viewport (e.g. 1366x768 or larger)
- **THEN** the headline, sub-headline, animated Earth graphic, and call-to-action button are all visible without requiring the user to scroll

#### Scenario: Call-to-action is present but not yet wired to the guestbook feature
- **WHEN** a user views the call-to-action element
- **THEN** it is clearly rendered as an actionable button/link, but SHALL NOT invoke `POST /greet` or `GET /greetings`, since the interactive map/form experience is out of scope for this change

### Requirement: Centralized design tokens
All colors, spacing, and typography values used on the landing page SHALL be declared as CSS custom properties in a single source file, and consumed from there by all other styles.

#### Scenario: A style value is changed once and applies everywhere
- **WHEN** a design token (e.g. a brand color) is changed in the single CSS variables file
- **THEN** every element on the landing page that uses that token reflects the new value with no other file requiring edits

### Requirement: Local availability via Aspire orchestration
The landing page SHALL be reachable when the Aspire AppHost is run locally (`dotnet run`/F5), served as its own resource alongside the API.

#### Scenario: Landing page resource starts with the AppHost
- **WHEN** a developer starts the Aspire AppHost locally
- **THEN** the landing page is served and reachable at an HTTP endpoint shown in the Aspire dashboard, independent of the API's endpoint
