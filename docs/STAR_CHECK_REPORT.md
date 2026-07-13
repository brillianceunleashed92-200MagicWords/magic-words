# STAR_CHECK_R1 — Run Report

**Start (UTC):** 2026-07-13T20:54:11Z
**Branch:** `feat/star-check-r1` (from `origin/main`)
**Worktree:** `.claude/worktrees/star-check-r1`
**origin/main SHA:** `632d63d64f032941d677b4b30ba5a574fc24f474`
**Mockup source:** `~/Downloads/200mw-design/mockup-O-blank-assessment.html`
**Mockup sha256:** `329117647088528c2c9a89fc97bf0c1b0df3307af3b34c3efe8c2eefa97dcc9f`

## Step 0 — Preconditions

- `git worktree list` — `main` is checked out at `.claude/worktrees/fix-story-quality` (misleading historical name, per warning in the prompt) — confirmed at SHA `632d63d` matching `origin/main`.
- Gate 1 (`docs/DESIGN_BRIEF_V2.md` exists on `origin/main`): PASS — confirmed via `git cat-file -e origin/main:docs/DESIGN_BRIEF_V2.md`.
- Gate 2 (mockup file exists in Downloads): PASS — see sha256 above.
- Run worktree created: `git worktree add .claude/worktrees/star-check-r1 -b feat/star-check-r1 origin/main`.
- Env sanity: `.env.local` was not present in the fresh worktree (untracked file, git worktrees don't copy untracked files) — copied from the root checkout (`/Users/f00517z/magic-words/.env.local`, 13 vars). Confirmed present by name only: `SUPABASE_SERVICE_ROLE_KEY`. All Playwright/gate commands in this run will be prefixed `set -a; source .env.local; set +a`.

## Phase 1 — Read-only recon

STATUS: DONE

### 1. Entry points (v1 Placement Adventure)
`grep -rn "PlacementAdventure" src/ api/` → 3 hits, all client-side (no server-side name coupling):
- `src/CandyGalaxyShell.jsx:13,134` — the only render site. Two paths lead here via the shared `useUIStore` `placementFlow`/`placementChildId` state:
  1. **New child creation**: `ChildOnboardingScreen.onDone` → `startPlacementFlow(child.id, 'choice')` → `PlacementChoiceScreen` (`placementFlow === 'choice'`) → `onChoosePlacement` → `startPlacementFlow(placementChildId, 'adventure')` → renders `PlacementAdventureScreen`.
  2. **Retake**: `src/screens/parent/SettingsTab.jsx:98` "Retake placement" button → `startPlacementFlow(activeChild.id, 'adventure')` directly (skips the choice screen).
- `src/stores/useUIStore.js:44-47` — `placementFlow`/`placementChildId`/`startPlacementFlow`/`clearPlacementFlow` state shape.
- `src/screens/CheckInScreen.jsx:23` — comment only, confirming CheckInScreen deliberately does NOT reuse `PlacementAdventureScreen` itself (reuses `PlacementProbe` instead).
- **No `PlacementReportCard.jsx` retake trigger** — that card (`src/screens/parent/PlacementReportCard.jsx`) is read-only display (placement_unit/measured_unit/placement_completed_at), no button; the retake button lives in `SettingsTab.jsx` instead.
- v2 entry-point swap in Phase 4 must change both `CandyGalaxyShell.jsx:132-138` (adventure branch) call site AND leave `PlacementChoiceScreen`/`SettingsTab.jsx` trigger wiring pointed at a new `placementFlow === 'starcheck'` (or equivalent) value — not delete the choice/retake affordances themselves.

### 2. Server contract (`api/session-generator.js`)
- `placementMode` (`req.body?.placementMode === true`, line 732) routed to `handlePlacement` (line 462); `checkinMode` (line 733) to `handleCheckin` (line 588). Both live in the same file, same shared 10-req/min rate limit (see master doc KEY REFERENCE — "a verification script hitting one mode can starve another on the same identity").
- **Signed stateless token** (`api/_lib/placementLadder.js`): `signLadderState(state, context)` / `verifyLadderState(token, expectedChildId, context)`. HMAC-SHA256, key = `HMAC(SUPABASE_SERVICE_ROLE_KEY, context)`, base64url payload+sig, 15-min max age, `timingSafeEqual` compare. `context` defaults to `'placement-ladder-v1'` (placement) and is explicitly `'checkin-ladder-v1'` for check-in (line 564) — a check-in token can never verify under the placement context or vice versa. **v2 must use a third context string, `'star-check-v1'`, passed the same way.**
- `RUNGS = [1, 3, 5, 7, 9, 12, 15, 18]` (unit numbers) drives placement/check-in; v2's bank is a fixed 25-word/5-level table instead — no reuse of `RUNGS` itself, only the token-signing *pattern*.
- **`child_profiles` write** (`handlePlacement`'s `finalize`, line 490-510): `placement_unit` (free-tier-capped: `plan === 'family' ? trueMeasuredUnit : Math.min(trueMeasuredUnit, FREE_TIER_MAX_UNIT)`, `FREE_TIER_MAX_UNIT = 5` at line 63), `measured_unit` (uncapped true value), `placement_completed_at`. These columns are REVOKE-protected from direct client writes (migration 0032) — this `admin.from('child_profiles').update(...)` server-side call is the only path. **v2 finalize must call through the same shape** (or a shared helper) — no new columns, no schema change.
- **Never-regress** (`handleCheckin`'s `finalize`, line 605-632): `appliedMeasured = Math.max(rawMeasured, priorMeasuredUnit)` (line 618) — this exact pattern (not present in placement itself, since placement has no prior value to regress against) is what v2's check-in-equivalent reasoning would mirror; the plain first-placement finalize does not need it, but **the bank's `[PROPOSED]` mapping and its resulting `rawMeasuredUnit` should still route through `finalize`'s existing cap logic (`Math.min(trueMeasuredUnit, FREE_TIER_MAX_UNIT)`) unmodified** — do not re-implement the cap.
- **Event logging** — `api/_lib/productEvents.js`'s `logProductEvent(admin, eventType, { userId, childId, payload })` (single shared function, all callers): inserts into `product_events` with columns `event_type, user_id, child_id, payload` (line 14-16). **The detail column is `payload` (jsonb, defaults to `{}`)** — confirmed by reading the insert directly, not inferred. Example existing call: `logProductEvent(admin, 'placement_completed', { userId: verifiedUser.id, childId, payload: { placementUnit, trueMeasuredUnit } })` (session-generator.js:506-508). **Decision rule resolved: `per_word` CAN go in `payload` — the column is a free-form jsonb, not a fixed-shape table — so the Phase 1 "if column exists" condition is satisfied. Zero migrations needed either way, confirming the decision rule's "either way: zero migrations" note.**
- Event types confirmed in code: `placement_started`, `placement_retaken`, `placement_completed`, `placement_skipped` (handlePlacement); `checkin_started`, `checkin_completed` (handleCheckin). v2 will log `placement_started`/`placement_retaken`/`placement_completed`/`placement_skipped` per the spec (reusing the SAME event-type strings as v1, distinguished by a new `mode:'star_check_v1'` key inside `payload` — per Phase 3 spec item 2), not new event-type strings (no `api/track.js` allowlist change needed, matching the "server-only" pattern already used by placement/checkin).

### 3. Skip and retake
- **Skip** (`handlePlacement`, line 469-472): `req.body?.skip === true` → logs `placement_skipped` with empty payload, returns `{ok:true}`, **no `child_profiles` write at all** — a skip leaves the child at whatever default (Unit 1, unplaced) they already had. v2 must preserve this exact "no write" semantics for its skip path.
- **Retake** (line 525): `startEventType = placementCompletedAt ? 'placement_retaken' : 'placement_started'` — determined server-side from a **verified prior completion** (the `child_profiles.placement_completed_at` value passed into the handler), never a client-supplied flag. v2 must derive `placement_retaken` vs `placement_started` the same way (server-verified prior state, not a client claim).
- Check-in's skip path (line 644-649) intentionally logs NO event (only placement's skip does) — irrelevant to v2 (v2 is a placement-shaped flow, not a check-in), but noted so v2's skip isn't accidentally modeled on check-in's silent-skip instead of placement's logged-skip.

### 4. Client primitives (read-only reference, not reused)
- **`src/components/candy/PlacementProbe.jsx`** (124 lines) — the exact "measurement exception" reference implementation: tiles use `AnswerTile` from `lessonChrome`, tapped tile always gets `state: 'correct-flash'` regardless of actual correctness (line 113: `idx === tappedIdx ? 'correct-flash' : undefined`), no wiggle/soften ever rendered, Nova message is neutral ("Let's try another!") for both outcomes, 900ms delay before `onAnswer(correct)` fires. For `mechanic === 'picture'` probes, the target word is shown as a `WordArt` image (never printed as text) and audio poses the question implicitly; for `findTheWord`-style probes, the word is spoken via `fetchAudio`+`playAudio` and never displayed until after the tap (as one of 4 tile labels, which is unavoidable — the options themselves ARE text, this is the "look-alike"/word-tile mechanic, not the target-word-as-cue). **v2 Non-negotiable is stricter**: "target word is spoken, never printed, on any measurement screen" — v2's own tiles will need the same word-as-answer-option pattern (unavoidable for a look-alike probe) but must not print the target anywhere else (headings, prompts, results).
- **Audio singleton** (`src/games/gameAudio.js`): `audioCache`/`audioFetching` are `Map<text, blobUrl/Promise>` keyed by the **literal text string** (not a hash) — `fetchAudio(text)` dedupes in-flight requests and caches by that key; `playAudio(url)` stops any `currentAudio` first (only one clip plays at a time, module-level singleton); respects a `mw_muted` localStorage flag. **v2 must reuse `fetchAudio`/`playAudio` as-is** — no new audio plumbing.
- **`api/speak.mjs`**: `checkRateLimit(user.id, 'speak', 60, 1)` (line 66) — 60 requests/min per user, JWT-verified. Request shape is `POST {text}` with `Authorization: Bearer <access_token>` (from `fetchAudio`'s caller side). No separate "caching by text hash" server-side — the cache is entirely client-side (`audioCache` Map above); server just answers each call fresh (ElevenLabs TTS). **v2's "prefetch CURRENT + NEXT line only" instruction is about not exhausting this 60/min budget across a session with up to 25 words × 2 probes × several lines each** — confirmed the ceiling is real and per-user, not per-session.

### 5. Test patterns
- **`tests/placement-checkin.spec.js`**: `test.use({ baseURL: process.env.DEPLOY_BASE_URL || "https://200magicwordsapp.com" })` (line 29) — env-driven baseURL, defaults to production, override via `DEPLOY_BASE_URL` for a branch preview. **This is the pattern `tests/star-check.spec.js` (Phase 5) will mirror.**
- **`scripts/idor-proof.mjs`**: 29 total `check(...)` calls (`grep -c "check(" scripts/idor-proof.mjs` = 29, matches master doc's own census). The `'checkin-ladder-v1'` isolation checks (lines ~140-268) cover, in order: (a) direct client write to `child_profiles.placement_unit` blocked; (b) forged/tampered ladder token can't finalize above rung 1; (c) forged check-in token can't finalize; (d) cross-child check-in start returns 403; (e) **a genuine, correctly-signed PLACEMENT token replayed into `checkinMode` is rejected** (`crossModeRes` check, line 196-214) — this is the exact cross-context-replay pattern v2's `idor-proof.mjs` additions must mirror for `'star-check-v1'` vs `'placement-ladder-v1'`/`'checkin-ladder-v1'`; (f) a positive-landing twin: driving a real check-in to completion and asserting the `checkin_completed` product_events row actually lands with the expected payload shape (line 225-268) — **the "item-16 lesson"** (never a vacuous "zero rows found, test passes" false-positive).
- **`tests/placement-adventure.spec.js`** (133 lines, 3 tests) — **drives the real UI end-to-end**, not direct API calls: all 3 tests call `signInAndOnboard(page, ...)` → `page.goto("/app")` → sign in → fills `ChildOnboardingScreen` → asserts `"One more thing"` (the `PlacementChoiceScreen` heading) is visible, then each test clicks a `PlacementChoiceScreen`/`PlacementAdventureScreen` button (`/start at the beginning/i`, `/Let Nova find their level/i`) and asserts on in-page text (`"Ready to fly?"`, `"Nova found your starting star!"`, tile wiggle-absence). **Disposition per Phase 5 rule: since it drives the UI flow (not direct-api), and Phase 4's entry-point swap will repoint `PlacementChoiceScreen`'s "Let Nova find their level" button (and the beginner button) at `StarCheckScreen` instead of `PlacementAdventureScreen`, all 3 of this file's tests will break against v2 (they assert on v1-only screen text/copy that will no longer render from that entry point). None of the 3 tests have a "direct-api, keep as-is" half to split off — every assertion is UI-driven.** Resolution: retarget all 3 tests' UI-driving assertions into `tests/star-check.spec.js` (equivalent coverage: skip/beginner path, full-persona floor completion, measurement-exception tone-parity), and reduce `placement-adventure.spec.js` to either (a) deletion (v1 screen stays in the tree unrouted per the non-negotiables, but is no longer reachable via the UI paths this spec drives) or (b) a comment-only stub noting v1 is intentionally unrouted. Net test count must not drop — tracked as a Phase 5 sub-task with an explicit before/after count in this report.

### 6. Gate scope
- **`check:no-emoji`** (`scripts/check-no-emoji.mjs`) scans exactly `src/` and `api/` (`ROOTS`, lines 53-58) plus `src/main.jsx` explicitly — **`docs/` is NOT in scope at all**. This means "mockups F–N already pass it" is true only because `docs/design/mockups/*.html` is never scanned, not because those mockups are verified emoji-free by this gate — confirmed by reading `ROOTS` directly rather than assuming. Committing mockup O into `docs/design/mockups/` in Phase 6 has zero interaction with this gate either way. New `src/lib/starCheck*.js`/`src/screens/StarCheck*.jsx` files WILL be scanned (they're under `src/`), so they must stay emoji-free like everything else, which the bank/copy above already is.
- **6 build sync checks** (`npm run build` = `check-wordart-sync.mjs && check-stroke-coverage.mjs && check-findtheword-sync.mjs && check-activitydefs-sync.mjs && check-mastery-predicate-sync.mjs && check-blank-engine-weighting-sync.mjs && vite build`) — each one is a **hardcoded pair of specific file paths** (e.g. `WordArt.jsx` ↔ `wordArtManifest.json`; `masteryCalibration.js` ↔ `session-generator.js`'s mirrored predicate), confirmed by reading each script's `*_PATH` constants. **None pattern-matches a general `starCheck*` namespace or globs `src/lib/*` broadly** — a new `starCheckBank.js`/`starCheckIcons.js` will not trip any of the 6 checks. Only risk: `check-mastery-predicate-sync.mjs` and `check-blank-engine-weighting-sync.mjs` both diff specific named consts out of `api/session-generator.js` by regex — Phase 3's edit to that file must not disturb the existing `MASTERED_THRESHOLD`/`BELOW_FLOOR_FUNCTION_SAMPLE_SIZE`/etc. constants those scripts extract.

### 7. Decision rules locked by recon
- **Per-word detail**: goes into `placement_completed`'s `payload` column — confirmed the column exists (jsonb, `payload ?? {}`) and is unrestricted in shape. **Zero migrations either way, and specifically: WITH detail** (no need for the "log without detail" fallback branch).
- **`raw_unit` expressibility**: `payload` is free-form jsonb — `raw_unit`/`applied_unit`/`floor_level`/`warmup_flag`/`mode`/`per_word` all fit trivially alongside the existing `placementUnit`/`trueMeasuredUnit` keys already written by v1's own `finalize`. **No STOP-with-approval-note condition triggered** — the events table expresses everything v2 needs.

### Supporting source-gate confirmations
- `docs/design/mockups/README.md` canon table: mockup **I placement** is currently listed CANON (row: "warm-up gate, measurement probes, two-miss floor, scoreless results"). Mockup **O is not yet a row** — Phase 6 adds it per the spec's exact wording (a new REFERENCE row, noting it supersedes I's *probe content* for initial placement; the existing I row itself is left as-is per the spec's literal instruction, which says "add a README row," not "change I's row").
- `supabase/migrations/MIGRATIONS.md`: confirms the numbering rule (next number = one after what's *applied to production*, verified via `supabase migration list`, not the highest file on `main`) and the 0037/0038/0039 provenance — `0039` (`story_fallback`) remains reserved and untouched, consistent with this run's zero-migration stance.
- Master doc v5 items 9, 16, 17, 22, 23 + KEY REFERENCE read: confirms `FREE_TIER_MAX_UNIT`/REVOKE-protected placement columns, the shared 10/min session-generator rate limit across modes (a real trap for Phase 6/7 verification scripts — must use a second identity), 101 Playwright specs and 29 idor-proof checks as the pre-run baseline counts to re-census in Phase 6.

## Phase 2 — Content modules

STATUS: DONE

- `src/lib/starCheckBank.js` (109 lines) — `LEVEL_UNIT_MAP` (`[PROPOSED]` mapping `{1:1,2:4,3:8,4:12,5:15,clean:16}`), the 25-word `BANK` table (verbatim from the mockup's `BANK` array, cross-checked word-for-word against both the mockup's literal JS and the spec's table — all 25 words, all A/B option sets, the `kid`→`kit` child-safety foil swap included), `wordsForLevel`, `frameA` (n/pl/m frames + an/a vowel rule), `voFor` (probe A = frame+'.'; probe B = "Tap the one that says <word>."), `isWordKnown`, `levelProgress` (two-miss floor / one-miss-or-clean pass / continue), `startingUnitForFloor`.
- Cross-checked print-only-vs-picture-eligible split against the mockup's own `hasPics()` logic (which word), not just copied from the spec table: computed which of the 25 words' A-sets are fully covered by the mockup's `PICS` map — got exactly the same 12 picture-eligible / 13 print-only split as the spec's table, confirming the table is internally consistent with the mockup's real behavior, not just asserted.
- `scripts/extract-star-check-icons.mjs` (54 lines) — reads the mockup's `PICS` block via regex, asserts exactly 45 keys (aborts otherwise), writes `src/lib/starCheckIcons.js`. Run once this session against `~/Downloads/200mw-design/mockup-O-blank-assessment.html`.
- `src/lib/starCheckIcons.js` (53 lines, GENERATED, do-not-hand-edit) — `STAR_CHECK_PICS`, 45 keys. Verified: key count is 45, and spot-checked the `kid` entry's SVG markup is byte-identical to the mockup's source line.
- **No server-side mirror needed for Phase 2 module contents themselves** — Phase 3 will hold its own literal copy of `BANK` inside `api/session-generator.js` (CommonJS can't safely `require()` this ES module, same reasoning as the existing `masteryCalibration.js`/`blankEngineWeighting.js` mirrors) — noted in `starCheckBank.js`'s own header comment so a future editor isn't surprised there's no shared import.

## Phase 3 — Server

STATUS: DONE

- `api/_lib/starCheckBank.js` (new, CommonJS mirror of `src/lib/starCheckBank.js` — header comment cross-references both files and explains why there's no shared import, same reasoning as the existing mastery/blank-engine mirrors).
- `api/_lib/starCheckLadder.js` (new) — `signStarCheckState`/`verifyStarCheckState` under context `'star-check-v1'`. **Deliberately self-contained, not extended from `api/_lib/placementLadder.js`**: that file's `verifyLadderState` hard-requires `state.rungIndex` (a shape specific to the unit-rung ladder) and is shared by `checkinMode` (a scope wall for this run) — duplicating the small HMAC pattern was safer than touching a file `checkinMode` depends on. State shape validated on `levelIndex`/`wordIndex`/`childId` instead of `rungIndex`.
- `api/session-generator.js`: added `starCheckMode` dispatch (alongside `placementMode`/`checkinMode`/`historyMode`, same shared 10/min rate limit — noted in Phase 1 recon) and `handleStarCheck`. **No Anthropic call** — confirmed by inspection, the whole handler only touches `admin` (Supabase) and the two new `_lib` requires. Behavior:
  - `skip: true` → logs `placement_skipped` (payload `{mode:'star_check_v1'}`), no `child_profiles` write — mirrors `handlePlacement`'s own skip branch exactly.
  - No token yet → logs `placement_started`/`placement_retaken` (same server-verified-prior-completion derivation as v1, not a client claim) → `warmupStruggled: true` finalizes immediately at floorLevel 1 with `warmup_flag: true`, zero probes administered; otherwise issues the Level 1 / word 1 probe (phase `'A'` if the word has a meaning probe, else `'B'` — never a faked meaning item).
  - Each round-trip carries exactly one `answer: boolean` (unlike v1's paired-rung `answers` array, since each word administers up to two SEQUENTIAL probes) plus the signed `ladderState`. A bad/forged/expired/cross-context token restarts fresh (logs `star_check_invalid_token` via `logSecurityEvent`, mirroring v1's `placement_ladder_invalid_token` pattern) — never trusted.
  - Word-known rule (`isWordKnown`), two-miss-floor / one-miss-or-clean-pass level routing (`levelProgress`), and level->unit mapping (`startingUnitForFloor`) are the exact same pure functions as `src/lib/starCheckBank.js` (verified by direct dry-run below, not just code inspection).
  - `finalize()` writes `child_profiles.placement_unit/measured_unit/placement_completed_at` through the **same three columns and same free-tier cap expression** (`Math.min(trueMeasuredUnit, FREE_TIER_MAX_UNIT)`) as `handlePlacement`'s own finalize — not reimplemented, copied verbatim. Logs `placement_completed` with `payload: { placementUnit, trueMeasuredUnit, raw_unit, applied_unit, floor_level, warmup_flag, mode:'star_check_v1', per_word }` — satisfies the Phase 1 decision rule (per-word detail included, since the `payload` column is unrestricted jsonb).
  - Floor path marks the current level's not-yet-administered words as `skipped: true` in `per_word` (mirrors the mockup's own behavior) rather than omitting them.
- **Dry-run verification (no HTTP, direct `require()` of the two new `_lib` modules, run this session)**:
  - Clean sweep (all 25 words known): 37 state-machine steps, 4 level-ups, `finalFloor:'clean'`, `startingUnitForFloor('clean') === 16`. Confirms the routing loop terminates correctly and matches `LEVEL_UNIT_MAP`.
  - Forced two-miss floor at Level 2 (word 1 and word 2 both miss): floors at `level:2` → `unit:4`, and the `perWordLog` shows Level 1's 5 words `known:true`, Level 2's `baby`/`good` `known:false`, and `duck`/`move`/`water` correctly marked `skipped:true` — exact match to the intended two-miss-floor-then-skip-rest behavior.
  - `signStarCheckState`/`verifyStarCheckState` round-trip: same-child verifies true, wrong-child verifies false (null), garbage token verifies false (null) — the three cases `idor-proof.mjs` additions (Phase 5) will exercise over real HTTP.
- `node -c` syntax-checked `api/session-generator.js`, `api/_lib/starCheckBank.js`, `api/_lib/starCheckLadder.js` — all clean.

## Phase 4 — Client

STATUS: IN PROGRESS

## Phase 4 — Client

STATUS: IN PROGRESS

## Phase 5 — Tests

STATUS: IN PROGRESS

## Phase 6 — Gate suite

STATUS: IN PROGRESS

## Phase 7 — Preview walk

STATUS: IN PROGRESS

## APPROVAL STOP

STATUS: IN PROGRESS

## Phase 8 — After approval

STATUS: NOT STARTED (post-approval)

## FINAL STATUS

STATUS: NOT STARTED
