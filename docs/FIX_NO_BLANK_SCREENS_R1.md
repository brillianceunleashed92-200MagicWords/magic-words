# 200 MAGIC WORDS — FIX_NO_BLANK_SCREENS_R1: MOUNT ERRORBOUNDARY + ADD 404 ROUTE
**Written:** July 9, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/no-blank-screens` (off current `main` tip)
Small, self-contained UI-safety fix from `docs/QA_HARDENING_REPORT.md`: **QA-03 (P1)** — `ErrorBoundary.jsx` is fully built but never mounted, so a render error shows a blank page; **QA-04 (P2)** — no catch-all route, so unknown URLs render blank. No DB schema, no new endpoints, no auth/selection/write-path changes.

## SUGGESTED /goal (paste into the CLI to launch)
> Execute docs/FIX_NO_BLANK_SCREENS_R1.md end to end, committing the prompt doc as part of the run. Permissions are bypassed at the CLI level, but these approval stops remain binding: pause and ask in chat before `git push origin main`. This run adds no DB schema and no new endpoints. Complete when EITHER (a) docs/NO_BLANK_SCREENS_REPORT.md is finished on main — ErrorBoundary mounted so a forced render error shows the recovery UI (not a blank page) verified in a production build, a catch-all 404 route renders an on-brand not-found screen for unknown paths, the FULL Playwright suite green at the true current baseline + the new specs (confirm the baseline with a fresh full-suite count at STEP 0 per census discipline; adding zero new specs is a failure, not a pass), build + no-emoji + wordart-sync green, production walk done (bad URL → 404, forced-error path verified), FINAL STATUS self-certifying the docs push — and you've pasted FINAL STATUS into your output; OR (b) a documented STOP/UNRESOLVED needing Sal, pasted into your output. A documented STOP is valid completion; never work around an approval stop to satisfy the goal. Stop after 60 turns.

## MISSION
Two "never show a blank page" fixes. **Reuse the existing `src/components/ErrorBoundary.jsx` as-is** (it's already built — mount it, do not reimplement). Both changes are pure UI/routing.

## GUARDRAILS (locked)
- Do not modify `ErrorBoundary.jsx`'s internals — only mount it.
- The 404 screen is **on-brand**: `theme/tokens.js` tokens, no emoji, no red/X, `--chunk`/`--chunk-sm` + press-down on any button, Baloo 2 / Quicksand — matching every other screen (DESIGN_BRIEF is authoritative).
- No schema, no new endpoints, no new `product_events`. idor-proof is **not** triggered (no ownership/write change) — state that in the report rather than skipping it silently.
- **Verify in a production build/preview, not just dev.** Error-boundary fallback behavior differs dev vs prod (React shows the dev overlay in dev, the fallback in prod) — the dead-import lesson applies.

## PHASE 0 — REPORT + RECON
Open `docs/NO_BLANK_SCREENS_REPORT.md` at STEP 0 with RUN TIMING as the first commit. Confirm the branch is off the current `main` tip and print a fresh full-suite spec count (census discipline — prior counts have drifted). Recon: `src/main.jsx` `<Routes>` (confirm the 6 routes, no catch-all), `src/components/ErrorBoundary.jsx` (its props + recovery-UI text, e.g. "Cosmo got confused"), and where `CandyGalaxyShell` mounts.

## PHASE 1 — MOUNT ERRORBOUNDARY
Wrap the router root (so every route — the lazy public pages AND the authed shell — is protected) in `<ErrorBoundary>`. Optional and noted-as-follow-up, not required for v1: a second nested boundary around the in-app content so a single game/screen crash keeps the app chrome usable. Do not touch the boundary component itself.

## PHASE 2 — ADD 404 CATCH-ALL
Add `<Route path="*">` in `src/main.jsx` rendering a small new on-brand `NotFound` screen (tokens, no emoji) with a clear "Back to the galaxy" CTA → `/app` if authenticated, `/` otherwise. Unknown paths now render it, never a blank page.

## PHASE 3 — TESTS (current baseline + new only)
- Spec: navigating to an unknown path (`/app/nope`, `/zzz`) renders `NotFound` and the back-CTA works.
- Spec: a **test-only** throwing component wrapped by the boundary renders the recovery UI (assert the fallback text) — run against the prod build; no `throw` ships in app code.
Enumerate the new specs; additive over the confirmed baseline.

## PHASE 4 — GATES, VERIFY, SHIP
`npm run build`, `npm run check:no-emoji`, `npm run check:wordart-sync`, Playwright `workers:1` (note idor-proof unaffected). Preview walk on the live branch preview: bad URL → 404; forced-error path → recovery UI in the prod build. Merge `fix/no-blank-screens` → main `--no-ff` → **approval** → push → deployment check (GitHub commit-status + `vercel list`, MCP is on the wrong account) → production walk (hit a bad URL on prod → 404 renders, no console error) → report DONE with end timing → **docs push, self-certified as FINAL STATUS's last line.**

## REPORT (docs/NO_BLANK_SCREENS_REPORT.md)
### RUN TIMING + confirmed suite baseline
### ERRORBOUNDARY — where mounted, forced-error proof (prod build), recovery UI shown
### 404 ROUTE — the NotFound screen, unknown-path proof, on-brand check
### VERIFICATION — new specs vs baseline, gates, walks; idor-proof status (unaffected)
### TRAPS
### NOTES — nested-boundary follow-up, any other blank-page risks spotted
