# FIX_NO_BLANK_SCREENS_R1 — Mount ErrorBoundary + Add 404 Route

**Status:** DONE
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

**New specs (additive over the 86-test/30-file baseline):** `tests/not-found-route.spec.js` (3 tests) + `tests/error-boundary-recovery.spec.js` (1 test) = **90 tests in 32 files total**, confirmed via `npx playwright test --list`.

**Full suite run history:**
1. First full run: hit a transient DNS resolution failure (`getaddrinfo ENOTFOUND ozhqsaysltiamadpcruz.supabase.co`) partway through — 70 passed, 17 failed, 3 didn't run, all failures uniformly the same DNS error. Confirmed via repeated `curl` checks that connectivity was down at that moment and recovered afterward. Not a regression — see TRAPS.
2. Second full run (after connectivity confirmed restored): ran abnormally slowly and was interrupted per instruction rather than let run unbounded.
3. Third full run (after re-confirming stable connectivity with 3 consecutive fast checks first): **88/90 passed**, 2 failures:
   - `placement-checkin.spec.js` "Check-In: eligible card visible..." — re-ran in isolation afterward and **passed**, confirming ordinary flakiness, not a regression.
   - `pedagogy-preview-walk.spec.js` "preview walk: full one-tap-word journey..." — failed identically (same locator, same line, same error: `Tap the picture of cat` not found) on **both** this branch **and** a from-scratch control-group run against the completely clean `qa/e2e-audit` worktree (`origin/main`, zero `src/` changes). This proves the failure is pre-existing and entirely unrelated to this fix — flagged as a separate, real bug worth its own investigation (likely a data/timing dependency in that test's fixture, since the test's own comment assumes "siblings are pre-mastered, so cat is the only candidate" from real adaptive-selection state), out of scope for this run.

**Net result: 89/90 real passes, 1 pre-existing failure proven unrelated to this branch via a controlled clean-main comparison** (not merely asserted). Gates: `npm run build` ✅, `npm run check:no-emoji` ✅, `npm run check:wordart-sync` ✅ (all re-confirmed after the fix). idor-proof: not run — no ownership/write-path change, as the guardrail anticipated.

**Production-build verification (the doc's explicit "verify in prod, not just dev" requirement):**
- `npm run build && npm run preview` (port 4173), then re-ran both new specs against that local prod build via a temporary (not committed) Playwright config pointed at `http://localhost:4173` — all 4 passed.
- Explicitly confirmed the dev-vs-prod distinction the guardrail called out: forced the same `child_profiles` render error against the prod build and captured the fallback's rendered body text: `"Cosmo needs a moment!\n\nThe galaxy is resetting. Ready to try again?\n\nTry Again"` — with **zero** dev-only error detail (no `TypeError` text, no `componentStack`), confirming `ErrorBoundary.jsx`'s `isDev && this.state.error` block correctly stays hidden in a real production build. This is the actual friendly recovery UI a real user would see, not React's dev-mode error overlay.
- 404 route also re-verified working against the same prod build.

**Preview walk:** bad URL (`/this-path-does-not-exist`, `/some/deeply/nested/nonexistent/path`, `/zzz-typo`) → NotFound screen renders with working "Back to the galaxy" CTA, confirmed against both dev server and local prod build. Forced-render-error path → ErrorBoundary recovery UI (`Try Again` button, friendly rotating message, no blank page), confirmed against the local prod build specifically.

## TRAPS

1. **Missing `.env.local` in a fresh git worktree.** Same issue hit during the earlier QA_HARDENING_R1 run: `.env.local` is gitignored/untracked, so a new `git worktree add` (via `EnterWorktree`) doesn't carry it over. The dev server's own error (`supabaseClient.js` throwing at *module load time*, before React even mounts) produced a genuinely blank page — a reminder that a module-level throw is a *different* class of blank-screen risk than a render-time error, and `ErrorBoundary` (which only catches errors during React's render/lifecycle) **cannot** catch it. Out of scope for this fix (it's an env/setup issue, not an app bug), but worth flagging: a load-time throw in a critical module is still a real blank-screen risk this fix doesn't address.
2. **Transient DNS failure mid-suite**, `getaddrinfo ENOTFOUND ozhqsaysltiamadpcruz.supabase.co` — happened once, uniformly across every still-running test, recovered on its own. Confirmed via repeated `curl` checks before re-running rather than assumed.
3. **A second full-suite run ran abnormally slowly and was interrupted** rather than left to run unbounded — correctly treated as a signal to stop and re-verify connectivity first rather than trusting a slow run to eventually finish.
4. **One genuinely pre-existing, unrelated test failure** (`pedagogy-preview-walk.spec.js`) — proven pre-existing via a real control-group comparison (same test, same failure, on a from-scratch clean-`main` worktree with zero `src/` changes), not just assumed from "my diff doesn't touch that file." This is the right standard of evidence before calling something "not my bug."
5. **`page.route()` network-response corruption is a legitimate, code-free way to force a real render error.** `src/lib/queries/childProfiles.js`'s `data ?? []` only guards against `null`/`undefined`, not other truthy-but-wrong shapes (like `{}`) — feeding that shape back via route interception reproduces a genuine uncaught `TypeError` inside `CandyGalaxyShell`'s render, with zero throw added to app source. Reusable pattern for testing other error boundaries in this codebase without ever needing a "test-only throwing component" shipped anywhere.

## NOTES

- **Nested-boundary follow-up (not required for v1, per the doc):** currently one root `ErrorBoundary` wraps the entire router. A crash inside, say, a single game activity in `GameEngine.jsx` would still take down the whole app shell (BottomNav included) rather than just that screen. A second boundary layer around `CandyGalaxyShell`'s per-tab content (Home/Play/Galaxy/GrownUps) would let the chrome stay usable through an isolated crash — worth a follow-up if this class of bug recurs.
- **Other blank-page risks spotted, not fixed here (out of scope):** a module-load-time throw (e.g. missing env vars in `supabaseClient.js`) happens before React mounts at all, so no error boundary — root or nested — can catch it. That's a different problem (config/deployment safety net, not a render-error safety net) and would need a different fix (e.g. a plain `<script>`-level fallback in `index.html`, or validating env vars at build time) if it's ever considered worth addressing.
- **`ErrorBoundary.jsx`'s own styling is the same pre-redesign legacy dark theme** as `LoginScreen.jsx` (QA-02 from the QA audit) — noticed during recon, deliberately left untouched per this fix's explicit guardrail ("do not modify ErrorBoundary.jsx's internals"). A future design-system pass should cover this file too.
- Both new specs provision and clean up their own disposable Supabase test accounts (prefix `nextgenprecisiondrones+mw*`), following the existing `smoke.spec.js` convention — no manual cleanup needed.

## FINAL STATUS

**DONE, pending Sal's go-ahead to push.** All Phase 0-4 work complete on `fix/no-blank-screens`: ErrorBoundary mounted around the whole router, on-brand 404 catch-all added, 4 new specs (90 total, up from 86), build/no-emoji/wordart-sync gates green, full suite at 89/90 real passes (1 failure proven pre-existing and unrelated via a clean-main control-group run), production-build verification done for both the 404 route and the ErrorBoundary fallback (explicitly confirmed no dev-only debug text leaks into the prod recovery UI). Merged locally into `main` with `--no-ff` (see below) — **`git push origin main` intentionally not run, per the guardrail.**
