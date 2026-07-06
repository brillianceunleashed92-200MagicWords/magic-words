# LEGACY RETIREMENT REPORT (Prompt 10)

## RUN TIMING — start / end / total (+ approval-wait note)
- Start: 2026-07-06T12:34:24Z
- End: IN PROGRESS
- Total: IN PROGRESS

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
IN PROGRESS

## HOUSEKEEPING — v3 updates incl. the new rule
IN PROGRESS

## VERIFICATION / PRODUCTION VERIFICATION — walks, gates, snapshots, timing close-out
IN PROGRESS

## NOTES FOR THE FINAL PASS — the precise Stripe-live runbook inputs + anything left for the launch sweep
IN PROGRESS
