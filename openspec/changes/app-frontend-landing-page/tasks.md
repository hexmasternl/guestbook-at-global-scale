## 1. Static site scaffold (`src/App/HexMaster.Guestbook.App`)

- [ ] 1.1 Create the `src/App/HexMaster.Guestbook.App/` folder with `index.html`, `css/`, `js/`, and `assets/` subfolders.
- [ ] 1.2 Add `css/variables.css` declaring all design tokens (`:root { --color-*, --space-*, --font-* }`) used by the page, per ADR 0006.
- [ ] 1.3 Add `css/styles.css`, importing `variables.css` first and consuming tokens exclusively via `var(--token-name)` — no hard-coded color/spacing/font values.
- [ ] 1.4 Source or create a seamless equirectangular world-map texture image under `assets/` for the globe surface.

## 2. Hero content

- [ ] 2.1 Build `index.html` with a hero section containing: headline, sub-headline, the globe container element, and a primary call-to-action button/link.
- [ ] 2.2 Ensure the CTA is a real interactive element (button or anchor) but does not call `/greet` or `/greetings` — link it to a same-page anchor or a clearly labeled "coming soon" target.
- [ ] 2.3 Verify headline, sub-headline, globe, and CTA all fit within a standard 1366x768 desktop viewport without scrolling (manual check in-browser).

## 3. Animated Earth graphic

- [ ] 3.1 Implement the globe as a circular element with the world-map texture as its background, inside a `perspective`-parented wrapper for depth.
- [ ] 3.2 Add radial-gradient shading and a `box-shadow` layer to give the sphere a lit, 3D appearance.
- [ ] 3.3 Add a CSS `@keyframes` rule that animates `background-position` (or an equivalent transform) to produce a continuous rotation effect, wrapped in `@media (prefers-reduced-motion: no-preference)`.
- [ ] 3.4 Add a fallback static (non-animated), correctly-shaded rendering of the globe for `prefers-reduced-motion: reduce`.
- [ ] 3.5 Add `js/globe.js` only if needed for any interactive/JS-driven aspect of the animation (e.g. pausing on hover); keep it dependency-free vanilla JS, or omit the file entirely if pure CSS suffices.

## 4. Aspire AppHost wiring

- [ ] 4.1 Add a minimal static-file hosting mechanism for the `App/` folder (e.g. a small ASP.NET project using only `Microsoft.AspNetCore.StaticFiles`/`UseDefaultFiles`/`UseStaticFiles`, with no MVC/API surface), or an equivalent Aspire-supported static-site resource if one is already available in the pinned Aspire version.
- [ ] 4.2 Register the static site as a resource in `AppHost.cs` (e.g. `builder.AddProject<Projects.HexMaster_Guestbook_App>("hexmaster-guestbook-app")`), independent of the API's resource registration.
- [ ] 4.3 Add the new static-file host project to `Guestbook.slnx`.

## 5. Verification

- [ ] 5.1 Run `dotnet build` on `Guestbook.slnx` and confirm it succeeds with the new project included.
- [ ] 5.2 Start the AppHost (`dotnet run --project src/Aspire/HexMaster.Guestbook.Aspire/HexMaster.Guestbook.Aspire.AppHost`) and confirm the landing page resource shows as healthy/running in the Aspire dashboard, with its own endpoint separate from the API.
- [ ] 5.3 Open the landing page endpoint in a browser and visually confirm: headline/sub-headline/CTA are visible without scrolling, the globe animates by default, and simulating `prefers-reduced-motion: reduce` (via browser dev tools) freezes the globe into a static sphere.
- [ ] 5.4 Confirm no network calls to `/greet` or `/greetings` are made from the landing page (check browser dev tools Network tab).
