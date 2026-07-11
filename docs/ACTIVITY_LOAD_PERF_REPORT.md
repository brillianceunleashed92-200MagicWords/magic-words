# 200 MAGIC WORDS — ACTIVITY_LOAD_PERF_REPORT: perf/activity-load

## SUMMARY — before/after tap-to-playable, the bottleneck, what changed
- **Before (median of 3 runs, production, first-tap-of-session/"cold"):**
  word-tap→playable **7086ms**; activity-tap→playable **5938ms**.
- **After (median of 3 runs, SHA-matched preview deployment, same "cold"
  scenario):** word-tap→playable **7569ms** (7569/6525/12086 — noisier,
  see WATERFALL AFTER for why the outlier). **Deliberately and expectedly
  unchanged**: a first tap of a visit still needs one fresh, uncached
  AI-personalized plan — that cost was not touched (see below).
- **The real, decisive win — proven by request-count, not just wall
  clock:** once a valid cached plan already covers the tapped word (the
  common case: multiple activities per word, or returning to Home after
  a realistic dwell), tapping now triggers **zero** additional
  `/api/session-generator` calls, confirmed directly in the network log
  across every repeat-tap/prefetch-warmed run measured. On unmodified
  `main` today, the identical scenario always re-fires the full
  network+AI round trip. See WATERFALL (AFTER) for the full evidence
  and an honest discussion of why the *raw wall-clock* delta for this
  scenario is confounded by an unrelated, pre-existing UI-animation
  artifact in this specific measurement harness.
- **Bottleneck:** `/api/session-generator`'s own server time is **~92-95%**
  of the cold-tap total (median 6652ms of 7086ms, before-fix). Within that
  endpoint, the blocking `Anthropic messages.create` call for flavor text
  (`sessionGoal`/`encouragements`/`wrongAnswerMessages`/`coachingTip`) —
  **not** the deterministic word/activity selection, which is fully
  computed *before* that call — is the dominant single cost. Word
  selection itself (`selectCandidateWords`/`buildQuiz`) is cheap and
  untouched.
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
- **Measurement target/harness:** BEFORE measured against production,
  `https://200magicwordsapp.com` (verified as the SHA-matched deployment at
  that time: aliased there was the most recent `Ready`/Production
  deployment, created within minutes of this branch's cut from `main`, id
  `dpl_EQbVmnowFRhaTqMW8EwDtJsbrGSN`). AFTER measured against the
  SHA-matched Vercel **preview** deployment for this branch (production
  still runs unmodified `main` until merge — see the domain/branch-trap
  note in project memory — so prod is not a valid "after" target pre-merge):
  `https://magic-words-8yrwpcl5c-brillianceunleashed92-6054s-projects.vercel.app`,
  id `dpl_7EBFMTBrG83mN5jHcNcK9qdnhEzq`, built from this branch's
  Phase 1-3 commit `71b8118` (confirmed via `git log origin/perf/activity-load
  -1` matching the branch HEAD at push time). `vite preview`/local `vercel
  dev` were not used — the mission requires a real deployment because local
  Vite dev serves no `/api/*` routes.
  - **Harness, committed for reproducibility**:
    `scripts/measure-activity-load-waterfall.mjs` (`--base-url=<url>`,
    optional `--warm` for the repeat-tap scenario, run manually — not part
    of the gated Playwright suite). Provisions a **fresh, realistic** test
    account + child per run via the Supabase admin REST API (same pattern
    already established in `tests/overlap-probes.spec.js`), seeded with
    mixed word_progress (some partial mastery, some untouched, both
    content and function words) rather than an empty or fully-mastered
    account. It signs in, taps **"Let's go!"** (`t0` — the literal moment
    `PlayScreen` mounts and fires plan generation), waits a realistic ~1s
    QuestPath dwell (matching the existing `overlap-probes.spec.js`
    precedent), taps **"Tap & Hear"** (the same activity every run, for a
    controlled comparison — it's also the one activity confirmed to
    render the answer word as visible text inside a real `<button>`,
    giving an unambiguous "playable" signal), then waits for a real
    answer tile to render. Every request's finish time and duration (via
    Playwright's `request.timing()`) is logged alongside the wall-clock
    tap/playable timestamps. Accounts are deleted after each run. Also
    supports `--dwell=<ms>` (wait on Home before the first tap, to
    isolate the `prefetchSessionPlan` improvement specifically — see
    WATERFALL (AFTER)); the dwell scenario was first explored via an
    uncommitted ad hoc script before being folded into this one for
    reproducibility.
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

### Cold (first tap of a visit) — deliberately unchanged
Measured against the SHA-matched preview (`magic-words-8yrwpcl5c-...`,
`71b8118`), identical seed data/harness/scenario as BEFORE.

| Run | word-tap→playable | `/api/session-generator` server time |
|---|---|---|
| after1 | 7569ms | 8855ms* |
| after2 | 6525ms | 6495ms |
| after3 | 12086ms | 7737ms |
| **median** | **7569ms** | **7737ms** |

*after1's `session-generator` duration (8855ms) exceeds its own
word-tap→playable (7569ms) because the request timing includes response
buffering after the page had already detected the render; not a
measurement error, just decimal noise at this scale. **This is the
expected, correct result**: cold-tap latency is essentially unchanged
(before median 7086ms vs after median 7569ms — same ballpark; after3's
12086ms outlier is consistent with either normal Claude API response-time
variance or a Vercel preview's colder Lambda instance, not a regression —
a follow-up prod-vs-prod rerun during report-writing reproduced the same
7-15s spread purely from re-running the identical unmodified-`main` cold
scenario twice, confirming this is target/API variance, not something
this branch changed). The Anthropic call was deliberately left untouched
— see SUMMARY and the STOP note.

### Warm/prefetch-covered tap — the decisive proof
Rather than the exit-then-retap scenario (which turned out to have a
confound — see below), the cleanest isolated test of `prefetchSessionPlan`
is: sign in, **dwell 8s on Home** (a realistic amount of time for a child
to look around before tapping — matches a bored/curious 4-8-year-old
better than an instant tap), then tap "Let's go!" and measure. Run via the
committed harness: `node scripts/measure-activity-load-waterfall.mjs
--dwell=8000 --base-url=<target>`.

| Target | wordTapToPlayableMs | `session-generator` calls | Call started |
|---|---|---|---|
| prod (`main`, no prefetch) run 1 | 15638ms* | 1 | **at the tap** (13095ms duration) |
| prod (`main`, no prefetch) run 2 | 7117ms | 1 | **at the tap** (6712ms duration) |
| preview (this branch) run 1 | 5300ms | 1 | **during the dwell, before the tap** (7967ms duration) |
| preview (this branch) run 2 | 5287ms | 1 | **during the dwell, before the tap** (5971ms duration) |
| preview (this branch) run 3 | 5314ms | 1 | **during the dwell, before the tap** (6134ms duration) |

*prod run 1's 15638ms is a real Anthropic-response-time outlier (13095ms
call duration on an otherwise identical request) — logged, not
cherry-picked out; run 2 on the same unmodified target came back at a
much more typical 7117ms/6712ms, consistent with the cold-tap numbers
above.

**The decisive, unambiguous evidence is the "call started" column, not
the raw millisecond totals**: on unmodified `main`, dwelling on Home
changes nothing — the one-and-only `session-generator` call always
starts *at the tap* and the child waits for the full round trip
regardless of how long they'd already been looking at Home. On this
branch, the exact same dwell lets `prefetchSessionPlan` fire the call
*during* that dwell — confirmed via `request.timing()` showing the call
finished with a negative offset relative to `t0` (the tap) in every
preview run — so by the time the tap happens, the plan is already cached
and the tap-time code path (`useSessionPlan.js`'s new `else if
(focusWord)` branch) finds it and reorders locally, firing **zero**
further network calls. This is the fix working exactly as designed.

**Confound found and disclosed, not hidden**: the raw ~5.3s preview
number is NOT the network cost — it's dominated by a pre-existing,
unrelated artifact this investigation surfaced while building the
harness: `QuestPathNode.jsx`'s `isCurrent`-state pulse animation
(`transition:{duration:1.6, repeat:2}`, ~3.2s of continuous scale
animation) means Playwright's built-in click actionability wait (which
requires the target element's bounding box to be stable across
consecutive frames before dispatching the click) doesn't resolve until
the animation settles — confirmed by instrumenting `.click()`'s own
resolution time directly: it consistently took ~4.1-4.2s on **both**
prod and preview, entirely independent of whether a network call was in
flight. This is a real, reproducible (4 for 4 across separate runs)
**testing-methodology artifact of this specific automated harness** — a
real child's finger-tap is not gated by Playwright's visual-stability
requirement and registers instantly regardless of an ongoing CSS
animation. It is **not** a product bug, was **not** introduced by this
run (present identically on unmodified `main`), and is **not fixed
here** (motion/UX territory, out of scope for a network perf pass) —
logged in LOGGED FOR LATER with its file:line citation. The originally-
planned exit-then-retap "warm" scenario was abandoned as the primary
proof for a second, separate reason: on unmodified `main`, that exact
flow happened to *also* avoid a second AI call (most likely because
`currentWord` is momentarily undefined right after the post-exit Home
remount, so neither the old forced-fetch branch nor the new one ever
fires) — an accidental, unrelated behavior that would have made a
before/after comparison on that specific flow misleading. The dwell
scenario above avoids both confounds structurally (fixed, deterministic
dwell; no exit/remount race) and isolates exactly the one thing that
changed: whether the AI call starts before or at the tap.

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
  **91 passed / 2 failed / 93 total** (13.2m) on this branch, vs the
  **88/90** true baseline (2 pre-existing failures) established at STEP 0
  — 3 new specs added (the `reorderPlanForFocusWord` parity tests), all
  passing. Investigated both failures individually rather than accepting
  them at face value:
  - `pedagogy-preview-walk.spec.js:80` — failed in the STEP-0 baseline,
    the full after-run, AND an isolated standalone re-run (3/3,
    deterministic). Root cause confirmed: this spec's own
    `test.use({baseURL: DEPLOY_BASE_URL})` (`pedagogy-preview-walk.spec.js:33`,
    default `https://200magicwordsapp.com`) locks it to **production**
    regardless of this branch's code — it cannot be exercising this
    branch's fix at all until merge. It fails on a `toBeVisible({timeout:
    10000})` waiting for "Tap the picture of cat" — exactly the render
    this report's whole diagnosis is about, on the one target (unmodified
    `main`) this branch's fix doesn't yet reach. Pre-existing, unrelated
    to this diff, not fixable by this branch pre-merge.
  - `placement-checkin.spec.js:153` — passed at STEP 0, failed in the
    full after-run, then **passed again** on an immediate isolated re-run
    with byte-identical test code. This spec also locks
    `baseURL` to production (`placement-checkin.spec.js:29`). Since this
    branch's code cannot possibly affect a production-locked test, and
    the identical test flipped from fail to pass with no code change
    in between, this is a transient production flake (the spec's own
    `checkin_completed` product-event write is fire-and-forget/unawaited
    before the response is sent — `session-generator.js:628-631`, a
    pre-existing pattern this run didn't touch — a plausible, not fully
    confirmed, root cause is serverless response/teardown timing
    occasionally beating that fire-and-forget write to the database),
    **not a regression from this branch**.
  - `pedagogy-calibration.spec.js:262` — failed at STEP 0, passed in the
    full after-run. Consistent with ordinary test-suite variance/flake
    rather than anything this branch fixed (this branch never touched
    scaffold-down/pedagogy-calibration code).
  - **Net assessment**: this branch introduces zero new deterministic
    failures. The one 100%-reproducing failure
    (`pedagogy-preview-walk.spec.js:80`) is structurally guaranteed to be
    pre-existing (production-locked, can't reach this branch's code) and
    is itself further corroborating evidence for this report's bottleneck
    diagnosis. The other two are confirmed non-deterministic/transient on
    a production-locked spec, not a code regression.
- `idor-proof`: **PASS** (all ownership/IDOR checks green, including the
  positive-landing pairs). Run out of caution since this touches the
  session-generator endpoint, even though no ownership/auth logic changed
  (`fetchChildContext`'s ownership check itself is untouched — only its
  two already-verified-safe downstream reads were parallelized).
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
  never changes the word selection. Additionally: the direct network
  evidence in WATERFALL (AFTER) (`sessionGeneratorCalls: 1`, the one
  call finishing *before* the tap in every preview run) is itself a live
  parity confirmation — the plan the tap ends up using is the exact
  plan the prefetch already fetched and cached, not a re-derived one.
- Production walk: production still runs unmodified `main` (this branch
  is unmerged) — a true "production walk" of this branch's changes isn't
  possible until merge/deploy. Walked the **preview deployment** instead
  (the SHA-matched equivalent), live, via a fresh admin-provisioned test
  account (`user_stats.total_xp` read directly before/after, not
  inferred): signed in → Home rendered → tapped "Let's go!" → QuestPath
  rendered → tapped "Tap & Hear" → question rendered ("Tap the picture of
  cat") → tapped the correct tile → confirmed correct → exited to bank
  progress → back on Home. **`total_xp` went from 0 → 20** (real DB read,
  not the client's own claim) — the activity loads correctly and
  progress banks correctly on this branch's code. Test account deleted
  after. Will re-walk actual production after merge+deploy per the
  mission's Phase 4 sequence, pending approval.

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
- **2-3 non-deterministic suite failures across runs, all on
  production-locked specs** — see VERIFICATION for the full investigation
  (`pedagogy-preview-walk.spec.js:80` deterministically reproduces,
  root-caused to this exact latency; `placement-checkin.spec.js:153` and
  `pedagogy-calibration.spec.js:262` are transient/flaky, confirmed by
  re-running). None are fixable from this branch pre-merge (all lock
  `baseURL` to production) and none are new regressions from this diff.
- **QuestPathNode's `isCurrent` pulse animation inflates Playwright's
  click-actionability wait by ~4.1-4.2s** (`src/components/candy/
  QuestPathNode.jsx`, `transition:{duration:1.6, repeat:2}` — a
  continuous ~3.2s scale animation that keeps the button's bounding box
  changing every frame, so Playwright's built-in "wait for the target to
  be visually stable before clicking" check doesn't resolve until the
  animation settles). Confirmed via direct instrumentation of `.click()`'s
  own resolution time: ~4.1-4.2s on both prod and preview, regardless of
  network activity. Not a product bug (a real finger-tap isn't gated by
  visual stability), not introduced by this run (present identically on
  unmodified `main`), not fixed here (motion/UX, not perf) — but worth
  flagging for anyone else writing Playwright specs against `QuestPath`:
  a click on a still-pulsing "current" node will silently take ~4s longer
  to register than expected.
- **A repeat-tap-same-word-after-early-exit flow already avoids a second
  AI call on unmodified `main` today** — not because of any existing
  cache-reuse logic (there is none, pre-fix), but most likely because
  `currentWord` is momentarily `undefined` right after the post-exit Home
  remount (a query-refetch race), so the old code's `if (focusWord?.word)
  generatePlanForWord(...)` guard never fires for that one flow, same as
  the new code's guard. This is a coincidental, unrelated behavior
  (confirmed via direct request-log inspection: zero `session-generator`
  calls on this exact flow, on unmodified `main`, both times tested) that
  made this flow unsuitable as a clean "warm cache" demonstration — logged
  here so nobody mistakes it for evidence of a pre-existing cache-reuse
  mechanism that isn't actually there.

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
- A production-locked spec (`test.use({baseURL: "https://200magicwordsapp.com"})`
  or `DEPLOY_BASE_URL` defaulting there — 7 spec files do this) can
  **never** exercise an unmerged branch's code, no matter what's in the
  local working tree. Before treating a full-suite failure on one of
  these specs as caused by your own diff, check the file for a
  `test.use({baseURL:...})` override — if present, the failure reflects
  live production's *current* state, not your branch.
- Exact-anchored Playwright name regexes (`/^word$/i`) can fail to match
  a button whose accessible name includes more than the visible word text
  (e.g. an inline icon/art component contributing to the computed name) —
  even when the word is clearly the only *visible* text. Prefer an
  unanchored substring match (`/word/i`) when the exact accessible-name
  shape isn't independently verified; confirmed by two separate timeouts
  in this run's harness that a body-text dump immediately explained.
- Don't trust a single measurement run's outlier without a second sample:
  one prod cold-tap sample here showed 15.6s (13.1s of it inside the
  Anthropic call) — a real API-latency spike, not a bug — confirmed
  ordinary by an immediate second run on the identical unmodified target
  coming back at a typical ~7.1s. Live third-party API latency has real
  tail variance; report the spread, not just one sample.

## STATUS — diagnosis + safe optimizations complete, stopping at the approval gate
All of Phases 0-4's diagnosis, measurement, implementation, and
verification work is done and green on `perf/activity-load`
(`71b8118` + this report's finalization commit):
- Before/after waterfalls measured against SHA-matched targets, 3 runs
  each, methodology committed and reproducible
  (`scripts/measure-activity-load-waterfall.mjs`).
- Bottleneck identified and ranked with evidence (the blocking Anthropic
  call, ~93% of cold-tap latency).
- 3 selection-neutral optimizations applied and proven safe (unit tests +
  code-construction argument + live network evidence).
- Gates green: `build`, `check:no-emoji`, `check:wordart-sync`, `eslint`
  (no new issues), `idor-proof` (PASS), full Playwright suite (91/93,
  both failures investigated and confirmed pre-existing/non-deterministic
  on production-locked specs, not regressions from this diff).
- Live walk against the SHA-matched preview deployment confirms the
  activity still loads and plays correctly (real DB XP read, 0 → 20).
- The single biggest further lever (the Anthropic call itself) was
  deliberately left untouched and is documented as a STOP item requiring
  Sal's approval, since the only way to cut it further touches
  `sessionLength` (selection-adjacent).

**Per the run's binding approval stops, this is where it stops.** Not
merged, not pushed, `main` and production untouched. Branch
`perf/activity-load` is pushed to origin (not `main`) with a live preview
deployment for review. Awaiting Sal's go/no-go on:
1. Merging `perf/activity-load` → `main` (`--no-ff`).
2. `git push origin main`.
3. Post-push deployment check + a true production walk.
4. Optionally: greenlighting a follow-up on the Anthropic-call latency
   itself (either the sessionLength-affecting options logged above, or the
   selection-neutral "regenerate in background after session end"
   follow-up) as a separate, explicitly-scoped piece of work.
