# 200 MAGIC WORDS — PROMPT 10: LEGACY RETIREMENT + SESSION COMPLETE A2 + CSP ENFORCE
## Tenth prompt (launch sprint, final non-gated engineering). Self-contained. After this pass, the only work left before launch is Sal-gated (device session, key rotation, legal) plus the small Stripe-live flip that follows them.

## MISSION
1. **Session Complete → A2 redesign** (do FIRST — it unblocks everything else). `SessionComplete` is LIVE (imported by `PlayScreen.jsx`, renders after every session — the census correction in `LAUNCH_ANALYTICS_REPORT.md`) and is the last live `gameTheme.js` dependency. Rebuild it to the locked A2 spec from the backlog: Nova glow, XP + Sparks earned, words-learned progress, growth-mindset copy (effort-focused, e.g. "You worked hard on 3 words today!"), the REAL child's name, and the session's words as small WordArt chips (typographic treatment for no-art words — the established rule). Constraints: fully on Candy tokens/`lessonChrome` primitives; modest scale — this fires after EVERY activity, so it stays a warm, quick, one-tap-to-continue screen per the "mastery is the reward" principle (LevelUp keeps the big treatment); reduced-motion respected; no emoji; the `onSessionEnd` pipeline (v3 item 7 — `Promise.allSettled` on pending learning-event writes before completion checks) is DISPLAY-ONLY territory here: the redesign must not alter when/how it's invoked or what it awaits.
2. **`/app-legacy` deletion** — the dedicated, explicitly-scoped pass two reports asked for. Per the corrected census: delete the legacy route (`/app-legacy/*` in `src/main.jsx`), the `App.jsx` tree, `SoundMatch`, `SpellItOut`, `UpgradeModal`, `GameTypeSelector` + `GAME_TYPES`; `SessionProgress` and `GameEngine.jsx`'s `!isE2Activity` branches become dead once every live gameType is E2 (they are, post-Story-Time) — remove them, and if `isE2Activity` is then constant-true, remove the flag and branch structure itself (mechanical follow-through, allowed). Then delete `gameTheme.js` + its `injectCSS`. Decide `/app-legacy` deep-link behavior (recommend: redirect to `/app`) and implement it. Grep-zero proof for every deleted identifier; bundle size before → after in the report.
3. **CSP: walkthrough → fix → ENFORCE.** The CSP has sat in Report-Only since the hardening phase with a standing rule: don't flip until a walkthrough confirms zero violations. This pass performs that walkthrough properly: a scripted full-app walk (every rotation activity including audio/`blob:` playback, Story Time, placement ladder, Galaxy, Parent Portal all tabs, a TEST-mode checkout redirect, account settings) with a Playwright console listener capturing every CSP violation report. Fix each violation at the source or via a justified directive change (each directive edit gets one line of reasoning in the report — no wildcard shortcuts). Flip Report-Only → enforcing in `vercel.json` (mind the SPA rewrite living in that file — it has broken before), re-run the full walk clean, and document the one-commit rollback (revert the vercel.json commit) in the report in case production surprises.
4. **Housekeeping**: add the new hard-won rule to v3 — "additive migrations land BEFORE any code reading the new column runs against the shared database (local and preview included)" (the 0034 sequencing incident); v3 updates (backlog items removed, LAUNCH SPRINT item 3 DONE, estimate refresh, gameTheme/legacy references purged from KEY REFERENCE).

Branch `chore/legacy-retirement` off main. Scope guards: NO Stripe changes (live mode is the next pass, gated on Sal), NO narration-system work, NO new features beyond the locked A2 spec.

## PRE-FLIGHT (gate)
1. `git status` clean; `git log origin/main..main --oneline` empty (push first with approval if not). Confirm the launch-analytics merge commit is an ancestor of HEAD.
2. `SUPABASE_SERVICE_ROLE_KEY` available (shell env or `.env.local`) — existence only, never printed.

## STEP 0 — REPORT FILE FIRST + RUN TIMING (standing template)
Create `docs/LEGACY_RETIREMENT_REPORT.md` with the REPORT headers below, "IN PROGRESS" under each, RUN TIMING start timestamp. Close out with end + total (note any long approval-wait gaps so wall-clock reads honestly).

## AUTONOMY & RULES
Standard block: autonomous Bash; stops for secrets, destructive DB ops beyond own `nextgenprecisiondrones+*` accounts, live payment mode, history rewrites. No migration is expected this pass — if one becomes necessary, it stops for `supabase db push` and lands BEFORE any code reading it (the new rule). Fresh test accounts, deleted after. Candy tokens, whole-screen verification, `getByRole`, `db-query.mjs`, full gates before merge.

Known traps (do not rediscover): rAF throttling in unfocused tabs; hidden-tab media suspension (4s race on audio waits); overlap probes = synchronous `.paused`; local Vite serves no `/api`; `/api/speak` possibly absent on previews; Playwright `workers: 1` + the residual provisioning-flake class (re-run in isolation before calling regression); the census table in `LAUNCH_ANALYTICS_REPORT.md` is the authoritative deletion map — re-verify it with fresh greps before deleting, don't trust prose alone (the idor-count lesson).

**CORE METHODOLOGY RULE:** anti-phonics, absolute. A2's copy is growth-mindset praise about effort and words learned — whole words only, no letter-level anything.

**DESIGN LAW:** DESIGN_BRIEF.md throughout for A2 — chunk shadows + press-down, 44px+, cloud cards, Baloo 2/Quicksand, no red/X, no emoji, reduced-motion. WordArt chips follow the `has_art` contract exactly (art when true, typographic when false, never a broken image).

Read first: `SessionComplete`'s current implementation + every prop `PlayScreen.jsx` passes it (the contract to preserve), `PlayScreen.jsx`'s `onSessionEnd` flow (v3 item 7 — understand it before touching the screen it feeds), `LevelUpCelebration.jsx` (the scale ceiling A2 must stay under), the census table + `src/main.jsx`'s route map, `GameEngine.jsx`'s `!isE2Activity` branches, `vercel.json` (CSP block AND the SPA rewrite), `xp-float-up`/any `index.css` rules shared with the legacy tree (Prompt 7 noted one — safe to simplify once the legacy caller dies), prior NOTES sections.

## PART 1 — SESSION COMPLETE A2 (before the deletion — order matters)
- Baseline: screenshot the current T-token screen; document the exact props/callbacks contract.
- Rebuild per the MISSION #1 spec. Data it shows must be what the pipeline already provides — if a datum (e.g., session word list for chips) isn't in the current props, thread it from what `PlayScreen` already knows; do NOT add new queries or writes.
- Verify: complete real sessions across ≥3 activity types (quiz-scored, scoreless Draw It, Story Time) — correct name, correct XP/Sparks matching the toast/DB, correct word chips (art + typographic mix), one tap continues, reduced-motion pass, whole-screen. New Playwright spec asserting the screen renders with the child's name and continues cleanly.
- After this part: grep confirms `SessionComplete` no longer imports `gameTheme.js`.

## PART 2 — /APP-LEGACY DELETION
- Re-verify the census with fresh greps (route table, `activityDefs`, every import of each doomed identifier). Record bundle size (build output) BEFORE.
- Delete in dependency order; after each commit, `npm run build` must pass (no intermediate broken states). Remove `GameEngine`'s dead branches; simplify the `isE2Activity` structure if it's now constant.
- `/app-legacy` deep link → implement the redirect to `/app`; verify live.
- Delete `gameTheme.js` + `injectCSS`; simplify any `index.css` rules whose only other consumer was the legacy tree (the `xp-float-up` note) — visual-parity check on the surviving consumer afterward.
- Grep-zero proof table in the report (identifier → 0 hits). Bundle size AFTER (report the delta).
- Historical data check: no DB rows reference deleted code paths in a way any reader gates on (the magic_video precedent says readers are tolerant — spot-confirm once for the legacy game types).

## PART 3 — CSP WALKTHROUGH → ENFORCE
- Scripted violation-capture walk against the CURRENT production (Report-Only) build first: Playwright console listener, the full route/activity coverage list from MISSION #3, violations logged verbatim.
- Fix each violation (source fix preferred; directive change with one-line justification otherwise). No `unsafe-*` additions without explicit reasoning; no wildcards.
- Flip to enforcing in `vercel.json` — touch ONLY the CSP header block; diff-verify the SPA rewrite and security headers are byte-identical around it.
- Re-run the full walk against the branch preview under the enforcing policy: zero violations, zero broken functionality (audio `blob:` playback especially — the historical trouble spot), checkout redirect still reaches Stripe TEST.
- Rollback plan documented: the exact commit to revert if production misbehaves.

## PART 4 — HOUSEKEEPING
- v3: the new migrations-before-code rule into HARD-WON SESSION RULES; LAUNCH SPRINT item 3 DONE; backlog entries for `/app-legacy` + Session Complete A2 removed; KEY REFERENCE purged of gameTheme/legacy mentions; estimate paragraph refreshed; "Last updated" bumped.
- NOTES must hand the final pass a precise state: what the Stripe-live flip needs (env vars to swap, webhook re-point if any, `verify-checkout.mjs` usage), and confirmation that CSP/enforce + legacy deletion left nothing for the launch sweep but Sal's checklist items.

## VERIFY (fresh accounts; delete after)
- A2 screen: the PART 1 checks, all three activity types, spec green.
- Deletion: full app walk touching EVERY live activity + placement + portal after the deletion (the whole-screen rule at maximum breadth — this pass removed shared machinery); grep-zero table complete; `/app-legacy` redirects; bundle delta reported.
- CSP: zero violations across the full walk on the enforcing preview; audio plays; checkout TEST redirect works.
- Gates: `npm run build` (all sync checks), `check:no-emoji`, full Playwright default invocation (suite grows: A2 spec; all existing specs must survive the deletion untouched — any spec referencing deleted code is itself legacy and gets removed with justification), `idor-proof.mjs` 16/16 with `DEPLOY_BASE_URL` against the preview (no server queries should change this pass — if any did, say so explicitly).

## MERGE & PRODUCTION (the full leg)
All green → merge → push (approval) → deploy confirmation (`gh api .../commits/<sha>/status` + `curl -sI https://200magicwordsapp.com`) → production walk: one full session ending on the new A2 screen (screenshot), one Story Time session (CSP + audio under enforcement), `/app-legacy` redirect live, browser console clean of CSP violations across the walk, run `analytics-report.mjs` once (the instrument still works post-deletion) → append PRODUCTION VERIFICATION (+ RUN TIMING close-out) → commit docs → push (second approval). Delete test accounts.

## REPORT (docs/LEGACY_RETIREMENT_REPORT.md — created at STEP 0, filled live)
### RUN TIMING — start / end / total (+ approval-wait note)
### PRE-FLIGHT — sync state, key presence
### SESSION COMPLETE A2 — contract preserved, design decisions, verification
### DELETION — census re-verification, commit order, grep-zero table, bundle delta, redirect
### CSP — violations found + fixes with justifications, the flip, enforcing re-walk, rollback plan
### HOUSEKEEPING — v3 updates incl. the new rule
### VERIFICATION / PRODUCTION VERIFICATION — walks, gates, snapshots, timing close-out
### NOTES FOR THE FINAL PASS — the precise Stripe-live runbook inputs + anything left for the launch sweep
