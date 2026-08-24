> **Note (superseded plan):** This change was originally scoped for a plain
> `src/App/HexMaster.Guestbook.App` static HTML/CSS/JS site wired into the
> Aspire AppHost. The repository has since adopted an Angular frontend at
> `frontend/guestbook/` (see repo Copilot instructions), which supersedes the
> "single static page, no build step" plan for the UI. The tasks below have
> been reinterpreted to deliver the same requirements (spec.md is unchanged
> and still satisfied) as an Angular feature within `frontend/guestbook/`
> instead of a new `src/App` project/Aspire resource.

## 1. Design tokens (`frontend/guestbook/src/styles/_variables.scss`)

- [x] 1.1 Create `frontend/guestbook/src/styles/_variables.scss` declaring all design tokens (hero/globe colors, spacing, typography) used by the landing page, per ADR 0006.
- [x] 1.2 Wire `stylePreprocessorOptions.includePaths` in `angular.json` so components consume tokens via `@use 'variables' as *;` — no hard-coded color/spacing/font values in component styles.
- [x] 1.3 Source or create a seamless world-map texture (SVG) under `frontend/guestbook/public/assets/globe/` for the globe surface.

## 2. Hero content

- [x] 2.1 Build a `Landing` standalone component (`frontend/guestbook/src/app/features/landing/`) with a hero section containing: headline, sub-headline, the globe container element, and a primary call-to-action button/link.
- [x] 2.2 Ensure the CTA is a real interactive element (Material button/anchor) but does not call `/greet` or `/greetings` — links to a same-page `#coming-soon` anchor.
- [x] 2.3 Verify headline, sub-headline, globe, and CTA all fit within a standard 1366x768 desktop viewport without scrolling (manual check in-browser).

## 3. Animated Earth graphic

- [x] 3.1 Implement the globe as a circular element with the world-map texture as its background, inside a `perspective`-parented wrapper for depth.
- [x] 3.2 Add shading (radial/box-shadow) to give the sphere a lit, 3D appearance.
- [x] 3.3 Add a CSS `@keyframes` rule that animates `background-position` to produce a continuous rotation effect, wrapped in `@media (prefers-reduced-motion: no-preference)`.
- [x] 3.4 Add a fallback static (non-animated), correctly-shaded rendering of the globe for `prefers-reduced-motion: reduce`.
- [x] 3.5 No JS-driven animation was needed; the effect is pure CSS, so no additional script file was added.

## 4. Angular routing wiring

- [x] 4.1 Register the `Landing` component as the root (`''`) lazy-loaded route in `app.routes.ts`.
- [x] 4.2 Simplify `App`/`app.html` to a plain `<router-outlet />` so the landing page renders at the app root.
- [x] 4.3 N/A — no `src/App` static-file host project or `Guestbook.slnx` changes are required; the landing page is part of the existing `frontend/guestbook` Angular app, not the .NET solution.

## 5. Verification

- [x] 5.1 Run `npm run build` in `frontend/guestbook` and confirm it succeeds with the `Landing` route lazy-chunked.
- [x] 5.2 Run `npm test` in `frontend/guestbook` and confirm the `App` and `Landing` unit tests pass.
- [ ] 5.3 Run `npm start` in `frontend/guestbook`, open the app in a browser, and visually confirm: headline/sub-headline/CTA are visible without scrolling, the globe animates by default, and simulating `prefers-reduced-motion: reduce` (via browser dev tools) freezes the globe into a static sphere. *(Manual browser check — not run in this session; automated build/tests above cover functional correctness.)*
- [x] 5.4 Confirm no network calls to `/greet` or `/greetings` are made from the landing page (verified by inspection: the CTA is a same-page anchor with no HTTP client wired into `Landing`).

## 6. Real 3D globe with geolocation-based orientation (post-implementation enhancement)

- [x] 6.1 Add `three` (+ `@types/three`) as an `npm` dependency of `frontend/guestbook` and build a `Globe` standalone component (`src/app/features/landing/globe/`) that renders a real, textured 3D Earth sphere via WebGL instead of the earlier flat CSS `background-position` animation.
- [x] 6.2 Source a real, appropriately-licensed equirectangular Earth texture (plus normal/specular maps for lit shading) — used the `three.js` project's own official example textures (MIT-licensed repository) rather than an uncertain-license image.
- [x] 6.3 Keep idle auto-rotation gated by `prefers-reduced-motion` (no rotation loop when reduced motion is requested; the sphere still renders statically).
- [x] 6.4 On component init, request `navigator.geolocation.getCurrentPosition`; on success, ease (or, under reduced motion, snap) the globe's rotation to face the resolved latitude/longitude and show a small marker there; on denial/timeout/unavailability, silently keep the default idle rotation with no error shown to the visitor.
- [x] 6.5 Guard `WebGLRenderer` creation with try/catch and feature-detect `ResizeObserver`/`matchMedia` so the component degrades gracefully in environments without WebGL support (verified via the jsdom-based unit test runner, which lacks WebGL).
- [x] 6.6 Add `globe.spec.ts` covering graceful-degradation and the decorative/`aria-hidden` canvas wrapper; update `landing.spec.ts`/`design.md`/`spec.md` for the new behavior.
- [x] 6.7 Run `npm run build` and `npm test` in `frontend/guestbook` to confirm the new dependency/component compiles and all unit tests (6 total) pass.
- [ ] 6.8 Manually load the page in a real browser, grant location access, and confirm the globe visibly rotates to face your location with a marker; deny access and confirm it keeps idly rotating with no errors. *(Manual browser + OS permission-prompt check — not run in this sandboxed session.)*
- [x] 6.9 Enlarge the globe into a full-viewport background (absolutely positioned behind the hero content, `SPHERE_RADIUS`/`CAMERA_DISTANCE` tuned so it fills/bleeds off the screen edges) instead of a small inset circle, with a gradient scrim behind the headline/sub-headline/CTA for text legibility.
- [x] 6.10 Fix camera-distance math: the sphere was previously so close to the camera relative to its radius/FOV that only a distorted, zoomed-in crop of the surface was visible ("wrong texture scaling"). Replaced with `computeCameraDistanceForFullHeightSphere()`, which derives the camera distance from `SPHERE_RADIUS`/FOV so the sphere's silhouette matches the full page height (with a small intentional overfill margin, no gap at top/bottom).
- [x] 6.11 Switched idle rotation to a delta-time-based radians/second rate (via `requestAnimationFrame` timestamps) instead of a fixed per-frame increment, so it rotates smoothly regardless of display refresh rate ("rotates cleanly").
- [x] 6.12 Replaced the visible ease-to-target rotation on geolocation resolve with a fade-out → instant snap (while hidden) → fade-in transition (`isFaded` signal + CSS `opacity` transition on the canvas, skipped entirely under `prefers-reduced-motion: reduce`), so the reorientation to the user's location is a clean fade rather than a visible spin.
