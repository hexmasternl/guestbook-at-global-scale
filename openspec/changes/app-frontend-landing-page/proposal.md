## Why

The repository currently has no frontend at all — only the API/domain/data projects under `src/`. `storyline/demo-app-plan.md` calls for "one static HTML/JS page... no build pipeline" as the visible face of the talk's live demo. Before building the full map + greeting form, the app needs an appealing first screen that immediately sells the "global scale" premise to a conference audience: an animated Earth, framed as the entry point that will host the guestbook map and form once those capabilities land.

## What Changes

- Introduce the first frontend artifact: a static, no-build-step landing page (`index.html` + plain CSS/JS) served as its own site, per ADR 0002's `App/` slot in the canonical layout.
- Add a hero section with a graphical, animated representation of Earth (rotating globe) to visually emphasize the app's global-scale premise, plus a headline/sub-headline and a primary call-to-action (e.g. "Sign the guestbook") pointing at where the map/form experience will live.
- Centralize all design tokens (colors, spacing, typography) as CSS custom properties in a single `variables.css` file, per ADR 0006 (applies even without a SASS build step).
- Add a lightweight `App/` static-site project (or plain folder, per ADR 0002 layout) wired into the Aspire AppHost as a static file resource so it runs locally via `dotnet run`/F5 alongside the API, keeping with ADR 0003's Aspire-orchestration requirement.
- Keep the page purely presentational and stateless: no calls to `/greet` or `/greetings` yet, no build tooling (no bundler/npm build step) — plain HTML/CSS/JS only.
- **BREAKING**: none — net-new project/page, no existing contract changes.

## Capabilities

### New Capabilities
- `frontend-landing-page`: A static, animated-Earth landing page that introduces the guestbook app, served with no build pipeline and centralized styling tokens.

### Modified Capabilities
(none — no existing specs cover the frontend)

## Impact

- **Affected/new projects**: new `src/App/HexMaster.Guestbook.App` (or equivalently-named static site folder) containing `index.html`, `css/variables.css`, `css/styles.css`, `js/globe.js`; `src/Aspire/HexMaster.Guestbook.Aspire/HexMaster.Guestbook.Aspire.AppHost/AppHost.cs` (add the static site as an Aspire resource).
- **No changes** to `HexMaster.Guestbook.Api`, `HexMaster.Guestbook`, or `HexMaster.Guestbook.Data.CosmosDb` — this change is purely additive and frontend-only.
- **No new build tooling**: no npm/bundler dependency is introduced; animation is done with CSS animations and/or vanilla JS (e.g. CSS transforms or `<canvas>`), consistent with the plan's "no build pipeline" requirement.
- **Out of scope**: the interactive world map, the greeting submission form, and any wiring to `POST /greet` / `GET /greetings` — those remain future changes.
