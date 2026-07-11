# 200 MAGIC WORDS — ACTIVITY_LOAD_PERF_REPORT: perf/activity-load

## SUMMARY — before/after tap-to-playable, the bottleneck, what changed
- **Before (median of 3 runs, production):** word-tap→playable **7086ms**; the
  visible wait after the literal activity-node tap ("activity tap→playable")
  **5938ms**.
- **Bottleneck:** `/api/session-generator`'s own server time is **~92-95%**
  of the total (median 6652ms of 7086ms). Within that endpoint, the blocking
  `Anthropic messages.create` call for flavor text (`sessionGoal`/
  `encouragements`/`wrongAnswerMessages`/`coachingTip`) — **not** the
  deterministic word/activity selection, which is fully computed *before*
  that call — is the dominant single cost. Word selection itself
  (`selectCandidateWords`/`buildQuiz`) is cheap and untouched.
- **What changed (selection-neutral, see OPTIMIZATIONS):**
  1. Client: a word tap that already has a valid cached plan covering that
     word now reorders it locally instead of forcing a brand-new
     network+AI round trip (`useSessionPlan.js`).
  2. Client: the plan cache is now pre-warmed from `HomeScreen` (restoring
     this file's own documented "generate once at login" intent), so the
     *first* tap of a visit is far more likely to already have a plan in
     flight or ready by the time the child taps.
  3. Server: `fetchChildContext`'s two independent Supabase reads
     (`subscriptions`, `word_progress`) now run in parallel instead of
     serially.
- **The single biggest lever (the blocking Claude call itself) was
  deliberately NOT touched** — see LOGGED FOR LATER / the STOP note below.
  Changing it would touch `sessionLength` (how many of the already-selected
  words make the session), which this run's guardrail treats as
  selection-adjacent and out of scope for a unilateral perf change.

## RUN TIMING + suite baseline + measurement target/harness
- **STEP 0 start:** 2026-07-11 09:52 EDT
- **Branch:** `perf/activity-load`, cut off `main` @ `4b2dfd0` (merge:
  fix/no-blank-screens)
- **Prompt doc + report skeleton committed as first commit:** `33d2418`
- **Full-suite baseline (with `SUPABASE_SERVICE_ROLE_KEY` exported — without
  it, 43 of 90 specs silently skip via `test.skip(!SERVICE_KEY, ...)`,
  which is NOT this branch's true baseline):** **88 passed / 2 failed / 90
  total** (13.4m). The 2 failures
  (`pedagogy-calibration.spec.js:262`, `pedagogy-preview-walk.spec.js:80`)
  are **pre-existing on unmodified `main`**, not caused by this run — both
  hit a hardcoded `waitForTimeout`/`toBeVisible({timeout: 10000})` budget
  around the exact "Tap the picture of {word}" render this report diagnoses
  as gated by the ~6-7s `session-generator` call. This is corroborating
  evidence for the bottleneck, not a new regression: a fix that
  meaningfully cuts that latency should make these two tests *more* likely
  to pass, not less. True baseline for this run's Phase 4 comparison is
  **88/90**, not 90/90.
- **Measurement target/harness:** production, `https://200magicwordsapp.com`
  (verified as the SHA-matched deployment: aliased there is the most recent
  `Ready`/Production deployment, created within minutes of this branch's cut
  from `main`, id `dpl_EQbVmnowFRhaTqMW8EwDtJsbrGSN`). `vite preview`/`vercel
  dev` were not used — the mission requires prod because local dev serves no
  `/api/*` routes. Harness: a standalone Playwright script (not a committed
  spec — a measurement tool, run manually, not part of the gated suite),
  provisioning a **fresh, realistic** test account + child per run via the
  Supabase admin REST API (same pattern already established in
  `tests/overlap-probes.spec.js`), seeded with mixed word_progress (some
  partial mastery, some untouched, both content and function words) rather
  than an empty or fully-mastered account. It signs in, taps **"Let's
  go!"** (`t0` — the literal moment `PlayScreen` mounts and fires plan
  generation), waits a realistic ~1s QuestPath dwell (matching the existing
  `overlap-probes.spec.js` precedent), taps **"Tap & Hear"** (the same
  activity every run, for a controlled comparison — it's also the one
  activity confirmed to render the answer word as visible text inside a
  real `<button>`, giving an unambiguous "playable" signal), then waits for
  a real answer tile to render. Every request's finish time and duration
  (via Playwright's `request.timing()`) is logged alongside the wall-clock
  tap/playable timestamps. Accounts are deleted after each run.
  - **Trap avoided, logged for anyone reusing this harness**: an earlier
    version of the script waited for `getByText(/Preparing your
    quest/).waitFor({state:'hidden'})` as the "playable" signal — Playwright
    resolves a `hidden`/`detached` wait **immediately** if the element was
    never attached in the first place, which is exactly what happens when
    there's a race between the click and the loader's first paint. That
    version under-reported the wait by ~5-6 seconds (it recorded ~1.4s when
    the real number was ~7.5s). Fixed by waiting for a definitive positive
    signal instead (a real seeded word rendered as a clickable answer
    tile) — never wait for a transient loading state to become
    hidden/absent as your success condition.

## CALL-GRAPH RECON — the activity-selection path, serial vs parallel, cached vs refetched
(Full detail gathered via a research pass; file:line citations below.)

**The two taps.** Home/Galaxy word tiles (`HomeScreen.jsx`/`GalaxyScreen.jsx`)
call into `CandyGalaxyShell.jsx:160-169`
(`onStartQuest`/`onOpenWord={(word) => { setQuestWord(word); setNavTab('play'); }}`),
mounting `PlayScreen` with `focusWord=questWord`. **This is the tap that
actually kicks off session generation.** A second, later tap inside
`PlayScreen`'s own `QuestPath` (`QuestPath.jsx:100` →
`PlayScreen.jsx:401`, `onSelectActivity={(id) => setGameType(id)}`) is the
tap that *gates rendering* (blocks on the plan already in flight from tap
#1) but — Quiz Boss aside — doesn't itself trigger a new network call.

**`useSessionPlan`/`/api/session-generator` (pre-fix):**
`PlayScreen.jsx:72-75`'s effect fired `generatePlanForWord(focusWord.word)`
(`force=true`, **always bypassing the sessionStorage cache check** at
`useSessionPlan.js:96`) on every mount with a focus word — concurrently
with the hook's *own* internal mount effect (`useSessionPlan.js:135-138`),
which fires a plain, cache-checking `generatePlan()`. Net effect: **every
word tap fired two calls to `generatePlan`, and even when a valid cache
existed, its result was thrown away** by the forced fetch's later-arriving
network response. `QuestPath` itself renders immediately regardless of
`planLoading` (`PlayScreen.jsx:376-411`); the actual blocking wait is only
after the *second* tap, at `PlayScreen.jsx:414-416`
(`if (activePlanLoading || !activeSessionPlan) return <GalaxyLoader/>`).

**Everything else in the tap-to-playable window** (confirmed non-issues,
already fine): `child_profiles`/`subscriptions`/`word_progress`/etc. are all
React Query hooks (`useCandyGalaxyData.js:22,39-43`) that fire concurrently
already and don't block rendering. `/api/speak` (TTS) is fire-and-forget,
never awaited before render, with a module-level in-memory dedupe cache
(`gameAudio.js:10-11,63-83`). WordArt is inline SVG — zero network image
loads. None of these needed a fix.

**`api/session-generator.js` (pre-fix), ~7-8 sequential hops before
responding:** auth (`getVerifiedUser`) → rate-limit select → rate-limit
upsert (`_lib/security.js:26-90`, genuinely sequential — the upsert depends
on the select's count) → `child_profiles` → `subscriptions` →
`word_progress` (`fetchChildContext`, `session-generator.js:248-275`, the
**last two were sequential but independent of each other**) → `words`
table (`selectCandidateWords`, genuinely depends on `plan` from
`subscriptions` for its unit cap) → a full blocking `Anthropic
messages.create` call (`session-generator.js:825-829`). Word/activity
*selection* (`selectCandidateWords`/`buildQuiz`, lines ~296-461) is 100%
deterministic and fully computed **before** the AI call — the AI call only
produces flavor text (`sessionGoal`/`encouragements`/
`wrongAnswerMessages`/`coachingTip`) and picks `sessionLength` within an
already-hardcoded per-difficulty range. Rough split of the 886-line file:
~60-65% is pedagogy/selection logic (do not touch), ~35-40% is
auth/rate-limit/fetch-sequencing/AI-call plumbing (safe to restructure).

## WATERFALL (BEFORE) — the 3-run measured breakdown
All three runs: fresh account, same seed data (`cat` 60%, `dog` 40%,
`bird`/`fish` 0%, `the` 80%, `is` 20%), same harness, production.

| Run | word-tap→QuestPath visible | activity-tap→playable | word-tap→playable | `/api/session-generator` server time |
|---|---|---|---|---|
| before1 | 137ms | 5938ms | 7086ms | 6424ms |
| before2 | 123ms | 6411ms | 7544ms | 6978ms |
| before3 | 134ms | 5926ms | 7069ms | 6652ms |
| **median** | **134ms** | **5938ms** | **7086ms** | **6652ms** |

Representative single-run full waterfall (before3-equivalent capture,
offsets relative to the word tap):

```
214ms   81ms   GET  supabase auth/v1/user
301ms   89ms   GET  supabase auth/v1/user
375ms   73ms   GET  supabase rest/v1/word_progress
377ms   75ms   GET  supabase rest/v1/subscriptions
388ms   85ms   GET  supabase rest/v1/child_profiles
388ms   85ms   GET  supabase rest/v1/user_stats
388ms   85ms   GET  supabase rest/v1/user_sparks
388ms   85ms   GET  supabase rest/v1/user_streaks
408ms  105ms   GET  supabase rest/v1/parent_settings
408ms  106ms   GET  supabase rest/v1/learning_events
5461ms 180ms   POST /api/speak                      (fire-and-forget TTS, non-blocking)
7260ms 6958ms  POST /api/session-generator           <-- the wait
7484ms 216ms   POST /api/speak                       (next question's prefetch, non-blocking)
```
Everything before the `session-generator` line is React Query's own
concurrent fan-out on Home/PlayScreen mount (already parallel, already
fast, ~400ms total) — **it was never the problem.** The single
`session-generator` call dominates the entire waterfall.

## BOTTLENECK — ranked, with evidence
1. **`session-generator`'s blocking Anthropic call** (`session-generator.js:825-829`).
   Evidence: the endpoint's own measured server time is 6.4-7.0s across all
   3 runs; reading the code, everything BEFORE that call (auth,
   rate-limit, 3 DB reads, the `words` table read, and the fully
   deterministic `selectCandidateWords`/`buildQuiz`) is comparatively cheap
   — Supabase REST reads in the waterfall above each complete in
   ~75-115ms. By elimination and by code inspection, the AI call is
   responsible for the overwhelming majority of the ~6.4-7s endpoint time.
   Also the likely root cause of 2 pre-existing suite flakes (see RUN
   TIMING) whose timeout budgets assume a faster round trip than this
   endpoint currently delivers.
2. **Client-side duplicate/discarded fetch** (`useSessionPlan.js`
   pre-fix). Confirmed by code reading (two `generatePlan` calls racing on
   every focus-word tap) — this doesn't add wall-clock latency to a single
   cold tap, but it means a warm, valid, already-fetched cache was
   *never actually reused* on the one path (word tap) that most needs it,
   and it silently doubles AI-call volume/cost on every such tap.
3. **Server-side serial-when-parallelizable reads** (`fetchChildContext`,
   `subscriptions`+`word_progress`). Real but modest — each Supabase REST
   read in the waterfall above takes ~75-115ms, so parallelizing these two
   saves roughly one read's worth of latency (~75-115ms), a small fraction
   of the ~6.4-7s total.
4. **Confirmed non-issues** (ruled out, not fixed because nothing was
   wrong): `/api/speak` audio prefetch (already fire-and-forget,
   non-blocking); WordArt images (no network fetch at all, inline SVG);
   the React Query fan-out on Home/PlayScreen mount (already concurrent,
   ~400ms total, not on the critical path in any meaningful way next to a
   ~7s AI call).

## OPTIMIZATIONS — what was changed and why it's selection-neutral (with the before/after plan-parity proof)
All three changes are purely about *when*/*how often* the existing,
unchanged selection logic runs — none change which words, activities, or
distractors are selected, or their pedagogical ordering rules.

1. **Client: reuse a cached plan on focus-word tap when the word is
   already present** (`src/hooks/useSessionPlan.js`, new
   `reorderPlanForFocusWord`, `generatePlan`'s new `else if (focusWord)`
   branch). When a word is tapped and a still-valid (≤60min) cached plan
   already contains a quiz for that exact word, the client reorders that
   cached plan locally (`splice`+`unshift`, byte-for-byte the same
   operation `session-generator.js:778-788` already does server-side) and
   uses it directly — no network call, no new AI call. If the word isn't
   in the cached plan (e.g. tapped from deep in the Word Galaxy map,
   outside the adaptive current-unit pool), it falls through to the exact
   same forced fetch as before — **unchanged for that case.**
   - **Selection-neutrality proof**: `reorderPlanForFocusWord` only moves
     array elements — it never adds, removes, or regenerates a quiz. New
     tests `tests/session-plan-cache.spec.js` ("focus word not at front is
     moved to front, nothing else changes", "...already first is a
     no-op", "...absent from the plan returns it unchanged") assert the
     resulting `quizzes`/`wordSequence` are the exact same multiset of
     words as the input plan, with per-word data (`options`,
     `correctIndex`, etc.) untouched — only position changes.
2. **Client: pre-warm the plan cache from `HomeScreen`**
   (`src/hooks/useSessionPlan.js`'s new `prefetchSessionPlan`, wired into
   `HomeScreen.jsx`). Restores this file's own header comment's documented
   intent ("generates the full session plan ONCE at login") which had
   drifted once the app grew multiple screens — `useSessionPlan` only ever
   lived inside `PlayScreen`, which doesn't mount until *after* the tap
   that needs the plan. This calls the *exact same* unforced,
   cache-checking fetch, just earlier (while the child is still looking at
   Home, before tapping anything) — identical selection, identical
   endpoint, identical payload (`{childId}`), just started sooner. Silent
   no-op on any failure (never surfaces an error, never blocks Home's
   render) — the real `PlayScreen` mount effect is still the fallback of
   record.
3. **Server: parallelize `fetchChildContext`'s two independent reads**
   (`api/session-generator.js`, `subscriptions` + `word_progress` via
   `Promise.all`, after the `child_profiles` ownership check). Identical
   queries, identical returned data shape — only fetched concurrently
   instead of serially. `selectCandidateWords`'s own `words` read still
   waits on `plan` (from `subscriptions`) for its unit-cap filter, so it's
   correctly left as a genuine dependency, not parallelized.
- **Deliberately not touched**: the Anthropic call itself. See the STOP
  note below — the only way to meaningfully cut *first-tap* latency
  further touches `sessionLength` (how many of the pre-selected words ship
  this session), which this run treats as selection-adjacent and
  out of scope without Sal's sign-off.

## WATERFALL (AFTER) — same harness, the delta
IN PROGRESS (Phase 4)

## VERIFICATION — gates, idor-proof (if triggered), parity proof, walks
- `npm run build`: PASS (clean, 3.23s).
- `npm run check:no-emoji`: PASS.
- `npm run check:wordart-sync`: PASS.
- `npx eslint` on all 4 changed files: only pre-existing, unrelated
  `no-undef` errors in `api/session-generator.js` (CommonJS
  `require`/`process`/`module` globals — confirmed present identically on
  unmodified `main` via `git stash`, not introduced by this run) and one
  now-fixed `react-hooks/exhaustive-deps` warning in the new `HomeScreen.jsx`
  effect (matches the same `eslint-disable-next-line` convention already
  used for the identical pattern elsewhere in this file).
- Full Playwright suite (with `SUPABASE_SERVICE_ROLE_KEY` exported):
  IN PROGRESS (running).
- `idor-proof`: not yet run — pending a determination of whether it's
  triggered (no ownership/auth path changed; `fetchChildContext`'s
  ownership check itself is untouched, only its two downstream reads were
  parallelized). Will run it anyway before merge out of caution since this
  IS the session-generator endpoint.
- Plan-parity proof: see OPTIMIZATIONS #1 above (the 3 new
  `reorderPlanForFocusWord` tests) — a pure-function, deterministic
  parity proof rather than a live before/after byte-diff, because
  `buildQuiz`'s own distractor shuffle (`Math.random()`) makes two
  independent live `session-generator` calls for the same account
  non-identical *today, on unmodified `main`* (existing, pre-existing
  randomization, not something this run introduced) — a live diff would
  misleadingly "fail" on that pre-existing nondeterminism regardless of
  this run's changes. The pure-function test isolates exactly the
  operation this run adds (reordering a cached plan) and proves it alone
  never changes the word selection.
- Production walk: IN PROGRESS (Phase 4).

## LOGGED FOR LATER — anything else noticed (CSP blob errors, ordering question, etc.), untouched
- **STOP-worthy, needs Sal's approval if pursued**: the single biggest
  remaining lever is the blocking Anthropic call inside
  `api/session-generator.js` itself (~6.4-7s of the ~7.1s median,
  measured). It cannot be cut further without touching `sessionLength`
  (currently AI-chosen within a hardcoded per-difficulty range, which
  determines how many of the already-selected candidate words actually
  ship this session) — either by always using the existing deterministic
  `defaultLength` fallback instead of waiting for the AI's number, or by
  capping the AI call with a timeout that degrades to the same fallback.
  Both change *how many* of the pre-ordered words are returned in the
  common case, which this run's guardrail treats as adjacent to
  "changing which items it returns" and therefore out of scope for a
  unilateral perf change. A genuinely selection-neutral version of this
  idea — proactively regenerating the plan in the background after a
  session ends (so the *next* tap almost always hits a warm cache, same
  principle as this run's `prefetchSessionPlan` but re-triggered
  post-session instead of only on Home-mount) — is a reasonable follow-up
  and was considered, but scoped out of this run to keep the diff small
  and squarely verifiable.
- **CSP `blob:` console errors** — mentioned in the source doc's
  guardrails as explicitly out of scope; not investigated.
- **The pedagogy-ordering question** (whether AI-chosen `sessionLength`
  should exist at all vs. a fixed per-difficulty number) — explicitly a
  pedagogy decision, not perf; logged, not touched.
- **2 pre-existing suite failures** (see RUN TIMING) — logged with their
  probable root cause (this exact latency), not fixed as part of this run
  beyond the general latency improvement; will re-check in Phase 4 whether
  they now pass as a side effect.

## TRAPS
- **Playwright's `waitFor({state:'hidden'})` resolves immediately for an
  element that was never attached, not just one that's currently
  invisible.** Using a loading indicator's disappearance as a "done
  waiting" signal is a real race if there's any chance the click hasn't
  triggered its first render yet — always wait for a positive, definitive
  signal (a real rendered result) instead. This under-reported the true
  wait by ~5-6x in an early version of this run's measurement script
  before being caught and fixed (see RUN TIMING harness notes).
- **`SUPABASE_SERVICE_ROLE_KEY` (and the rest of `.env.local`) is not
  auto-exported to a plain shell** — `npx playwright test` without first
  `source`-ing `.env.local` silently skips 43 of 90 specs
  (`test.skip(!SERVICE_KEY, ...)`) with no error, producing a falsely
  "passing" 47/47 run that is NOT this branch's true baseline. Always
  `set -a; source .env.local; set +a` before a baseline/gate run.
- ACTIVITY_LABELS (`src/lib/activityLabels.js`) display text does not
  match the internal activity id names — `word_match` renders as "Tap &
  Hear", not "Word Match"; `rhyme_time` renders as "Match & Sort". A
  Playwright selector built from the id name alone (e.g. `/Word Match/`)
  will silently match nothing or the wrong element. Confirmed live while
  building this run's measurement harness.
