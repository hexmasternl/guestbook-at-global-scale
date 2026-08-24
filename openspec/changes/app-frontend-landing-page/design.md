## Context

> **Note (superseded plan):** This context section describes the original
> plan (plain static HTML/JS under `src/App`, no build step). The repository
> has since adopted an Angular frontend at `frontend/guestbook/`, which
> supersedes that plan for the UI. See `tasks.md` for how this change was
> actually implemented, and the "Decision 1 update" below for how the globe
> was later upgraded to a real, geolocation-aware 3D Earth.

The repository has no frontend project at all yet — `src/` only contains the API, domain module, Cosmos DB adapter, Aspire orchestration, and tests. `storyline/demo-app-plan.md` calls for "one static HTML/JS page... no build pipeline" as the frontend, and ADR 0002's canonical layout reserves an `App/` slot for it. This change introduces that slot for the first time, with a self-contained landing page rather than the full map+form experience (which depends on `/greet` and `/greetings`, both already implemented in `HexMaster.Guestbook.Api`).

Constraints in force:
- ADR 0002 (modular monolith layout) — the frontend belongs in the top-level `App/` slot.
- ADR 0003 (Aspire required) — the static site must be modeled as an Aspire resource so `dotnet run`/F5 on the AppHost serves it alongside the API.
- ADR 0006 (centralized frontend styling variables) — even with no SASS/build step, all design tokens must live as CSS custom properties in one source file.
- The demo-app-plan's explicit "no build pipeline" requirement — ruling out bundlers, transpilers, or a JS framework with a compile step.

## Goals / Non-Goals

**Goals:**
- Ship a single static `index.html` (+ plain CSS/JS, no build step) with a visually appealing hero section built around an animated Earth graphic that reads clearly as "this app is about global scale" within a few seconds — suitable for opening a live conference demo.
- Centralize colors/spacing/typography as CSS custom properties in one `variables.css`, per ADR 0006.
- Wire the static site into the Aspire AppHost as a first-class resource so it's reachable locally without any separate tooling.
- Keep the page fully static/stateless: no fetches to the API, no client-side routing, no build tooling.

**Non-Goals:**
- The interactive world map, the greeting form, or any call to `POST /greet` / `GET /greetings` — those are separate future changes layered on top of this landing page (the CTA button is a placeholder link/anchor, not wired to a route yet).
- A JS framework (React/Angular/Vue) or any npm build pipeline — explicitly excluded by the demo-app-plan.
- Production hosting/deployment (Static Web App, Front Door origin, Bicep) — this change covers local Aspire orchestration only, matching how `api-add-guestbook-entry` scoped Cosmos DB to local-only emulator wiring.
- Accessibility/i18n beyond basic semantic HTML and reduced-motion support (covered minimally, not exhaustively).

## Decisions

### Decision 1 update (post-implementation): Real 3D globe via three.js/WebGL, not CSS-only

Superseding the original "Decision 1" below: after the initial CSS-only globe shipped, the requirement grew to (a) use a real, photographic Earth texture instead of an abstract map graphic, and (b) rotate the globe to face the visitor's real-world location when geolocation permission is granted. A flat `background-position` CSS animation cannot represent true 3D orientation/rotation toward an arbitrary lat/lon, so the globe was rebuilt as an actual 3D object using `three.js` (WebGL), rendered in a `<canvas>` inside a new `Globe` standalone component (`frontend/guestbook/src/app/features/landing/globe/`):
- A `THREE.SphereGeometry` textured with a real equirectangular Earth photo (`earth-texture.jpg`, plus a normal map and specular map for lit, textured shading), lit with ambient + directional lights.
- Idle behavior: slow continuous rotation around the Y axis, gated by `prefers-reduced-motion` (static, non-rotating render when reduced motion is requested).
- On mount, requests `navigator.geolocation.getCurrentPosition`. If granted, the globe eases (or, under reduced motion, snaps instantly) to face the resolved latitude/longitude and drops a small marker there; if denied/unavailable, it keeps idly rotating.
- WebGL context creation is guarded with try/catch so environments without WebGL (or the jsdom-based unit test runner) degrade gracefully instead of crashing.
- This intentionally reintroduces a build-time dependency (`three`) and a larger JS payload (~120kB gzipped in the lazy `landing` chunk) — acceptable since the frontend already moved to a full Angular + npm build pipeline (see the "Angular supersession" note above), so the original plain-HTML "no dependency" constraint no longer applies here.
- Real texture assets (`earth-texture.jpg`, `earth_normal_2048.jpg`, `earth_specular_2048.jpg`) were sourced from the `three.js` project's own official examples (MIT-licensed repository), avoiding any custom/uncertain-license imagery.

### Original decisions (superseded in part by the update above; kept for history)

### 1. Plain HTML/CSS/JS, animated Earth via CSS transforms (no canvas/WebGL library)
The globe is built as a CSS-animated sphere: a circular element with a seamless equirectangular world-map texture (a static image asset) that scrolls horizontally on a `background-position` keyframe animation, combined with radial-gradient shading and a `box-shadow` to fake a 3D lit sphere, inside a `perspective`-parented container for subtle depth. This achieves a convincing rotating-globe effect with zero JS dependencies and no build step.
Alternatives considered:
- **Three.js/WebGL globe** — visually richer (true 3D, drag-to-rotate) but pulls in a third-party JS library and a much heavier runtime; conflicts with "no build pipeline" simplicity goal and adds a dependency-update burden for a demo asset. Rejected for this change; could be a later enhancement if the CSS version isn't visually convincing enough.
- **Animated GIF/video of Earth** — simplest, but not resolution/theme-flexible, larger asset, can't easily react to `prefers-reduced-motion`. Rejected in favor of the more controllable CSS approach.
- **SVG-based rotation** — viable, but harder to get a convincing photographic look than a raster world-map texture; rejected.

### 2. New `src/App/HexMaster.Guestbook.App` static-site folder
Per ADR 0002's canonical layout, the frontend lives under `App/`. Since there's no build step, this is just a plain folder (not a .csproj) containing `index.html`, `css/variables.css`, `css/styles.css`, `assets/earth-texture.*`, `js/globe.js` — served as static files, not compiled.
Alternative considered: putting `wwwroot` inside `HexMaster.Guestbook.Api` and serving it from the same container (an option explicitly mentioned in the demo-app-plan). Rejected for this change because ADR 0002 designates a dedicated `App/` location, and keeping the frontend physically separate from the API keeps the "static/dynamic split" option open, as the plan itself calls out as worth demoing later.

### 3. Aspire wiring via `AddContainer`-free static file hosting
The AppHost adds the site as a resource using Aspire's support for serving a folder of static assets locally (e.g., a minimal `dotnet serve`-style hosting resource, or `builder.AddNpmApp`-equivalent is avoided since there's no npm project — instead a lightweight static-file host resource is used, such as wrapping the folder with `AddContainer`-free built-in static asset serving or a tiny placeholder ASP.NET static-files host project referencing only `Microsoft.AspNetCore.StaticFiles`/`UseDefaultFiles`/`UseStaticFiles`, no MVC/API surface). This keeps `dotnet run` on the AppHost launching the landing page without introducing any bundler.
Alternative considered: Azure Static Web Apps CLI emulator via Aspire's SWA integration — deferred; adds complexity not needed for a single local static page and is better evaluated when the full map/form app and deployment story (Front Door + SWA) are designed.

### 4. Design tokens in `variables.css`, consumed by `styles.css`
All colors (background gradient, Earth shading, CTA button), spacing scale, and font sizes are declared once as `:root { --token-name: value; }` in `variables.css`, imported before `styles.css`. This satisfies ADR 0006's requirement even though there's no SASS compiler — CSS custom properties are the vanilla-CSS equivalent the ADR anticipates for non-build frontends.

### 5. Reduced-motion support
The globe's rotation keyframe animation is wrapped in `@media (prefers-reduced-motion: no-preference)`; under reduced-motion, the globe renders as a static, correctly-lit sphere with no animation. This is a small, low-cost accessibility guard worth including given the animation is the page's centerpiece.

## Risks / Trade-offs

- [CSS-only globe may look less impressive than a true 3D/WebGL globe on a projector during the talk] → Acceptable trade-off for zero dependencies/build step; can be revisited as a follow-up change if the live demo needs more visual punch.
- [No build pipeline means no CSS/JS minification or bundling] → Acceptable for a single small static page; asset sizes (one texture image, small CSS/JS files) are small enough that this doesn't matter for a demo.
- [Placeholder CTA with no real destination yet] → Intentional; scenarios below make clear it's a visual/structural placeholder until the map/form change lands, avoiding dead links by pointing at an anchor within the same page or a clearly marked "coming soon" state.
- [Static-file host project inside `App/` diverges slightly from ADR 0002's per-module `Api`/`Data`/`Tests` project shape, since the frontend isn't a domain module] → Acceptable: ADR 0002 explicitly names `App/` as a distinct top-level slot separate from domain modules, so no per-module conventions apply here.

## Migration Plan

Purely additive: new `App/` folder/project and one new AppHost resource registration. No existing project, contract, or data changes. Rollback is reverting the commit; nothing destructive occurs.

## Open Questions

- Whether to eventually upgrade the globe to a WebGL/Three.js version for a richer live-demo visual — deferred until after the CSS version is seen on a real projector/screen.
- Exact hosting mechanism for local static files in the Aspire AppHost (minimal static-files host project vs. an Aspire community static-site integration, if one becomes available) — to be finalized during implementation based on what's cleanly supported by the Aspire version already pinned in this repo.
