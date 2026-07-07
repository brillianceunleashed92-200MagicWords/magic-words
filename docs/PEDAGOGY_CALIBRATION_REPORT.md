# Pedagogy Calibration Report

**Run:** `docs/FEAT_PEDAGOGY_CALIBRATION_R1.md`, executed 2026-07-07
**Branch:** `feat/pedagogy-calibration`

### RUN TIMING
- Start: 2026-07-07 (see commit timestamps for exact times)
- End: IN PROGRESS
- Total wall-clock: IN PROGRESS

### CONSUMER CENSUS — the Phase 1 table, with any later corrections

Grep-complete (`grep -rn "MASTERED_THRESHOLD\s*=\|\.mastery\s*>=\|\.mastery\s*<" src api`) across client + `api/`. Six independent `MASTERED_THRESHOLD = 80` declarations found (one canonical, in `masteryCalibration.js`; five duplicated literals). Beyond the doc's own "at minimum" list, this pass additionally found: `HomeScreen.jsx` (x2 — a duplicate of GalaxyScreen's tile-status logic on Home's mini path preview, and a Trophy Card unlock check), `StoryScreen.jsx` (story-generation "known words" context), `MasteryMapTab.jsx` (parent-facing heatmap bucket color), and `sessionPlanFallbackUnit.js` (the offline/API-failure fallback's own currentUnit scan — a third independent copy of `session-generator.js`'s unit-selection logic). These five are census corrections beyond the doc's minimum list, included below.

| # | File:line | Current predicate | Intended predicate | Child-visible effect of the change |
|---|---|---|---|---|
| 1 | `useCandyGalaxyData.js:89` `currentWord` | `w.mastery < 80` | `!isRealMastery(w.mastery, w.attemptCount)` | A word answered correctly once (100%, 1 attempt) stays the guided path's current word — no roll-forward. **The doc's named example, unchanged in effect from what's written there.** |
| 2 | `useCandyGalaxyData.js:93` `sleepyStars` | `w.mastery >= 80 && w.sleepy` | `isRealMastery(...) && w.sleepy` | A 1-tap word never shows a "wake up your sleepy star" review nudge — Star Keeper review only offered for words genuinely mastered. Beyond the doc's list; in Phase 3's explicit spirit ("all consumers"). |
| 3 | `useCandyGalaxyData.js:98` `masteredCount` | `w.mastery >= 80` | `isRealMastery(...)` | The Home/Galaxy "X / 200 mastered" badge and the parent Dashboard's upgrade-prompt threshold (which reads `masteredCount`) both stop counting 1-tap words. Doc's named example. |
| 4 | `useCandyGalaxyData.js:105` `completedUnits` | `every(w.mastery >= 80)` | `every(isRealMastery(...))` | A unit isn't flagged "complete" (Unit Boss trophy, Galaxy badges) until every word in it is genuinely mastered. Doc's named example. |
| 5 | `GalaxyScreen.jsx:19` tile `done` status | `w.mastery >= 80` | `isRealMastery(...)` | Galaxy map tile shows `inProgress` (touched, tappable, percent shown), not `done`, for a 1-tap word. Doc's named example ("GalaxyScreen tile states"). |
| 6 | `HomeScreen.jsx:49` Home mini-path tile status | `w.mastery >= 80` | `isRealMastery(...)` | Same tile-status concept as #5, duplicated on Home's short preview strip — must agree with the full Galaxy or a word would show `done` on Home and `inProgress` on Galaxy simultaneously. Census correction (not in the doc's list, but the same "GalaxyScreen tile states" intent applied to its sibling view). |
| 7 | `HomeScreen.jsx:233` "Unit Boss" Trophy Card lock | `words.slice(0,8).every(w.mastery >= 80)` | `every(isRealMastery(...))` | The decorative Unit-1 trophy badge doesn't unlock from 8 one-tap words. Census correction. |
| 8 | `StoryScreen.jsx:30` `masteredWords` (story-generation context) | `w.mastery >= 80` | `isRealMastery(...)` | Nova-generated stories only reuse vocabulary the child has genuinely learned, not a word tapped once. Census correction. |
| 9 | `MasteryMapTab.jsx:18` heatmap bucket color | `w.mastery >= 80 ? mint : ...` | top bucket only: `isRealMastery(...) ? mint : ...` | Parent-facing Mastery Map's green ("mastered") tile requires real mastery; the two intermediate buckets (40-79%, 1-39%) are left as continuous raw-percentage signals — they're not claiming "mastered," just showing in-progress percentage, which stays honest at any attempt count. **Predicate boundary decision, not a doc requirement** — documented here per rule 3 (no drive-by without a stated reason). |
| 10 | `weeklyStats.js:4,46-53` `wordsThisWeek`/`weakWords` | `wordsThisWeek`: any word with an event in the last 7 days (no mastery filter at all — not actually threshold-gated today, despite the file declaring a local `MASTERED_THRESHOLD` constant that goes unused for this specific field). `weakWords`: `attemptCount>0 && 0<mastery<60` | `wordsThisWeek`: practiced this week **and** `isRealMastery`. `weakWords`: add an `attemptCount >= MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION` floor alongside the existing `0<mastery<60` — same "don't judge on too little data" principle applied to the low-mastery direction, using the shared constant rather than a re-declared literal, since `isRealMastery` itself only expresses the *high*-mastery gate. | Dashboard's "Words this week" hero number now only counts words really mastered this week, so it stops contradicting chart 1 (weekly mastery-crossing bar), which was Package A's flagged gap and this run's mission line 6. `weakWords` (feeds the AI coaching tip) stops flagging a word "weak" off a single unlucky miss. **Predicate reasoning documented explicitly since the doc's literal instruction ("move onto isRealMastery") doesn't map 1:1 onto a metric that wasn't threshold-gated at all before — see PHASE 2 section below for the live-verified before/after.** |
| 11 | `sessionPlanFallbackUnit.js:18` `computeFallbackCurrentUnit`'s `hasUnmastered` | `w.mastery < 80` | `!isRealMastery(w.mastery, w.attemptCount)` | The **offline/API-failure fallback** session plan (client-side mirror of `session-generator.js`'s unit-selection) stops treating a 1-tap word as "unit done" and skipping past it — keeping this path consistent with the online behavior instead of only fixing the primary path. Requires adding `attempt_count` to `useSessionPlan.js`'s `word_progress` select (currently only selects `word, mastery`) and threading it through `withMastery`; the function's signature changes from `{unit, mastery}` items to `{unit, mastery, attemptCount}` items — **the 4 existing tests in `tests/session-plan-fallback.spec.js` need their fixtures updated to include `attemptCount`** (not just a drive-by touch — Phase 7 adds the new low-attempt case explicitly). |
| 12 | `api/session-generator.js:313` `hasUnmastered` (normal pool, currentUnit scan) | `w.mastery < 80` (local literal) | mirrored predicate, see ARCHITECTURE below | Server-side unit-selection stops treating a 1-tap word as unit-complete. Doc's named example ("session-generator selection"). |
| 13 | `api/session-generator.js:348` `currentUnitWords` (normal pool candidate filter) | `w.mastery < 80` | mirrored predicate | The actual per-word candidate list a new session draws from — a 1-tap word stays in this pool (still selectable), the doc's Phase 3(d) core requirement. |
| 14 | `api/session-generator.js:350` `masteredSample` (confidence-boost sample) | `w.mastery >= 80` | mirrored predicate | A 1-tap word is excluded from the "already mastered, shown for confidence" sample — without this, it could get miscategorized there instead of staying in `currentUnitWords`, silently reducing its future practice opportunities (the exact deficiency Phase 3(d) guards against). |
| — | `api/session-generator.js` reviewOnly pool (`encountered`/`due`/`notYetDue`, ~L318-345) | `attemptCount > 0` gate (unrelated to the 80% threshold); sorts by raw `mastery` for weakest-first ordering | **No change** | `attemptCount > 0` already includes a 1-tap word in Quiz Boss's review-battle pool regardless of any predicate change (doc's Phase 3(d): "still selectable... reviewOnly"). The raw-mastery sort is a continuous ranking signal ("test the weakest first"), not a boolean mastered/not gate — `isRealMastery` doesn't have a meaningful substitute for a *ranking*, only for a *threshold*. Verified live in Phase 3, not assumed. |
| — | `useCandyGalaxyData.js` free-tier cap / placement floor (`plan === 'family' ? 18 : FREE_TIER_MAX_UNIT`, `placementFloor` derivation) | Gates by **unit number**, never by mastery | **No change** | Confirmed by reading, not assumed, per Phase 3's explicit instruction: the free-tier cap and placement floor are unit-based gates, structurally independent of the mastery predicate — nothing here reads `.mastery` at all. |

**Not changed, explicitly out of scope**: `word_progress.mastery` itself (the stored value — architecture lock, see below), the Word Galaxy's *percent shown on a tile* (`percent: w.mastery` in `GalaxyScreen.jsx`/`HomeScreen.jsx` — still the honest raw percentage, only the tile's `done`/`inProgress` *status* changes), and `difficultyGovernor.js`'s session-level rolling-success-rate suggestion (a different signal entirely — localStorage-based recent-session accuracy, not a per-word mastery threshold).

### ARCHITECTURE — confirmation the stored formula is untouched (or the STOP that fired); server-side predicate strategy; retroactive chart-history note

**Stored formula: untouched, confirmed.** `useSaveWordProgressMutation` (`src/lib/queries/wordProgress.js`) — the sole write path to `word_progress.mastery` — is not modified by this run. `Math.round((correctCount/attemptCount)*100)` stays byte-identical. No evidence surfaced during recon suggesting the stored formula itself needs to change — this run's whole premise (the A2 family) is specifically that the formula is fine and the *readers* were wrong to treat its raw output as "mastered." Package A's replay-purity proof (`masteryReplay.js`, proven against real seeded gameplay) remains valid untouched.

**Server-side predicate strategy: mirrored constant, not a direct import.** Phase 0 recon confirmed `api/session-generator.js` is a CommonJS Vercel function (`require(...)`/`module.exports`, no `"type": "module"` in `package.json`) while `src/lib/masteryCalibration.js` is an ES module (`export const...`). Verified rather than assumed: a plain `require('./src/lib/masteryCalibration.js')` **does** resolve correctly under this machine's local Node v24.16.0 (Node 22.12+/24.x added stable `require()`-of-synchronous-ESM support) — but the actual Vercel serverless runtime's Node version for this specific project could not be independently confirmed (the connected Vercel MCP tool is authenticated to a different team/account than this project's actual owner; no `.vercel/project.json` or `engines` field pins a version locally). Given `session-generator.js` is the core gameplay endpoint — every session generation call would fail if a cross-module-system `require()` behaves differently under Vercel's actual build/runtime than it does locally — this is exactly the ambiguity the doc's own Phase 3 rule anticipated: **mirrored, not imported.** A single named constant, `MASTERED_THRESHOLD` (already present, previously an untethered literal) plus a new `isRealMastery`-equivalent predicate function, added directly in `api/session-generator.js` with a comment binding it explicitly to `src/lib/masteryCalibration.js`, and a new check script (`scripts/check-mastery-predicate-sync.mjs`) asserting the two stay numerically identical (same threshold, same minimum-attempts floor) — run as part of the standard gate suite from this run forward, so a future edit to one side can't silently drift from the other.

**Retroactive chart-history note**: Package A's chart 1 (`computeWeeklyMasteryCrossings`, weekly mastery-crossing bar chart) imports `isRealMastery` from the same shared module — this run does not change that predicate's threshold or attempt floor (both stay `>= 80` / `>= 3`, unchanged), so chart 1's historical weeks do **not** retroactively re-render differently from this run alone. (Had this run changed the predicate's actual numbers, they would have — flagged here per the doc's own instruction, even though the answer this time is "no change to the numbers, only to which consumers apply them.")

### SCAFFOLD-DOWN — trigger/response/reset as shipped, the tier map verbatim, telemetry

**Trigger, confirmed against real code, not assumed**: every activity's own errorless-learning scaffold (checked directly in `WordMatch`'s `handleTap` — `if (!correct && !missedOnce) { ...; return; }`) already absorbs a first miss internally and never calls `onAnswer`/`onProgress` for it. This means **every** `handleProgress({ correct: false, ... })` call the app already makes is, by construction, a "completed" (post-scaffold) error — no new detection logic was needed to distinguish a raw tap from a completed miss. `PlayScreen.jsx` tracks a session-local `scaffoldState` (React state, not a ref, so `QuestPath` re-renders the instant it changes): `{ [word]: { consecutiveWrong, pinnedActivityId } }`. Two completed errors on the same word with no correct completion between them (across possibly different activities — a word only gets one shot per activity per day via the guided path, so "two in a row" in practice means two different activity types both went wrong) sets the pin.

**Tier map, derived (not hand-authored) from the existing pedagogical order**: the "easiest valid tier" is `getEligibleActivities(word)[0]` — `activityDefs.js`'s existing rank-ordered, per-word eligibility-filtered list (already used to build the guided path itself), just taking its first entry. Concretely, as verified against the real eligibility gates:
- **has_art content words** (not `function` type, has a real WordArt illustration): `word_match` (Tap & Hear, rank 1) — matches the doc's own named example exactly, since `word_match`/`word_hunt` require `has_art`.
- **function/no-art words**: `word_match`/`word_hunt` (ranks 1-2) are ineligible (no picture). `rhyme_time` (rank 3) requires a `RHYME_MAP` entry — most function words don't have one, but a few do (e.g. "can" → "pan"), in which case rhyme_time IS the easiest eligible tier for that specific word. Otherwise the next-lowest-rank activity, `find_the_word` (rank 4), is **always** eligible (its own comment: "full 200-word manifest coverage") and becomes the floor — a real context/recognition activity, matching the doc's "easiest context/cloze activity for function/no-art words" description. The tier is word-specific by design (same mechanism the guided path itself already uses), not a single hardcoded id.

**Response**: while pinned, `QuestPath.jsx` forces the pinned activity's node to render `state: 'current'` — overriding the natural first-not-done-today sequencing, and overriding even an already-completed-today status for that specific node (no other node's status changes; nothing already unlocked becomes locked, satisfying rule 5's "no locks regressing"). A persistent (not one-shot) banner reads "Let's look at this one together!" next to a spark icon — no difficulty language, no reference to the misses that triggered it. The existing difficulty-governor "Nova recommends this one" chip is suppressed while pinned (two simultaneous Nova suggestions with different intents would read as confusing, not doubly-encouraging) — a scope decision, not a doc requirement, noted here per rule 3.

**Reset**: a correct completion at the exact pinned activity clears the pin (and the consecutive-wrong streak); any other correct completion for that word resets the streak counter but leaves an existing pin in place (the pin's whole point is to redirect practice to that specific tier — a correct answer elsewhere, e.g. via Quiz Boss's independent review pool, doesn't fulfill that).

**Telemetry**: `product_events` is service-role-write-only (client can't insert directly), so `api/track.js` — the app's one client-originated first-party event endpoint — gained a new `scaffold_down` event (payload: `word`, `activityId`, both server-validated against a strict regex allowlist) plus, new to this run, optional `childId` support with the same ownership-verification pattern as `session-generator.js`'s `fetchChildContext` (a client-supplied childId is checked against the verified JWT's user before being trusted; a forged/foreign childId is silently dropped rather than failing the whole request). Fire-and-forget from `PlayScreen.jsx`, same "telemetry must never affect gameplay" posture as every other analytics call in the app.

### ATTEMPT_NUMBER — schema finding, writer change, forward-only reliability note

**Schema finding**: `learning_events.attempt_number` already exists (`integer`, nullable, no default) — confirmed via `information_schema.columns`, not assumed. No migration needed; rule 4's STOP-and-report-a-migration branch does not fire.

**Current writes (before this run)**: hardcoded `attempt_number: 1` on every single insert (`PlayScreen.jsx`'s `handleProgress`), regardless of how many times the word had actually been attempted — the column existed but was never actually populated meaningfully. A second, entirely dead copy of the same hardcoded value (`attemptNumber: 1`) was also passed from `GameEngine.jsx`'s `onProgress` call, upstream of `handleProgress` — `handleProgress`'s destructured parameters never read it, so it silently went nowhere. Removed rather than left as misleading dead code that looks wired but isn't.

**Writer change**: `handleProgress` already awaits `saveWordProgress.mutateAsync({ word, correct })` (`useSaveWordProgressMutation`) before firing the `learning_events` insert, and that mutation's return value (`result`, from its own `.select().single()`) already carries the word's true post-write `attempt_count` — the exact "running attempt index at write time" Phase 4 asks for. No extra session-local counter was needed: `attempt_number: result.attempt_count` is both simpler and provably correct, since it comes directly from the same DB write whose ordering guarantee (the mutation is `await`ed before the insert fires, every single call) is what makes the value trustworthy in the first place.

**Forward-only reliability**: per rule 4, historical `learning_events` rows are **not** backfilled — every row written before this deploy keeps its literal `attempt_number: 1`, regardless of the word's actual attempt history at the time. Any future feature reading `attempt_number` must treat it as reliable only for rows recorded from this deploy forward (a `recorded_at` cutoff, not a schema flag — no column exists to distinguish "reliable" from "legacy" rows other than the deploy timestamp itself, noted here for whoever needs it next).

### PACKAGE A COUPLING — truncation guard + tests

`computeMasteryCrossings` (`src/lib/masteryReplay.js`) now returns each crossing's replay-final `attemptCount`/`correctCount` alongside `word`/`masteryCrossedAt` (purely additive — a caller destructuring only the original two fields is unaffected). `computeWeeklyMasteryCrossings` (`src/lib/parentMetricsDerivations.js`) takes a new `words` parameter (the same merged `useCandyGalaxyData()` shape charts 5/6 already use — extended in this run to also expose `correctCount`, already fetched by `useWordProgressQuery` but not previously surfaced) and, for each in-window crossing, compares the replay's final counts against that word's real all-time stored counts. A mismatch means the 84-day fetch window truncated the word's history — the "crossing" found is discarded rather than risk reporting a long-mastered word's later spaced-repetition review as a fresh first-time crossing.

**Honest direction of error, as the doc asks to note explicitly**: this makes chart 1 slightly *under-count* the rare word whose practice began just before the 84-day window and genuinely crossed real mastery inside it — from inside this function, that case is indistinguishable from a truncated review sequence, so it's discarded too. Under-counting a real metric was judged preferable to over-counting a fake one.

**Signature change, callers updated**: `computeWeeklyMasteryCrossings(learningEventsRows, words, now, weeksBack)` — `words` is now the 2nd positional argument (was `now, weeksBack` only). Updated: `ProgressCharts.jsx`'s `WeeklyMasteryChart` (now receives and forwards `words`), and Package A's existing 2 unit tests (pass `[]` for `words` — no stored row to compare against, so the guard is a no-op and their original bucketing-only intent is preserved unchanged). 2 new tests added covering both truncation-guard branches (genuine in-window crossing kept; truncated-history sequence skipped) — 11 tests total in `parent-metrics-derivations.spec.js` (was 9). `mastery-replay.spec.js`'s 2 existing `computeMasteryCrossings` assertions updated to expect the 2 new fields (`.toEqual()` is an exact deep match) — still 6 tests, no count change there.

### VERIFICATION — fixtures, results vs. 60 baseline, gates, idor-proof, preview + production walks

**Fixtures + specs** (`tests/pedagogy-calibration.spec.js`, self-provisioning, `nextgenprecisiondrones+mwpedagogy*` — this run's own suffix under the established prefix convention per rule 4, not a third pattern): one child, unit 1's "cat" seeded one-tap-100% (`attempt_count:1`) alongside its 7 siblings genuinely mastered (`attempt_count:5`) so "cat" is the natural weakest/current word feeding both the client fallback's `currentUnit` scan and the actual session batch; a real learning_events crossing for "dog" this week (isRealMastery-gated, for the weeklyStats/chart-1 agreement check).

- **Test 1** — a one-tap word is non-mastered everywhere: live-verified Galaxy (`masteredCount` badge shows 7/200, not 8), the Mastery Map tile renders differently from a genuinely-mastered sibling's, and the parent Dashboard's "Words this week" hero stat shows exactly 1 (only "dog," the genuine crossing) — the same-screen contradiction named in this run's mission (line 6), fixed and verified live. (Server-side "still selected by the generator" is not independently live-tested here — local dev serves no `/api` routes, so any local test exercises the client fallback only, already unit-tested directly including the exact one-tap case in `session-plan-fallback.spec.js`; the real server path is confirmed in the production walk below, same precedent as `quiz-boss.spec.js`.)
- **Test 2** — scaffold-down end to end, via **real gameplay, not simulated state**: fails "cat" once via Tap & Hear, once via Word Hunt (two different activities, two completed errors, confirmed each is a genuine post-errorless-scaffold miss), confirms the encouraging pin banner appears with no difficulty/miss language, then answers correctly at the pinned tier (Tap & Hear — "cat" is has_art, matching the doc's own named example) and confirms the banner clears. Also asserts `attempt_number` is strictly monotonic across every real "cat" event this run generated.
  - **Two real automation bugs found and fixed while building this test, not the app**: (1) a locator matching "any button not named the target word" silently matched the audio-replay icon button (empty visible text, but a real `aria-label`) instead of an actual wrong answer tile — fixed by filtering on `innerText` (blank for icon buttons) rather than accessible name. (2) Word Hunt's target-word detection via `getByRole('img').first()` matched the exit button's icon (also `role="img"`, DOM-earlier), not the prompt's WordArt picture — fixed by filtering for an `aria-label` that's a real lowercase word, excluding "Nova" (the mascot sprite is also a named img).
  - **One real timing/lifecycle finding, scoped to test design, not the app**: the shared "Exit and save progress" early-exit control genuinely unmounts `PlayScreen` (confirmed by reading `handleExitEarly`'s own `onExit()` call), which (a) wipes this run's session-local scaffold-down React state on any subsequent re-entry and (b) did not reliably show the guided path's "done today" refresh within this test's wait budget after a fresh remount. The proven-reliable pattern (`quest-progression.spec.js`'s own convention: complete the full batch naturally, "Session Complete!" → "Keep going") keeps `PlayScreen` mounted throughout and was used instead for every multi-step interaction in this spec. Whether the early-exit path's guided-path refresh has a *real*, independent bug is flagged here as an open question for whoever next touches `handleExitEarly` — out of scope to chase further in this run, since scaffold-down itself does not depend on that control at all.
  - `product_events` telemetry write is not checked locally (same `/api/track` 404-locally limitation as session-generator) — confirmed in the production walk below.

**Test results**: 2 new specs — `pedagogy-calibration.spec.js` (2 tests). Plus the 4 existing specs touched by fixture fixes (`quest-progression.spec.js`, `quiz-boss.spec.js`, `session-complete-a2.spec.js` — fixture-only changes, same test count; `session-plan-fallback.spec.js` — 1 new case, 5 total, was 4) and the 2 truncation-guard tests from Phase 6 (`parent-metrics-derivations.spec.js`, now 11, was 9) and 2 updated assertions in `mastery-replay.spec.js` (still 6, no count change). Net new: 2 (pedagogy-calibration) + 1 (session-plan-fallback) + 2 (truncation guard) = **5 new tests**. Suite total: **65** (60 baseline + 5 new) — verified via a full sequential run below.

Gates, idor-proof, and the preview + production walks continue in Phase 8.

### NOTES FOR PACKAGE C — what the placement report / Star Check-In should reuse
IN PROGRESS

## RECOVERY AUDIT 2026-07-07T18:31:45Z

**Context**: this run was killed mid-Phase-8 while a second Claude client was
driving the same Chrome (contention). Per standing instruction, every
browser-verified result from that window is untrusted regardless of what this
report claims above, and the recovery starts with a read-only audit before
touching anything.

**1. Git state.**
- `git fetch` — no new refs.
- Current branch: `feat/pedagogy-calibration`. `git status`: clean except the
  untracked files listed below.
- Last 3 commits on the feature branch: `22580ba` (chore: CLAUDE.md
  context-handoff + Chrome-exclusivity rules, 14:19:04), `03e75c5` (test:
  idor-proof childId checks, 13:59:13), `7453a40` (test: Phase 7 fixtures +
  live gameplay specs, 13:57:37).
- `main` HEAD is still `94620d4` (the parent-metrics merge) — **identical to
  `origin/main`**. `git log main..origin/main` and `origin/main..main` are
  both empty.
- **Merge to main did NOT happen.** No commit on this branch ever reached
  `main`.
- **`feat/pedagogy-calibration` has no upstream** (`git ls-remote --heads
  origin feat/pedagogy-calibration` returns nothing) — the branch itself was
  never pushed anywhere.
- Conclusion: the kill happened well before the merge/push step. Per the
  recovery instruction's own branch condition ("main untouched, nothing
  pushed") this qualifies for **continue immediately**, pending the residue
  check below.

**2. Deployment check** — N/A, nothing was pushed (see above). No SHA to
check against GitHub commit-status/Vercel.

**3. Re-running gates whose green claim predates the kill.** The report's own
VERIFICATION section never actually claimed gates/idor-proof/walks green — it
says "Gates, idor-proof, and the preview + production walks continue in
Phase 8," so nothing here needed to be distrusted so much as *finished*.
Re-ran fresh, now:
- `npm run build` (includes all 5 sync checks: wordart, stroke-coverage,
  findtheword, activitydefs, **mastery-predicate-sync** — the new script this
  run added) — **clean.**
- `npm run check:no-emoji` — **clean.**
- `node scripts/idor-proof.mjs` (env vars sourced from `.env.local`, not
  exported globally) — **ALL CHECKS PASSED**, including the pre-existing
  cross-user checks. **Caveat, verified by reading the script, not assumed**:
  the new Phase-5 checks from commit `03e75c5` (`scaffold_down` forged-vs-own
  `childId` ownership verification) live inside the `if (deployBase)` branch
  and are gated on `DEPLOY_BASE_URL` — they **did not run** in this local
  pass (fell into the existing "SKIP: create-portal-session/... (set
  DEPLOY_BASE_URL...)" branch). This is expected script behavior, not a
  failure, but it means **the one check this run's last commit specifically
  added has still never actually executed against anything** — it needs a
  live preview URL, i.e., Phase 8's preview deploy, before it can go green
  for real.
- Full Playwright suite (`workers:1`): running now (code changed materially
  since the last claimed-green run — Phases 2-7 all touched runtime code —
  so a fresh full run is required, not optional). Result to follow below.

**4. Residue check — surviving `nextgenprecisiondrones+*` test accounts.**
Queried `auth.users` directly. **No residue from this run**: no
`mwpedagogy*` (this run's fixture prefix per the report) and no
`mwpreviewwalk*` (the prefix used by the untracked
`tests/zz-preview-walk.spec.js`, see below) accounts exist. The self-cleaning
`finally`/admin-delete pattern held for whatever did run before the kill.
- **Separate, pre-existing issue, out of scope for this recovery, flagged
  anyway**: the query surfaced a much larger pool of un-cleaned-up accounts
  under other prefixes (`mwnoemoji*` — ~20 rows from 2026-07-03,
  `mwstorytime*`, `mwrm*`, `mwsmokesignup*`, `idora*`/`idorb*`,
  `mwftw*`/`mwftseat*`, one `candygalaxy20260701`), the newest two
  (`mwstorytime`, created 17:10 and 18:13 today) postdating this run's kill
  entirely — i.e., a **different, later workstream** left those, not this
  one. None of this is this run's residue; not touched, not deleted, just
  reported per the instruction ("list; don't delete yet").

**5. Untracked file found: `tests/zz-preview-walk.spec.js`.** Not committed,
`mtime` 14:00:45 — squarely between the last real work commit (13:59:13) and
the CLAUDE.md handoff commit (14:19:04). This is almost certainly a
Playwright-driven attempt at Phase 8's "preview walk" step, written during
the killed session, never committed. Read in full: it's a *Playwright* spec
(self-contained browser instance, own `page` fixture) — not an
extension-driven Chrome step, so it does not itself implicate the
Chrome-contention concern. It self-provisions
`nextgenprecisiondrones+mwpreviewwalk<timestamp>@gmail.com` and deletes it in
a `finally` block. No matching account found in the residue check above, so
either it was never actually executed, or it ran to completion and cleaned
up correctly. **Per STEP 1 item 5, marking its result (if it ran) NEEDS
REDO regardless** — it targets `/app` (a deployed URL), which is a live-site
walk, exactly the category the recovery brief distrusts for this window.
Left in place, untouched, pending a decision on whether to run it for real
against a real preview once one exists, fold it into Phase 8 properly, or
discard it as a false start.
- **Also untracked, unrelated**: 8 policy/legal draft docs
  (`200MW_*_DRAFT*.md`, `200MW_counsel_cover_email*.md`) and
  `HARDENING_OPS_REPORT.md`, all with `mtime` on 2026-07-06 or earlier —
  predate this run's commits by a full day, a different workstream entirely.
  Not touched.

**Verdict**: kill occurred before merge/push; main and origin are both
clean; no residue from this run. Per the recovery brief's own branching
rule, continuing immediately into STEP 3 (resume Phase 8) once the
Playwright run above finishes and its result is recorded here.

## PHASE 8 — GATES, VERIFY, SHIP (resumed)

**Gates, re-run fresh (not trusted from before the kill, since the report
never actually claimed them green — VERIFICATION said "continue in Phase
8"):**
- `npm run build` (all 5 sync checks incl. this run's new
  `check-mastery-predicate-sync.mjs`) — **clean.**
- `npm run check:no-emoji` — **clean.**
- `node scripts/idor-proof.mjs` (env sourced from `.env.local` for this
  invocation only) — **ALL CHECKS PASSED**, including the pre-existing
  cross-user checks. **Caveat**: commit `03e75c5`'s new Phase-5
  `scaffold_down` forged-childId checks live inside idor-proof.mjs's
  `if (deployBase)` branch and are gated on `DEPLOY_BASE_URL` — they fell
  into the "SKIP" branch locally and have still never actually executed
  against anything. They need a live preview URL to run for real; carried
  forward as an open item into the preview-walk step below, not silently
  dropped.

**Full Playwright suite — real regression found and fixed.** First
full run (`workers:1`, 14.7 min): **58 passed, 8 failed** out of 66
collected (65 tracked-suite tests + the untracked `zz-preview-walk.spec.js`,
see below). Did not take this at face value — investigated every failure
before deciding what it meant, per the "diagnose before fix" standing rule:

- **2 of the 8 (`reduced-motion.spec.js` x2) were false alarms**: re-ran the
  file alone → 3/3 passed. Resource contention from the 14.7-minute
  sequential run, not a real bug. Confirmed by isolation re-run, not
  assumed.
- **1 of the 8 (`zz-preview-walk.spec.js`) is the untracked leftover file
  from the killed session** (see RECOVERY AUDIT above) — its own bug
  (hardcodes Word Hunt's target as `"cat"`, got `"dog"` — the session
  batch doesn't guarantee word order/identity across activities the way
  the script assumed). Not part of the committed 65-test baseline; disposed
  of below.
- **The remaining 5 (`fill-the-story.spec.js` x2, `find-the-word.spec.js`
  x2, `story-time-chrome.spec.js` x1) were a real regression, root-caused,
  not dismissed as flaky**: all three spec files provision a fixture that
  seeds `word_progress` rows for units 1-2 with `mastery: 100` and **no
  `attempt_count`** (pre-dating this run — these files belong to the
  Fill-the-Story-rebuild / Find-the-Word+Quiz-Boss / Story-Time-chrome-migration
  branches, not this one), relying on the pre-Phase-3 `mastery >= 80` rule
  to read units 1-2 as fully mastered so the offline/local-dev fallback
  (`sessionPlanFallbackUnit.js`, the only path local Playwright exercises —
  local dev serves no `/api` routes) advances its `currentUnit` scan to
  unit 3. Under this run's Phase 3 predicate
  (`isRealMastery`: mastery >= 80 **and** attemptCount >= 3), an
  unset/zero `attempt_count` means those seeded rows no longer read as
  genuinely mastered, so `computeFallbackCurrentUnit` never advances past
  unit 1 — confirmed directly via each failure's captured DOM snapshot,
  which showed `"cat"` (unit 1) still as the recommended current word
  instead of the fixture's intended unit-3 target (`"eat"`). This is
  exactly the class of ripple effect Phase 1's census was supposed to
  surface but didn't, because these three files aren't part of this run's
  own test suite and the census only covered app source, not sibling test
  fixtures written by earlier, unrelated feature branches.
  - **Fixed** (all three, identical one-line change, matching the pattern
    the report's own census item #11 and `quest-progression.spec.js`/
    `quiz-boss.spec.js`/`session-complete-a2.spec.js` already established
    for this exact scenario): added `attempt_count: 3` alongside
    `mastery: 100` in the unit 1-2 seeding call in `fill-the-story.spec.js`,
    `find-the-word.spec.js`, and `story-time-chrome.spec.js`.
  - **Verified**: re-ran all 5 previously-failing tests together —
    **5/5 passed.**
  - **`csp-walk.spec.js` has the identical unfixed seeding gap** (same
    `mastery: 100`, no `attempt_count`) but did **not** fail, because that
    walk only clicks activities by button label and never asserts on which
    specific word is shown — the gap exists but has no test-visible
    symptom there. Left as-is (not a "fix a bug nobody hit" drive-by), but
    flagged here for whoever next touches that file, since the underlying
    data is still semantically wrong (those words are not actually
    genuinely-mastered under the current predicate, the test just doesn't
    care).
  - **Also confirmed while investigating**: `csp-walk.spec.js` defaults to
    running against **live production** (`https://200magicwordsapp.com`)
    whenever `DEPLOY_BASE_URL` is unset (its own header comment says this
    is intentional, pre-existing, signed off in an earlier run). It did run
    against real production during this gate pass (a `nextgenprecisiondrones+
    mwcspmain*` account was created there). Checked for residue after —
    **none found**, its own `finally` cleanup succeeded. Not a new issue,
    not touched, just confirmed clean.
- Full suite re-run after the fixture fix, `zz-preview-walk.spec.js`
  excluded via `--grep-invert`: **RESULT PENDING** (running in background
  as this section is written — final tally to follow immediately below).

**`zz-preview-walk.spec.js` disposition**: this file is the killed
session's own draft of Phase 8's "preview walk," written but never
committed (see RECOVERY AUDIT above for the mtime evidence). Its approach —
a Playwright spec rather than an extension-driven Chrome walk — matches
this codebase's own established convention for deploy-target walks
(`csp-walk.spec.js`, `story-time-chrome.spec.js` both use a
`DEPLOY_BASE_URL`-driven `test.use({ baseURL })`), so the pattern itself is
sound; it just has a real bug (the hardcoded `"cat"` Word Hunt assumption)
and was never adapted to target a deploy URL (it hits `/app` with the
default local baseURL). Decision: fix the bug, adapt it to the established
`DEPLOY_BASE_URL` convention, and use it for the actual preview-walk and
production-walk steps below, rather than discard working setup/teardown
code and rewrite from scratch.
