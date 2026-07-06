# FIX R1 REPORT — Forensics Follow-Up: Launch-Blocking + Pre-Stripe-Live Fixes

## RUN TIMING
- Start: 2026-07-06T16:04:29Z
- End: 2026-07-06T16:59:13Z
- Total: ~55 minutes (see RUN TIMING (final) at the end of this report for the one unplanned delay)
- Branch: `fix/forensics-r1`
- Base SHA: `211afe0f76239ac5d2011da94aa9ec4b21ee68ed`
- Source of truth: `docs/FORENSICS_R1_REPORT.md` (commit `3a36f1f` findings)

## PHASE 7 GATE CHECK
Kickoff message did not contain `NAME-SWAP: YES` — Phase 7 (B2 name-swap) is **SKIPPED** per the doc's own gating rule. Nothing in `api/story-engine.js`/`api/parent-digest.js` touched this run.

## PHASE 1 — B6: signup clickwrap covers Terms of Service
**BEFORE**: `src/screens/LoginScreen.jsx:140-144` — checkbox copy: *"I am the parent or guardian of the child who will use this app, and I consent to the data collection described in our [Privacy Policy]."* Only `/privacy` linked; Terms of Service never referenced.

**AFTER**: Extended in substance, parental-consent language preserved verbatim (only "and" → ", and" for the added clause): *"I am the parent or guardian of the child who will use this app, I consent to the data collection described in our [Privacy Policy], and I agree to the [Terms of Service]."* Both `/privacy` and `/terms` are real links, `target="_blank" rel="noreferrer"` (opens in new tab, signup form state preserved). Mechanical gate untouched: `consentChecked` still starts `false`, submit button still `disabled={busy || (authMode === "sign_up" && !consentChecked)}` (`:158`, unchanged).

**Tests added** (`tests/smoke.spec.js`, new test after the existing signup-confirmation test): verifies (a) checkbox starts unchecked and submit is disabled, (b) both Privacy Policy (`/privacy`) and Terms of Service (`/terms`) links present with correct `href`/`target`, (c) checking enables submit, unchecking disables it again. Deliberately avoids a real `supabase.auth.signUp()` call (the project's documented email-rate-limit trap) — this test only exercises pre-submit UI state. **Passed locally** (`npx playwright test tests/smoke.spec.js -g "consent checkbox"` → 1 passed, 4.4s).

## PHASE 2 — A1: offline fallback respects placement floor
**BEFORE**: `buildSupabaseFallbackPlan` (`src/hooks/useSessionPlan.js`) computed `currentUnit` from `word_progress` mastery alone, starting at whatever unit had the lowest number — a placed child (empty `word_progress` by design) hitting this fallback got Unit 1 regardless of their real placement floor.

**AFTER**:
- `useSessionPlan(user, childId, plan, placementUnit)` — new 4th parameter, threaded through both `generatePlan` and `generateReviewPlan`'s fallback calls and their `useCallback` dependency arrays.
- Call site updated: `src/screens/PlayScreen.jsx` now passes `activeChild?.placement_unit` (already selected by `childProfiles.js`'s query — no new fetch added, per the doc's instruction).
- `buildSupabaseFallbackPlan(childId, plan, placementUnit)` computes `effectiveFloor = placementUnit ? Math.min(placementUnit, maxUnit) : null` — identical semantics to the server's `api/session-generator.js:276`.
- The actual unit-selection scan was extracted into a new pure function, `computeFallbackCurrentUnit(withMastery, effectiveFloor)`, living in a **new dependency-free module** `src/lib/sessionPlanFallbackUnit.js` (zero imports) rather than inline in `useSessionPlan.js` — necessary because `useSessionPlan.js` transitively imports `supabaseClient.js`, which reads `import.meta.env` (Vite-only) and throws immediately if imported directly by Playwright's plain-Node test loader (confirmed by trying the inline version first and hitting exactly that `SyntaxError: Cannot use 'import.meta' outside a module` — moved the pure logic out rather than working around it).

**Test added**: `tests/session-plan-fallback.spec.js` — 4 plain Node assertions (no `page` fixture, no Supabase mocking needed) against `computeFallbackCurrentUnit`: (1) empty progress + `placement_unit: 5` → Unit 5 (the exact regression case), (2) `placement_unit: null` → unchanged pre-fix behavior (lowest unmastered unit), (3) a floor above every unit with any progress still returns the floor rather than `undefined`, (4) a floor that lands mid-curriculum doesn't skip past a real unmastered unit at or above it. **All 4 passed** (`npx playwright test tests/session-plan-fallback.spec.js` → 4 passed, 1.8s). `npm run build` re-verified clean after the refactor.

## PHASE 3 — A5: session-plan cache scoped by child
**BEFORE**: `PLAN_CACHE_KEY = 'mw_session_plan_v3'` — a single fixed sessionStorage key shared by every child under an account. `getCachedPlan()`/`cachePlan()` never took or checked `childId`.

**AFTER**:
- `PLAN_CACHE_KEY_PREFIX = 'mw_session_plan_v4'` (bumped, per the doc), key becomes `` `mw_session_plan_v4:${childId}` `` via a new `planCacheKey(childId)` helper.
- `getCachedPlan(childId)`/`cachePlan(childId, plan)` now require and use `childId`; both call sites in `generatePlan` updated (`generateReviewPlan` was already uncached by design, untouched).
- Legacy cleanup: `removeLegacyUnscopedCache()` calls `sessionStorage.removeItem('mw_session_plan_v3')` on every `getCachedPlan` call — a returning user's stale unscoped key is deleted the first time any cache read happens post-upgrade, not just ignored.
- These four functions (`planCacheKey`, `getCachedPlan`, `cachePlan`, `removeLegacyUnscopedCache`) plus the `LEGACY_UNSCOPED_PLAN_CACHE_KEY` constant were changed from module-private to exported, so they could be tested directly.

**Test added**: `tests/session-plan-cache.spec.js` — 2 tests, run in a real browser via a dynamic `import("/src/hooks/useSessionPlan.js")` inside `page.evaluate` (Vite dev server serves the module directly; this avoids needing a full two-child family sign-in flow while still exercising the real code against a real `sessionStorage`, not a mock). (1) a plan cached for `child-A` is retrievable for `child-A` but returns `null` for `child-B`, and their keys differ; (2) a simulated pre-fix legacy key is removed on the first cache read and is never subsequently returned. **Both passed** (`npx playwright test tests/session-plan-cache.spec.js` → 2 passed, 4.1s). `npm run build` re-verified clean.

## PHASE 4 — B4: delete product_events on account deletion
**BEFORE**: `api/delete-account.js` cleaned Storage (`drawings` bucket) then deleted the auth user, relying on migration 0018's FK cascades for every other table. `product_events` (migration 0032) has plain `user_id`/`child_id` uuid columns with no FK/cascade at all, so its rows survived deletion indefinitely.

**AFTER**: after the existing Storage cleanup and before `admin.auth.admin.deleteUser`, two explicit deletes run against `product_events`: one by `user_id = user.id`, one by `child_id IN (...)` (using the same `children` array already fetched for the Storage step — no new query). Deleted row ids are unioned into a `Set` to avoid double-counting rows matched by both conditions, and the count is logged via `logSecurityEvent('account_deletion_product_events_purged', { userId, deletedCount })`. Header comment's coverage list updated to describe this as step 2 of 3 (Storage → `product_events` → auth-user cascade).

**Verification — done, live on the branch preview** (`https://magic-words-46u26ogco-brillianceunleashed92-6054s-projects.vercel.app`, commit `74364c5`):
1. Created disposable test account `fixr1verify...` via `scripts/admin-user.mjs create`, set a password, signed in for a real JWT.
2. Created a child profile, then hit the preview's real `/api/session-generator` with `{ childId, placementMode: true, skip: true }` — the exact code path `PlacementChoiceScreen.jsx`'s decline button drives — producing a real `placement_skipped` row with both `user_id` and `child_id` populated (200 `{"ok":true}`).
3. Confirmed via `scripts/db-query.mjs`: exactly 1 `product_events` row existed for that user/child before deletion.
4. Deleted the account via the preview's real `/api/delete-account` (`{"confirm":"DELETE"}`) → `200 {"success":true}`.
5. Re-ran the same `product_events` query: **zero rows** for that user/child — confirms the fix works against a real deployed environment, not just inferred from the diff.
6. Confirmed sign-in with the same credentials now fails: `400 invalid_credentials`.
No leftover test artifacts — the account itself was the thing deleted as part of the test.

## PHASE 5 — B7(ii): remove false "drawings" claims
Copy-only, no logic changes, per the doc's explicit "do NOT rewrite these legal pages" instruction.

**BEFORE/AFTER**:
- `src/screens/parent/SettingsTab.jsx:190` — "...all word progress, streaks, stories, and drawings. This cannot be undone." → "...all word progress, streaks, and stories. This cannot be undone."
- `src/pages/PrivacyPolicy.jsx:41` — "...removes every child profile, all progress, stories, and drawings immediately." → "...removes every child profile, all progress, and stories immediately."
- `api/delete-account.js`'s Storage cleanup of the `drawings` bucket left untouched, per the doc (harmless, correct if any legacy objects exist from before the Draw It rebuild).

`npm run build` re-verified clean.

## PHASE 6 — Docs: extend device checklist
Appended item 7 to `docs/DEVICE_TEST_CHECKLIST.md`, matching the existing Do/Observe/Record format used by items 1-6: a DevTools-Network-tab check of which external endpoints Chrome/Safari themselves contact during a Say-It attempt, resolving B1's one `UNVERIFIABLE-STATICALLY` sub-question (the exact speech-recognition vendor, which depends on browser internals, not this app's code — see `FORENSICS_R1_REPORT.md`'s B1 finding).

## GATES
- `npm run build`: clean at every phase checkpoint and again after the merge to `main`.
- `npm run lint`: 154 problems (148 errors, 6 warnings) — **identical count before and after this pass** (confirmed via `git stash`/`git stash pop` A-B comparison), all pre-existing (`process`/`require`/`module is not defined` in CommonJS `api/*.js` files and test files — an existing ESLint flat-config gap unrelated to this pass). Zero new lint errors introduced by this pass's changes.
- Full Playwright suite: **31/31 passed** locally (7.3m, with `SUPABASE_SERVICE_ROLE_KEY` exported so no tests were skipped) — includes the 7 new tests this pass added (1 clickwrap, 4 fallback-floor, 2 cache-scoping). Re-run again against the branch preview after pushing: **31/31 passed** (7.4m) — the only difference was `csp-walk.spec.js` observing 11 violations, all filtered as the known Vercel preview-toolbar artifact (documented in Prompt 10's CSP work; does not appear on production).
- `node scripts/idor-proof.mjs`: **16/16 passed** against the branch preview (`DEPLOY_BASE_URL` set) — includes the `create-portal-session`/`session-generator`/`track` live-endpoint checks that get skipped locally without a deployed URL.
- No provisioning flakes to re-run in isolation — every run passed clean on the first attempt.

## MERGE & PRODUCTION VERIFICATION
Merged `fix/forensics-r1` into `main` locally (`--no-ff`, commit `81d89db`). Pushed to `origin/main` with explicit user approval.

**Deployment incident, resolved**: the push to `main` did not trigger a Vercel deployment through the normal GitHub-integration webhook — confirmed via `gh api .../commits/81d89db/status` returning `total_count: 0` (no status ever registered) for over 14 minutes, versus every prior push this session registering a Vercel "pending" status within seconds. Verified this wasn't just a slow build: `vercel ls` showed no new deployment entry for this SHA at all, and production's served bundle hash hadn't changed. Flagged to the user rather than continuing to poll or silently working around it; user approved a manual `vercel --prod` deploy of the same already-pushed, already-approved commit. That deploy succeeded (`dpl_8uu8eKt5BzvLXKzYhWucreESCp3U`, aliased to `200magicwordsapp.com`), confirmed via the production bundle hash changing (`index-DyNEZx1i.js` → `index-C5tqTW33.js`). Root cause of the missed webhook itself wasn't investigated further (out of scope for this pass; the code that shipped is identical to what was reviewed and approved either way).

**Production verification** (live on `https://200magicwordsapp.com`, post-deploy):
- **B6 signup checkbox** — verified via live DOM inspection (not just visual screenshot): both links present with `href="/privacy"` and `href="/terms"` respectively, both `target="_blank"`; submit button `disabled: true` before checking the box, `disabled: false` after. Exactly the intended copy visible: *"I am the parent or guardian of the child who will use this app, I consent to the data collection described in our Privacy Policy, and I agree to the Terms of Service."*
- **Home/session smoke pass**: created disposable account `fixr1smoke...`, signed in, completed the child-creation onboarding (name "FixR1SmokeKid", avatar, one interest), chose "Brand-new reader" at the placement-choice screen, landed on Home showing real data — correct greeting with the real child name, Unit 1 / "cat" as the starting word (expected: this account never underwent Placement Adventure, so no floor applies), streak/words/sparks all `0` (fresh account, correct). No console errors captured. Test account deleted after (`scripts/admin-user.mjs delete`).

## RUN TIMING (final)
- Start: 2026-07-06T16:04:29Z
- End: 2026-07-06T16:59:13Z
- Total: ~55 minutes. One unplanned delay: the stuck-deployment incident above added roughly 14 minutes of polling before the user was consulted and a manual deploy resolved it — otherwise no approval-wait gaps (both push approvals were answered promptly).

## DEFERRED (POST-LAUNCH, explicitly out of scope this run)
- A2: unit-advancement mastery gate has no minimum-attempt threshold
- A6: `learning_events.attempt_number` hardcoded to 1
- Difficulty step-down (struggle-based difficulty reduction) not implemented

## MERGE & PRODUCTION VERIFICATION
IN PROGRESS
