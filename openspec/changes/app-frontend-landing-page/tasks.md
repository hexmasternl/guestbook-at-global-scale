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
