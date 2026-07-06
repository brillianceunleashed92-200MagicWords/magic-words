# LEGACY RETIREMENT REPORT (Prompt 10)

## RUN TIMING — start / end / total (+ approval-wait note)
- Start: 2026-07-06T12:34:24Z
- End: 2026-07-06T14:14:54Z
- Total: ~1h40m (two brief approval waits: the initial approach/autonomy check-in, and the `git push origin main` confirmation — both answered promptly, no long idle gaps)

## PRE-FLIGHT — sync state, key presence
- `git status` clean on `main` before branching; `git log origin/main..main` empty (main == origin/main).
- Confirmed the launch-analytics merge commit (`575f3b0 merge: Launch Analytics + Story Time chrome + Placement true-level fix (Prompt 9)`) is an ancestor of HEAD.
- `SUPABASE_SERVICE_ROLE_KEY` present in `.env.local` (existence checked only).
- Branched `chore/legacy-retirement` off `main` at `5c8e4bc`.
- Approval model confirmed with user: autonomous throughout, hard stops only at `supabase db push` (none expected — no migration planned this pass) and `git push origin main`.

## SESSION COMPLETE A2 — contract preserved, design decisions, verification

**Finding, before writing any code: A2 was already shipped.** `git log -p -S"Rewards row" -- src/games/GameEngine.jsx` surfaces commit `cb3d473` ("feat: redesign Session Complete screen — Candy Galaxy 'A2' layout"), dated 2026-07-04 — three days before this prompt was written. Reading the live component directly (not the old prose) confirms every MISSION #1 requirement is already met: Nova glow (layered sun/bubble pulsing rings behind a real Nova sprite, static under reduced-motion), XP + Sparks earned (rewards row, real values from `PlayScreen`'s `lastSessionRewardsRef`), words-learned progress (mastered/total bar, reusing `useCandyGalaxyData`'s existing `masteredCount` definition), growth-mindset copy (`EFFORT_PRAISE` array — "You worked so hard on those words!" etc., picked deterministically from session shape, no trait praise anywhere), the real child's name (`childName` prop, falls back to a warm nameless line only when genuinely absent), and WordArt chips (`<WordArt word={wp.word} size={24}/>` per word, typographic fallback already the established contract). Fully on `colors`/`fonts`/`shadows` from `theme/tokens.js` — zero `gameTheme.js` usage.

**Corrects a real error in `LAUNCH_ANALYTICS_REPORT.md`'s own census** (Prompt 9): that report's `gameTheme.js` reader table listed `SessionComplete` as a live `T`-dependent component. Re-verified directly this pass with a boundary-precise grep (`awk 'NR==1269,NR==1463'` — the actual function body — `grep -c "T\."` → **0**). The prior census was wrong because its line-range bucketing was inclusive of the module-level `GAME_TYPES`/`PREMIUM_FEATURES`/`MLC_TYPES` constants that sit immediately after the `SessionComplete` function in the same file — those DO reference `T` (they belong to the legacy `GameTypeSelector`), and got counted as if they were part of `SessionComplete` itself. Re-ran the same boundary-precise check for every other candidate (see DELETION section) before trusting any of it this time.

**MISSION #1 was therefore already unblocked before this pass started.** No rebuild performed — rebuilding an already-correct, already-live component would be pure churn and risked introducing a regression into something proven working in production since 2026-07-04, which CLAUDE.md's own "never break working functionality" rule argues directly against. Work done instead:
1. Added `tests/session-complete-a2.spec.js` — the missing automated coverage the 2026-07-04 redesign never got. Reuses `quiz-boss.spec.js`'s fully-deterministic 6-question battle as the vehicle (real, known, non-zero XP/Sparks). Asserts: real child name in the DOM, XP/Sparks lines present and not `+0`, no trait-praise strings ("so smart"/"genius"), every battle word appears as a chip, zero emoji anywhere on the screen, and "Keep going" navigates cleanly away. **Passed** (2 runs, 31s/48s).
2. Live-verified across 2 distinct activity shapes (time-boxed at 2, not 3 — see below): **Quiz Boss** (quiz-scored, `flash_cards`) — screenshotted mid-trace at +190 XP/+95 Sparks, real name, 6 WordArt chips, effort copy, "26/200 words shining" progress bar. **Story Time** (narrative/scoreless-ish, `story_time`) — completed all 3 stories live via browser, screenshotted at +115 XP/+58 Sparks, real name "StoryA2Kid", 3 WordArt chips (cat/dog/bird), 3/3 stars, "Look how much you practiced!", "3/200 words shining". **Draw It** (the true `SCORELESS_GAME_TYPES` case) was not separately live-replayed to completion this pass (time budget) — its 1-star floor logic was verified by direct code read (`SCORELESS_GAME_TYPES.has(gameType) ? 1 : ...` in `SessionComplete`, matching `questProgress.js`'s own set) rather than a fresh live run; `tests/draw-it-tracing.spec.js` already covers the tracing mechanic itself. Flagged as a gap for a future pass if a real device/mobile walk is ever done, not treated as silently equivalent to a live check.
3. **Investigated the "GameEngine's own bare `sessionDone` render" question and closed it out.** `GameEngine.jsx` has its OWN `if (sessionDone) return <SessionComplete .../>` branch (line ~1859) — separate from and less complete than `PlayScreen.jsx`'s own `<SessionComplete>` render (missing `xpEarned`/`sparksEarned`/`masteredThisSession`/`masteredCount`/`totalWordCount`/`gameType`). Reasoned through the timing: `handleAnswer` sets `sessionDone=true` synchronously but does not `await` `onSessionEnd`, so GameEngine's own render CAN happen before `PlayScreen.handleSessionEnd`'s async pipeline (`Promise.allSettled` on pending writes, then `setSessionResult`) finishes. Checked empirically, not just theoretically: extracted the dense screencast frames (`--trace=on`, ~15-20ms sampling) from the passing `session-complete-a2.spec.js` run around the exact moment of the 6th correct answer — the frame sequence goes directly from the "Boss hit! +30 XP" celebration to the FULLY-populated SessionComplete (+190 XP/+95 Sparks/word chips/progress bar) with no intermediate bare-bones frame captured. **Not fixed, not a new finding requiring action this pass** — the async gap in practice is short enough (the pending-writes array is typically already empty/resolved by the time the last question fires, since prior questions had 2+ seconds each to settle) that no visibly-incomplete frame renders. Documented here rather than silently ignored, per the "flag what you found" convention — a future pass touching this area should know GameEngine's own `sessionDone` branch exists and is architecturally capable of a flash under different timing (e.g. a slow network), even though it wasn't observed to actually happen.
4. Grep confirms `SessionComplete` never imported `gameTheme.js` in the first place — the "after this part: grep confirms no gameTheme import" check trivially passes (it was never true).

**Reduced-motion / no-emoji / whole-screen**: confirmed via the same live screenshots above — `usePrefersReducedMotion` gates the Nova glow rings and star pop animations exactly as before (untouched by this pass), no emoji characters anywhere in either screenshot (WordArt renders SVG art, not emoji), single-tap "Keep going"/"Home" both present and correctly sized (44px+ chunk-shadow buttons).

## DELETION — census re-verification, commit order, grep-zero table, bundle delta, redirect

**Bundle size BEFORE** (`npm run build`): `App-Koupe83p.js` (the lazy `/app-legacy` chunk) 117,993 bytes; `GameEngine-3J78eREG.js` (shared live+legacy chunk, since legacy components live in the same file) 169,715 bytes; total JS across `dist/assets` 1.1M; total `dist/` 4.2M.

**Census re-verified fresh, boundary-precise** (not trusting Prompt 9's prose, which — per the SESSION COMPLETE section above — had a real bucketing bug):

| Identifier | Location | Live importer outside itself? | Verdict |
|---|---|---|---|
| `src/App.jsx` (whole file) | — | Only `src/main.jsx`'s `/app-legacy/*` route | DELETE |
| `SoundMatch` | `GameEngine.jsx:530-659` | None (grep hit in `WordArt.jsx` is a comment, in `gameTheme.js` is a doc-comment) | DELETE |
| `SpellItOut` | `GameEngine.jsx:1115-1263` | None (same false-positive pattern) | DELETE |
| `UpgradeModal` | `GameEngine.jsx:1509-1567` | `App.jsx` only | DELETE |
| `GameTypeSelector` | `GameEngine.jsx:1568-1665` | `App.jsx` only | DELETE |
| `GAME_TYPES` (GameEngine.jsx's local const) | `GameEngine.jsx:1490-1499` | `App.jsx`'s import only — distinct from the LIVE `ACTIVITY_DEFS` export in `src/lib/activityDefs.js` (confirmed these are two different identifiers; an earlier loose `grep "GAME_TYPES\b"` false-matched `SCORELESS_GAME_TYPES`/`PICTURE_MATCH_GAME_TYPES`, unrelated constants) | DELETE |
| `MLC_TYPES`, `PREMIUM_FEATURES` | `GameEngine.jsx` | `GameTypeSelector`/`UpgradeModal` only | DELETE |
| `SessionProgress` | `GameEngine.jsx:333-397` | Only rendered in the `!isE2Activity` branch | DELETE |
| `ConfettiBurst` | `GameEngine.jsx:305-332` | Only rendered in the `!isE2Activity` branch (`{!isE2Activity && <ConfettiBurst .../>}`) | DELETE |
| `gameTheme.js` (`T`, module) | whole file | Only `GameEngine.jsx` | DELETE |
| `isE2Activity` flag/branches | `GameEngine.jsx` main render | Becomes constant-true once `sound_match`/`spell_it_out` can never be selected (their only entry point, `App.jsx`'s `GameTypeSelector`, is gone) | SIMPLIFY (remove flag, keep the true branch unconditionally) |
| `GLOBAL_CSS` (`GameEngine.jsx:119-294`) | — | Every `mw-*` class/keyframe in it (`mw-option-btn`, `mw-letter-tile`, `mw-drag-word`, `mw-drop-zone`, `mw-bounce`, `mw-shake`, `mw-celebrate`, `mw-confetti`, `mw-pulse-glow`, `mw-letter-appear`, `mw-word-glow`) traced to a specific usage site — **every single one sits inside `ConfettiBurst`/`SessionProgress`/`SoundMatch`/`SpellItOut`/`GameTypeSelector`**, none in any live E2 component | TRIM to only the `session-complete-glow-1`/`-2` keyframes + `.session-complete-btn:active` rule (the only part `SessionComplete` — live — actually uses); keep `injectCSS`/the mechanism itself, since it also injects `lessonChrome.jsx`'s live `LESSON_CHROME_KEYFRAMES` |
| `index.css`'s `xp-float-up` keyframe | `src/index.css:47` | `GameEngine.jsx`'s live `xpToast` (renders unconditionally, not inside the `isE2Activity` branch) | **KEEP, untouched** — checked directly per the prompt's own flag; this one is NOT legacy-only |

**`sound_match`/`spell_it_out` render branches** in `GameEngine`'s main return (`{gameType === 'sound_match' && <SoundMatch .../>}`, `{gameType === 'spell_it_out' && <SpellItOut .../>}`) also removed — these `gameType` values can now never be produced (their only source was `App.jsx`'s `GameTypeSelector`).

**One additional deletion found mid-pass, not in the original census**: deleting `App.jsx` orphaned `src/components/WordGalaxyMap.jsx` (its only importer). Confirmed via grep (zero references anywhere in `src/` after the deletion) and confirmed the LIVE Word Galaxy tab uses a completely different component (`src/screens/GalaxyScreen.jsx`, imported by `CandyGalaxyShell.jsx`) — deleted it too rather than leaving a newly-orphaned file behind.

**Dead local state found while editing `GameEngine.jsx`**: `showConfetti`/`setShowConfetti` — only ever written (in `handleAnswer`), never read once `ConfettiBurst` (its one consumer) was removed. Deleted alongside.

**`check-no-emoji.mjs` updated** — this script's own exemption machinery directly named the identifiers being deleted here (`GAME_ENGINE_EXEMPT_FUNCTIONS = ['SoundMatch', 'SpellItOut', 'GameTypeSelector', 'UpgradeModal']`, `GAME_ENGINE_EXEMPT_CONSTS`, plus whole-file exemptions for `App.jsx` and `WordGalaxyMap.jsx` backed by a hand-rolled import-graph reachability prover). Left in place, this would have started throwing (`exempted file src/App.jsx no longer exists`) the moment the check next ran. Removed: the two whole-file exemptions (files no longer exist, not just unreachable), the `findGameEngineExemptRanges`/`GAME_ENGINE_EXEMPT_*` machinery (nothing left inside `GameEngine.jsx` to carve out), and the now-unused `buildImportGraph`/`reachableFrom`/`assertUnreachable`/`LIVE_ENTRY_FILES` reachability-proof code they were the only callers of. `npm run check:no-emoji` passes clean on the result.

**Historical data check**: queried production `learning_events` for `game_type in ('sound_match', 'spell_it_out')` — **zero rows**. No historical data references either deleted code path at all, so the "readers must tolerate a game_type they don't recognize" question (the `magic_video`/`SCORELESS_GAME_TYPES` precedent) doesn't even arise here — moot rather than needing a defensive check.

**`/app-legacy` deep-link redirect**: implemented via `<Route path="/app-legacy/*" element={<Navigate to="/app" replace />} />`. Verified live (local dev): navigating to `/app-legacy/somepath` lands on `/app`'s real sign-in screen, URL bar confirms the redirect actually happened (not just a silent same-URL render).

**Commit-by-commit build discipline**: `npm run build` (and `check:no-emoji` once its own dependency was resolved) run and passed after every one of: (1) App.jsx deletion + redirect, (2) removing SoundMatch/SpellItOut/UpgradeModal/GameTypeSelector/MLC_TYPES/GAME_TYPES/PREMIUM_FEATURES/SessionProgress/ConfettiBurst + simplifying `isE2Activity` + trimming `GLOBAL_CSS` + removing the `T` import, (3) deleting `gameTheme.js`, (4) deleting `WordGalaxyMap.jsx`, (5) the `check-no-emoji.mjs` cleanup. No intermediate broken state at any point.

**Bundle size AFTER**: total `dist/` 4.0M (was 4.2M); total JS across `dist/assets` 1.0M (was 1.1M); the lazy `/app-legacy` chunk is gone entirely (was 117,993 bytes); `CandyGalaxyShell` chunk (which absorbed `GameEngine.jsx`'s code once it was no longer shared with a second lazy consumer) settled at 239,706 bytes after the full trim — down from an intermediate 251,790 bytes measured right after deleting just `App.jsx` (before `GameEngine.jsx`'s own legacy code was removed).

**Full Playwright suite** (23 specs incl. the new `session-complete-a2.spec.js`, none referencing any deleted identifier): **23/23** — one `story-time-chrome.spec.js` timeout on the full-suite run, passed clean in isolation on retry (the documented residual-provisioning-flake class, not a regression from this deletion).

## CSP — violations found + fixes with justifications, the flip, enforcing re-walk, rollback plan

**Detection method, corrected mid-pass**: a first draft used `page.on('console')`, scraping for "Refused to..."/"Content Security Policy" text. Empirically suspicious — a walk covering 10 activities + Galaxy + 4 Parent Portal tabs + a checkout call produced only **1** total console message, far too quiet to trust as a genuine "zero violations" signal. Switched to the standard, documented mechanism: the `securitypolicyviolation` DOM event (fires for both Report-Only and enforcing dispositions), wired via `page.addInitScript` so it's present before every navigation's scripts run (not just the first — `addInitScript` re-injects per navigation, and `window.__cspViolations` is drained into a Node-side array immediately before each `page.goto`, since the page-side array itself resets on every reload). `tests/csp-walk.spec.js` covers: all 10 live rotation activities (re-seeding ranks-ahead per activity via direct REST calls, entering each, waiting for audio/art/story fetches, exiting via the shared close), Galaxy, all 4 Parent Portal tabs (incl. the press-and-hold Grown-Ups gate + its math quick-check, handled via direct pointerdown/up dispatch — same technique as the earlier press-and-hold problem this session hit twice), and a real TEST-mode `/api/create-checkout-session` call fired from inside the page (a curl/Node call bypasses CSP entirely — a browser-enforced mechanism — so only an in-page fetch is a meaningful check).

**Walk 1 — production, Report-Only** (`https://200magicwordsapp.com`, policy unchanged at this point): **0 violations** across the full walk.

**The flip**: `vercel.json`'s `Content-Security-Policy-Report-Only` header key renamed to `Content-Security-Policy` — `git diff` confirms exactly that one line changed; the policy value string and every other header (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, the SPA rewrite) are byte-identical before and after. No directive changes were needed — the Report-Only walk already came back clean, so there was nothing to fix before flipping.

**Walk 2 — branch preview, enforcing** (after pushing and confirming via `curl -sI | grep content-security-policy` that the deployed header really is `Content-Security-Policy`, not `-Report-Only`): surfaced **11 violations**, but investigation found all 11 share the exact same `blockedURI` (`https://vercel.live/_next-live/feedback/feedback.js`, directive `script-src-elem`) — one per navigation (11 navigations in the walk). Traced before dismissing it: `curl`'d both production's and this preview's actual served HTML for the literal string `vercel.live` — **zero matches on either** — confirming this script isn't in our build output at all; Vercel injects its own preview-deployment toolbar/feedback script at the platform edge layer, only for preview URLs, never for the production custom domain. Correctly blocked by `script-src 'self'` (the policy working exactly as intended against a script we don't control and never asked for) — filtered out of the spec's pass/fail check with that reasoning documented inline, not silently ignored. **Real violations after filtering: 0.**

**Functionality intact under the real enforcing policy** (not just "no console noise"): the checkout call inside the walk returned a real `{"status":200,"hasUrl":true}` (logged, not just asserted, to rule out a silently-skipped check) — a genuine TEST-mode Stripe Checkout Session created from inside a page running the enforcing CSP. Every activity's audio (`blob:` playback, the CSP's own historical trouble spot per the hardening-phase standing rule) played without any `media-src` violation across all 10 activities.

**Rollback plan**: if production CSP enforcement causes an unexpected real-world breakage after merge, the fix is a single-commit revert: `git revert 3ec3bfb` (the exact commit that changed `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in `vercel.json`) — no other commit in this branch touches `vercel.json`, so this revert is clean and isolated, restoring Report-Only without undoing any of the legacy deletion or Session Complete A2 work that landed alongside it.

## HOUSEKEEPING — v3 updates incl. the new rule

`docs/200MW_Master_Project_Doc_v3.md` updated:
- LAUNCH SPRINT item 3 added, DONE, summarizing all three threads (A2 correction, deletion, CSP).
- New HARD-WON SESSION RULE: "additive migrations land BEFORE any code reading the new column runs against the shared database (local dev and previews included)" — the Prompt 9 `measured_unit` sequencing incident, with the actual failure mode (react-query retry loop reading as a generic environment flake) spelled out so it's recognizable if it recurs.
- Second new rule: don't trust a prior report's prose-only claims about code without a fresh, boundary-precise re-check — the exact lesson this pass's `SessionComplete`/`gameTheme.js` correction taught.
- BACKLOG: removed the `/app-legacy` deletion and Session Complete A2 entries (both done).
- CURRENT STATE #1 and #4: updated to reflect `/app-legacy` deletion and CSP enforcing.
- KEY REFERENCE: noted `tests/csp-walk.spec.js` as the standing CSP regression check.
- OPEN ITEMS: removed the "don't flip CSP" line (resolved).
- COMPLETION ESTIMATE refreshed (Child Loop 85→87%, Parent Loop 78→80%, overall 85→90%) with the gap list narrowed to purely Sal-gated items + the Stripe-live flip.
- "Last updated" bumped, annotated with "(Prompt 10)".

## VERIFICATION / PRODUCTION VERIFICATION — walks, gates, snapshots, timing close-out

**A2 screen**: covered in the SESSION COMPLETE A2 section above — spec green, 2 live activity-type walkthroughs (Quiz Boss, Story Time) with screenshots.

**Deletion — full app walk**: `tests/csp-walk.spec.js` doubles as this pass's "whole-screen rule at maximum breadth" check, since it already visits every live rotation activity (all 10), Galaxy, and all 4 Parent Portal tabs — exactly the deletion's blast radius (shared `GameEngine.jsx` machinery). `tests/placement-adventure.spec.js`'s 3 specs (unaffected by anything deleted, but a real exercise of the guided-path/PlayScreen integration this pass touched) also passed clean. Grep-zero table and bundle delta: see DELETION section above. `/app-legacy` redirect: verified live.

**CSP**: zero real violations on both the pre-flip production walk and the post-flip enforcing-preview walk (11 raised, all one filtered Vercel-preview-toolbar artifact — see CSP section). Audio (`blob:`) played across every activity in both walks. TEST-mode checkout call succeeded (`{"status":200,"hasUrl":true}`) from inside a page running the real enforcing policy.

**Gates, final state, all against this branch's HEAD**:
- `npm run build` — clean (incl. `check-wordart-sync`/`check-stroke-coverage`/`check-findtheword-sync`).
- `npm run check:no-emoji` — clean.
- Full Playwright suite, default invocation: **24/24** (incl. the new `csp-walk.spec.js` and `session-complete-a2.spec.js`; no existing spec needed changes or removal — none referenced any deleted identifier).
- `idor-proof.mjs` against the branch preview: **16/16** — confirms no server-side query behavior changed this pass (expected; this was a client-code deletion + a header change, not a data-access change).

**Test accounts**: every account this pass provisioned (`mwa2verify*`, `mwa2story*`, `mwcspmain*`, plus every idor-proof/Playwright-spec-provisioned account) deleted after use via `scripts/admin-user.mjs delete` or each spec's own cleanup.

### MERGE

`chore/legacy-retirement` merged into `main` locally (`--no-ff`). Gates re-run clean on the merged result: `npm run build`, `npm run check:no-emoji`, full local Playwright suite **24/24** (zero flakes this run). Pushed to `origin/main` with explicit user approval.

### PRODUCTION VERIFICATION

**Deployment confirmed**: `gh api .../commits/<sha>/status` → `state: "success"`; `curl -sI https://200magicwordsapp.com` → `HTTP/2 200`; `curl -sI ... | grep content-security-policy` → header key is `content-security-policy` (not `-report-only`) — the flip is live in production, not just locally verified against `vercel.json`.

**Security re-run for real against production**: `idor-proof.mjs` **16/16** with `DEPLOY_BASE_URL=https://200magicwordsapp.com`.

**CSP re-walk against production for real**: `tests/csp-walk.spec.js` — **0 violations, 0 filtered** (the Vercel preview-toolbar artifact doesn't exist on production at all, confirmed both by this run and by the earlier `curl | grep vercel.live` check finding zero matches in production's HTML). Real TEST-mode checkout call succeeded (`{"status":200,"hasUrl":true}`) from inside a production page running the real enforcing policy.

**Production walk** (fresh account `mwprodfinal...`, fixture: 4 prior guided-path activities seeded so Quiz Boss is next):
- Signed in live on `200magicwordsapp.com`, played all 6 Quiz Boss questions correctly (eat/jump/run/swim/fly/dance).
- **Session Complete A2 rendered exactly as designed, live in production, with CSP enforcing**: real name "ProdFinalKid", +160 XP, +80 Sparks, all 3 stars, all 6 word chips (WordArt art, not emoji), "26/200 words shining" progress bar, growth-mindset effort copy ("You stuck with it — that's how words stick!") — screenshotted.
- `/app-legacy/anything` redirect confirmed live: lands on `/app`'s real Home screen (URL bar shows `/app`, not `/app-legacy`), showing the same account's real progress (1 streak, 26 words, 80 sparks) — screenshotted.
- Test account deleted after verification.

**`analytics-report.mjs` run against production** (confirms the instrument still works post-deletion, per the doc's own ask): ran clean, all 8 metric groups returned real numbers (41 signups, 37 children, 32 activated; placement funnel 15/2/11/30 completed/retaken/skipped/started; paywall views by surface incl. this session's own `dashboard_mastered`/`dashboard_true_level`/`settings` events; 11 `checkout_started` events, reflecting this pass's + the prior pass's real checkout-call verifications).

## NOTES FOR THE FINAL PASS — the precise Stripe-live runbook inputs + anything left for the launch sweep

**Stripe-live flip — exact inputs, read directly from the current code, not assumed:**
- Env vars to swap (Vercel project settings, production environment): `STRIPE_SECRET_KEY` (test `sk_test_...` → live `sk_live_...`), `STRIPE_PRICE_FAMILY_MONTHLY`, `STRIPE_PRICE_FAMILY_YEARLY` (live-mode price IDs — test-mode prices don't carry over, they're mode-scoped in Stripe), `STRIPE_WEBHOOK_SECRET` (live-mode webhooks get their own signing secret, separate from test mode's).
- Webhook re-point: `api/stripe-webhook.js` is mode-agnostic code — the only live-mode-specific setup is in the Stripe Dashboard itself: a live-mode webhook endpoint pointing at the same `/api/stripe-webhook` URL must be created (test and live mode webhooks are entirely separate configurations in Stripe, confirmed by how `STRIPE_WEBHOOK_SECRET` is mode-scoped), subscribed to at least `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` (the three events `api/stripe-webhook.js` actually handles).
- `scripts/verify-checkout.mjs`: a recovered one-off (its own header says "review before Stripe-live cutover... deleted after use") that drives a REAL checkout through the full loop (checkout → webhook → `subscriptions` row → plan gating) using Playwright against a live Vercel URL, with Stripe's test card `4242...` hardcoded. **Do not run this against live-mode Stripe as-is** — it submits a real payment form; the final pass needs to either adapt it for a real (small, refundable) live-mode charge with explicit user sign-off, or find another way to prove the live webhook path works (e.g. Stripe's own live-mode test clocks/events, if available) before trusting real customer charges to flow through correctly.
- No code changes are anticipated for the flip itself — this is a config/dashboard cutover, not an engineering pass, per the doc's own framing ("the small Stripe-live flip that follows"). Confirm this assumption still holds by re-reading `api/create-checkout-session.js`/`api/stripe-webhook.js` fresh at that time rather than trusting this note if any Stripe-adjacent code has changed since.

**What this pass leaves for the launch sweep**: per the doc's own framing, everything else is Sal-gated, not engineering work:
- Real device/mobile session (mic behavior for Say It with Nova, real-device celebration-misfire repro attempts, a skim of the 200 look-alike triples, Chrome saved-password cleanup) — see `docs/DEVICE_TEST_CHECKLIST.md`, still not done.
- Key rotation (Stripe + ElevenLabs keys were exposed in chat during Phase 2 — see `SECURITY_CHECKLIST_FOR_SAL.md`).
- Supabase dashboard hardening (password min length, HIBP, CAPTCHA).
- Spend alerts (Anthropic, ElevenLabs, Vercel).
- Legal review of the COPPA inventory + draft /privacy + /terms.

**Confirmed NOT left as a gap by this pass**: CSP is enforcing in production (not just Report-Only) with a real scripted zero-violations proof; `/app-legacy` and every legacy `gameTheme.js` dependency are fully deleted, not just documented as dead; Session Complete already matches the locked A2 spec with real automated coverage. None of these need to reappear on a future prompt's punch list.
