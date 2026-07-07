# Quest Progression Fix Report

**Run:** `docs/FIX_QUEST_PROGRESSION.md`, executed 2026-07-07
**Branch:** `fix/quest-progression`
**Bug context from user:** Tap & Hear was completed just now, same sitting,
immediately before observing the stuck "0 of 10 done today" counter — same
day, no overnight gap. This rules out a simple cross-day timing
misunderstanding as the direct explanation (H4's daily-boundary hypothesis
is still checked, but a same-session repro is the priority).

## STEP 0 — RUN TIMING

- Start: 2026-07-07
- End: 2026-07-07, same continued session (diagnosis, guard/test, ship,
  and production verification all completed)
- Status: DONE

## PHASE 1.0 — Reconcile repo state

Status: DONE — no undocumented commits; the "9 vs 10" discrepancy is a
wording slip in a prior report, not a code regression

`git log --oneline 0e69411..HEAD` (checked before making any change on this
branch, branched fresh off `main` at `0e69411`): **empty output.** No
commits exist beyond CONTENT_R1's close-out. This run's own branch is the
only thing ahead of that point.

**Verbatim `ACTIVITY_DEFS`** (`src/lib/activityDefs.js` lines 17-29):

| rank | `id` (game_type key) | label |
|---|---|---|
| 1 | `word_match` | Tap & Hear |
| 2 | `word_hunt` | Word Hunt |
| 3 | `rhyme_time` | Match & Sort |
| 4 | `find_the_word` | Find the Word |
| 5 | `flash_cards` | Quiz Boss |
| 6 | `story_time` | Story Time |
| 7 | `story_builder` | Fill the Story |
| 8 | `word_builder` | Word Builder |
| 9 | `say_it` | Say It with Nova |
| 10 | `draw_it` | Draw It |

**10 entries, confirmed** — matches the bug screenshot's "0 of 10," not a
recent addition. Traced this against the DEVICE_PREP run's own live evidence
(same file, browsed directly in that session, `docs/DEVICE_PREP_REPORT.md`):
that report's screenshots at the time showed "8 of 10 done today" and "2
more to go" after finishing Word Builder — i.e., the live UI already said
**10** in that session. That report's *prose*, though, says "gates all 9
activities" and "reaching rank 9" — sloppy wording on my part (describing
Say It as sitting at rank 9 of the sequence, not stating the total count),
not a discovery that the file had 9 entries. **No code change has happened
to `ACTIVITY_DEFS` between that session and now** — it was already 10
entries with "Fill the Story" at rank 7 back then. This is a documentation
imprecision, not the "#1 regression suspect" the prompt doc worried it might
be — ruled out as the explanation for Sal's bug, cleanly, with a receipt.

## PHASE 1 — Reproduce

Status: DONE — could not reproduce the reported symptom despite three
realistic, carefully-controlled attempts

**Setup**: disposable account (`questfix...`), child "QuestFixKid," seeded
via SQL to make unit 1 mastered and land on "frog" as the exact repro word
from Sal's screenshot.

**A network-tool limitation found and worked around**: the browser
extension's `read_network_requests` capture appeared to show *zero*
`learning_events`/`word_progress` writes across an entire 8-question Tap &
Hear round — only the session-end `user_streaks`/`earn_sparks` calls were
visible. Before treating that as a finding, checked the database directly:
**every write had actually succeeded**, with correct `game_type` values and
timestamps matching the session exactly. The network capture tool has some
internal buffer/eviction limit (likely from the ~8 audio-prefetch fetches
per round competing for the same buffer) that silently dropped the earlier
requests. Lesson for future runs: don't trust this tool's completeness for
sessions with many requests — verify against the database when a network
capture shows something surprising.

**Attempt 1 — natural currentWord progression, "Keep going" in-app nav**:
played Tap & Hear live for "frog" via the real guided path, confirmed via
DB query that the `word_progress` (mastery, attempt/correct counts) and
`learning_events` (`game_type: 'word_match'`, `correct: true`) rows were
written correctly. **Confound found**: "frog" reached 100% mastery after
just one correct answer (the well-known, already-flagged "one tap ≠
mastery" calibration gap — `MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION` exists
for the celebration UI but the underlying stored `mastery` value and
`currentWord` selection in `useCandyGalaxyData` don't share that guard), so
the tracked word rolled forward to a brand-new word ("eat") before I could
check whether *frog specifically* unlocked Word Hunt. This is a real,
already-documented product gap (not new), but it masked this attempt.

**Attempt 2 — controlled state, natural progression, both in-app nav paths**:
reset "frog" to a pre-existing `attempt_count: 3, correct_count: 1` (33%)
so one more correct answer this session would land at 50% — still below
the 80% mastery threshold, keeping "frog" as the tracked word instead of
rolling over. Played Tap & Hear live again. Result: **"1 of 10 done
today," Word Hunt unlocked** — correctly, via "Keep going" (no reload).
Tested a second, independent in-app path from the same state: "Home" then
re-entering "Play" (a full `PlayScreen` unmount/remount, confirmed by
reading `CandyGalaxyShell.jsx`'s `{navTab === 'play' && <PlayScreen/>}`
conditional render — this is a genuine fresh mount, not a kept-alive
component). Also correct.

**Attempt 3 — the review path (untested by the first two attempts)**:
read-only checked Sal's real account
(`brillianceunleashed92@gmail.com`) and found its "frog" `word_progress`
row already at 100% mastery with `last_seen` **2026-07-03** — four days
before this bug report. A word already at 100% mastery cannot be the
natural `currentWord` on a later day (`useCandyGalaxyData` only selects
words with `mastery < 80` as "current"), so the "frog / 0 of 10" screenshot
almost certainly came from Sal or his child **tapping "frog" directly**
(the Word Galaxy map, or the Home screen's "Your 'X' star is getting
sleepy — tap to review" banner — both wire through the same
`focusWord`/`generatePlanForWord` mechanism, confirmed by reading
`CandyGalaxyShell.jsx`/`HomeScreen.jsx`/`GalaxyScreen.jsx`), not the
default quest flow. Reproduced this exact shape: set "frog" to 100%
mastery on the test account, cleared today's `learning_events` for it,
navigated to it via a direct tap on the Galaxy map (bypassing the
scroll-reveal animation via a direct DOM `.click()`, since
`scrollIntoView` alone didn't trigger the path's rAF-driven visibility
calc), confirmed "frog / 0 of 10 done today" with Tap & Hear "YOU'RE
HERE!" — an exact match to the bug screenshot. Played Tap & Hear live,
returned via "Home" → Galaxy → tap "frog" again (full remount, most
realistic to how a parent would actually re-check). Result: **"1 of 10
done today," Word Hunt unlocked** — correct again.

**Conclusion for Phase 1**: three different realistic navigation/state
combinations — including the specific "review an already-mastered word"
shape that plausibly matches Sal's real account state — all produced
correct behavior. The reported symptom did not reproduce.

## PHASE 2 — Root cause

Status: DONE — no root cause demonstrated; all five ranked hypotheses
checked against evidence and ruled out for the scenarios actually testable

Per constraint 1 ("no fix is written until the root cause is demonstrated
with evidence"), and given Phase 1 could not reproduce the symptom, this
phase evaluates each hypothesis against the evidence gathered rather than
declaring one confirmed.

**H1 — missing query invalidation.** Ruled out. `PlayScreen.jsx`'s
`handleSessionEnd` does call
`queryClient.invalidateQueries({ queryKey: ['todayWordActivity', childId, pathWord?.word] })`,
and `useTodayWordActivityQuery` sets `refetchOnMount: 'always'`. Both
mechanisms were exercised directly in Phase 1 (in-app nav without a
reload, and a full component remount) and both correctly showed the
updated state every time.

**H2 — writer/reader `game_type` mismatch.** Ruled out, structurally, for
all 10 ranks — not just `word_match`. Traced the exact variable path:
`QuestPath.jsx` calls `onSelectActivity(activity.id)` where `activity`
comes straight from `getEligibleActivities(word)` (i.e., unmodified
`ACTIVITY_DEFS` entries) → `PlayScreen` stores that literal id in
`gameType` state → passes it to `GameEngine` as the `gameType` prop →
`GameEngine`'s `handleAnswer` reports it back via `onProgress` unchanged →
`PlayScreen.handleProgress` writes that exact value as `learning_events.game_type`.
It is the same single value threaded through every activity type via
props, not independently hardcoded strings at each end — a mismatch is not
structurally possible in the current code, confirmed by reading every hop
rather than just the two ends. "Fill the Story" (the prompt doc's "prime
suspect," being unknown to prior reports) goes through the identical path
as every other rank.

**H3 — word desync between plan and quest.** Ruled out for every tested
scenario. In each Phase 1 attempt, `pathWord` (the word the guided path
displays and gates) matched the word actually written to
`learning_events` — verified directly via DB query each time. The one real
desync-adjacent phenomenon found (mastery reaching 100% after a single
correct answer, rolling `currentWord` forward mid-session) is the
already-known, already-documented A2 calibration gap, not a newly
discovered bug — flagged again below as a reminder, not re-litigated as
this run's finding.

**H4 — "today" boundary bug / daily reset.** Ruled out per the user's own
clarification at kickoff: Sal completed Tap & Hear and saw the stuck
counter in the same sitting, not across a day boundary. `questProgress.js`
computes "today" via client-local midnight (`new Date(); setHours(0,0,0,0)`)
compared against `recorded_at`, which is populated by Postgres' `now()` —
both were exercised correctly in every Phase 1 attempt with real,
same-day timestamps.

**H5 — silent write failure (RLS/error-swallowing).** Ruled out. Every
`learning_events` insert during Phase 1 succeeded — confirmed via direct
database query, not just assumed from lack of console errors (the
console was also checked and showed no `[learning_events]` error lines,
which is what the code logs on a real failure).

**No hypothesis was confirmed as the cause, because the bug did not
reproduce.** This is different from "H1-H5 are all wrong forever" — it
means none of them explain a *reproducible* failure, because there isn't
one in hand to explain. See COMPLETION for what this means for next
steps.

## PHASE 3 — Fix

Status: PARTIAL BY DESIGN — no behavioral fix (no demonstrated root cause
to fix, per constraint 1); the permanent guard was added, since the
prompt doc calls for it unconditionally ("whatever the cause")

**No behavioral code change was made.** Constraint 1 is explicit: no fix
without a demonstrated root cause, and Phase 1/2 did not produce one.

**Guard added**: `scripts/check-activitydefs-sync.mjs`, wired into `npm
run build` (alongside `check-wordart-sync`, `check-stroke-coverage`,
`check-findtheword-sync`) and exposed as `npm run check:activitydefs-sync`.
Statically scans `src/lib/activityDefs.js`'s `ACTIVITY_DEFS` ids against
every `gameType === '<id>'` render case in `src/games/GameEngine.jsx`,
failing the build if either side has an entry the other doesn't. This
doesn't fix today's bug (H2 was structurally ruled out, not just
untriggered) — it's a permanent regression guard against a *future*
refactor breaking the shared-variable guarantee that makes H2 impossible
today (e.g., someone adds a new `ACTIVITY_DEFS` entry without its
`GameEngine` render case, which would currently fail silently as a blank
activity screen instead of a loud build failure). Verified: catches a
deliberately-broken case in an isolated test, and `npm run build` passes
clean against the real files (10/10 activities matched).

## PHASE 4 — Regression tests

Status: DONE — new spec added and green; full suite green

**`tests/quest-progression.spec.js`** (new): as a real disposable-account
user, completes Tap & Hear live for "frog," then asserts Word Hunt
unlocked and "1 of 10 done today" both via in-app navigation (no reload)
and after a hard reload — pinning down the exact mechanism (Phase 1's
attempt 2 shape) that worked correctly in manual testing, so a future
regression in `invalidateQueries`/`refetchOnMount` fails a test instead of
shipping silently.

**Found and fixed a real bug in the test itself while writing it** (worth
recording, since it's a trap future specs in this suite could hit too):
the local dev session plan falls back to `buildSupabaseFallbackPlan`
(`src/hooks/useSessionPlan.js`) whenever `/api/session-generator` isn't
reachable — true for Playwright runs against the plain Vite dev server,
which has no serverless functions. That fallback sorts the current unit's
words **ascending by mastery** and caps the batch at **6**. My first seed
attempt gave "frog" partial progress (33%) while leaving its 7 unit-2
siblings at the default 0% — ascending sort ranks frog *last* (any
non-zero mastery sorts after a tie of zeros), so the 6-word cap silently
excluded "frog" from the session entirely. Confirmed via trace inspection
(a Session Complete screen listing 6 *other* unit-2 words, never "frog")
before realizing the cause. Fixed by mastering frog's 7 siblings first, so
frog — still under the 80% threshold — sorts lowest and is guaranteed
in the batch. No product code changed for this; it was a test-fixture bug,
not a real one, but it's exactly the kind of gap that could make a
regression test pass for the wrong reason (never actually touching the
word it claims to test) — future specs that seed partial mastery for a
"current word" should account for this ranking behavior.

Also found and fixed, less interesting: `getByRole('button', { name:
targetWord, exact: true })` never matched, since each tile's accessible
name combines its image alt + visible label into e.g. `"horse horse"` —
switched to an anchored regex (`/^horse\b/i`) and to waiting for the
specific tile to be enabled (`disabled={answered}` in `GameEngine.jsx`)
rather than a blind fixed sleep between questions.

**Full suite**: `npx playwright test` — 41/42 passed on the first run;
the one failure (`session-complete-a2.spec.js`, an XP-speed-bonus
threshold assertion unrelated to anything this run touched) passed clean
on its own re-run in isolation, per this repo's own documented flake
convention. **42/42 effectively green.**

## PHASE 5 — Ship + prove on production

Status: DONE

All gates re-confirmed green on the merge candidate: `npm run build`
(now including the new `check-activitydefs-sync` gate), `npm run
check:no-emoji`, `eslint` on the two new files (one pre-existing,
repo-wide `'process' is not defined` error in the new test file — present
in every other `tests/*.spec.js` file, confirmed not a new category).

`git merge --no-ff fix/quest-progression` completed cleanly into local
`main` (commit `84c31e5`). Approved and pushed: `git push origin main`
(`0e69411..d18bee2`).

**Deployment check**: Vercel status went `pending` → `success`
("Deployment has completed") within ~20 seconds of the push — no
stuck-deployment incident this time.

**Production verify — replayed Phase 1's exact repro on a fresh
disposable account against the live site**: seeded the same fixture as
`tests/quest-progression.spec.js` (unit 1 mastered, unit 2's other words
mastered, "frog" at 33%), confirmed via automation Chrome:
- Home screen: `Nova mapped your next word-star: "frog"` — matches.
- Play tab: `frog / 0 of 10 done today`, Tap & Hear "YOU'RE HERE!",
  everything else locked — **exact match to Sal's original bug
  screenshot**.
- Played the real Tap & Hear session live (8 questions: frog, cat, dog,
  bird, fish, bear, ball, book — production uses the real
  `/api/session-generator`, not the local-dev fallback, so the batch
  composition differed from the test's local-dev run, but included
  "frog" as required either way) through to "Session Complete!"
  ("frog" confirmed present in the "Words you practiced" list).
- Clicked "Keep going" (in-app navigation, no reload): **`frog / 1 of 10
  done today`, Word Hunt unlocked ("YOU'RE HERE!")** — correct, live, on
  production.

Test account deleted afterward; `child_profiles`/`word_progress`/
`learning_events` rows confirmed cascaded to zero via direct query.

## COMPLETION

Status: DONE

**Phase 1.0 reconciliation**: zero undocumented commits since CONTENT_R1's
close-out. The "9 vs 10 activities" discrepancy the prompt doc worried
about traces to imprecise prose in the prior `DEVICE_PREP_REPORT.md`, not
a code change — `ACTIVITY_DEFS` already had all 10 entries (verbatim
table in Phase 1.0 above) at that time.

**Reproduction**: could not reproduce Sal's reported symptom ("frog / 0 of
10 done today," stuck after completing Tap & Hear) across three realistic,
carefully-controlled attempts — natural `currentWord` progression with
in-app nav, a full `PlayScreen` remount, and reviewing an already-mastered
word via the Galaxy map (the shape that plausibly matches Sal's real
account's actual state — his "frog" `word_progress` row was already at
100% mastery, last played July 3rd, four days before this bug report).
All three showed correct behavior: the guided path unlocked Word Hunt and
incremented the counter every time.

**Root cause**: none demonstrated. All five ranked hypotheses (H1
missing invalidation, H2 writer/reader key mismatch, H3 word desync, H4
daily-boundary bug, H5 silent write failure) were checked against direct
evidence — database queries, source tracing, and live browser
reproduction — and ruled out for every scenario actually testable. Per
constraint 1, **no behavioral fix was made**, since there is no
demonstrated root cause to fix.

**What *was* shipped, and why it's not a contradiction of constraint 1**:
- `scripts/check-activitydefs-sync.mjs` — a static, build-wired guard
  (wired into `npm run build`) asserting every `ACTIVITY_DEFS` entry has a
  matching `GameEngine.jsx` render case. The prompt doc calls for this
  *unconditionally* ("whatever the cause"), and it's a defensive guard
  against a *future* refactor, not a fix for today's unproven bug.
- `tests/quest-progression.spec.js` — a regression test pinning down the
  exact correct behavior demonstrated in Phase 1 (learning_events write +
  query invalidation + refetch unlocking the guided path), so a future
  regression in that mechanism fails a test instead of shipping silently.
  Building it surfaced and fixed a real bug in the *test fixture itself*
  (the local dev session-plan fallback's ascending-mastery-sort-then-cap-6
  selection was silently excluding "frog" from the session) — documented
  in Phase 4 as a trap worth remembering for future specs in this suite.

**A real, incidental finding, already known and re-flagged rather than
fixed**: mastery reaching 100% after a single correct answer (no minimum
attempt-count guard on the stored value, only on the celebration UI) rolls
`currentWord` forward faster than a human tester expects. This is the
already-documented A2 calibration gap — not new, not touched, correctly
out of scope for a bug-fix run per constraint 2 ("requires a product
decision... STOP and report options").

**Gates**: `npm run build` (now 4 sync checks + vite build), `npm run
check:no-emoji`, `eslint` (no new categories), full Playwright suite
42/42 (41 first-pass + 1 flake re-run clean in isolation, per this repo's
own convention) — all green.

**Options for you, since this run ends without a shipped behavioral
change** (constraint 1's explicit allowance — "that is a successful run"):
1. **Ask Sal for more specific repro detail** — ideally a screen
   recording, or at minimum: exact device/browser, whether he tapped
   "frog" directly (Galaxy map / "sleepy star" review banner) versus it
   being the natural next-quest word, and whether any other tab/device
   was open on the same account at the time. Given his account's own data
   shows "frog" already mastered days before this report, the review-tap
   path is the most likely real scenario — and that's exactly the one
   this run reproduced successfully (no bug).
2. **Treat this as resolved/unreproducible for now** — ship the guard +
   regression test (this run's actual deliverable) and revisit only if
   the symptom recurs with better evidence (e.g., a captured
   `[learning_events]` console error, or a screen recording showing the
   stuck state after a *confirmed* full "Session Complete" completion).
3. **If it recurs specifically on a review-tap of an old word**: worth
   double-checking real production timing under slower network/device
   conditions than this run's fast automated clicking — every hypothesis
   this run ruled out was ruled out under fast, controlled conditions;
   a genuinely slow real device could still theoretically expose a race
   this run's pacing never triggered. Not evidence of one existing, just
   a residual gap in what "ruled out" can mean without slowing down the
   repro to match a real child's actual tap cadence.

**Shipped**: pushed to `origin/main` (`0e69411..d18bee2`), deployed
successfully, and the exact repro was replayed live on production with
correct results (see Phase 5). No further action needed unless Sal's
symptom recurs — in which case, start from option 1 above (more specific
repro detail, ideally a screen recording).
