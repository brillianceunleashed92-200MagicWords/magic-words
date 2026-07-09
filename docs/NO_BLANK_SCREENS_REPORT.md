# FIX_NO_BLANK_SCREENS_R1 — Mount ErrorBoundary + Add 404 Route

**Status:** IN PROGRESS
**Branch:** `fix/no-blank-screens` (off `main` tip `426033a`)
**Started:** 2026-07-09

## STEP 0 — RUN TIMING + CONFIRMED SUITE BASELINE
- Branch confirmed off current `main` tip: `426033a` (verified via `git merge-base --is-ancestor origin/main HEAD`).
- Fresh full-suite spec count (census discipline, `npx playwright test --list`): **86 tests in 30 files.** This is the baseline Phase 3/4 must stay green against, plus the new specs added by this run (adding zero new specs is a failure, not a pass).
- Started: 2026-07-09.

## ERRORBOUNDARY

**Recon (Phase 0):** `src/main.jsx` confirmed to have exactly 6 routes, no catch-all (`/`, `/privacy`, `/terms`, `/update-password`, `/app/*`, `/app-legacy/*` redirect). `src/components/ErrorBoundary.jsx` is a standard class component (`getDerivedStateFromError` + `componentDidCatch`), props `screen` (label for the console.error log) and `onReset` (optional callback), rotates 3 friendly messages (e.g. "Oops! Cosmo got confused!" / "Let's try that again — Cosmo believes in you!"), shows a "Try Again" button that resets local state + calls `onReset`. Dev-only error detail block gated on `import.meta.env.DEV`. Per the guardrail, its internals (including its own legacy-theme styling, same dark palette as QA-02's LoginScreen finding) are untouched — mount only.

**Mount point (Phase 1):** wrapped inside `main.jsx`, around the whole `<Routes>` tree (inside `<Suspense>`, outside `<Routes>`) so every route — the lazy public pages and the authed `/app/*` shell alike — is protected by one boundary.

## 404 ROUTE

New `src/pages/NotFound.jsx`, lazy-loaded from `main.jsx` like every other top-level page (own tiny chunk: `NotFound-*.js`, 1.19kB / 0.64kB gzip in the build). On-brand: `theme/tokens.js` (`colors`, `fonts`, `skyGradient` — same tokens as `PlacementChoiceScreen.jsx`), `ChunkyButton` (the shared chunk-shadow/press-down button, `--chunk` equivalent, 64px touch target), no emoji, no red/X. Copy: "This star hasn't been mapped yet" / "We couldn't find that page. Let's get you back to the galaxy." CTA "Back to the galaxy" navigates to `/app` if `useAuth().isLoggedIn`, `/` otherwise (button disabled while auth state is still loading, so it never routes on a stale/unknown auth state). Added as `<Route path="*">`, last in the list per React Router's route-matching order.

Both `npm run build` and `npm run check:no-emoji` / `npm run check:wordart-sync` pass clean with these changes in place.

## VERIFICATION
IN PROGRESS

## TRAPS
IN PROGRESS

## NOTES
IN PROGRESS
