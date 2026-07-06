# 200 MAGIC WORDS — PROMPT 7: POLISH PASS (REPAIR ITEM 5, AUTOMATABLE HALF)
## Seventh in the repair sequence (after the activity roster pass, live on `ce7171b`). Self-contained. Covers everything in item 5 a desktop run can build AND verify. The mobile-mic verification and the celebration-misfire repros are explicitly NOT verifiable here — this run prepares them (instrumentation + a device checklist) for Sal's phone session.

## MISSION
1. **Galaxy-map lock fix** — dance shows locked despite being used/passed. The hunt starts where `FILL_THE_STORY_REPORT.md` pointed: the `done`/`isCurrent` per-word status derivation feeding `GalaxyScreen.jsx` (the tier gate and the legacy `App.jsx` list are already exonerated — Unit 3 is free on every plan).
2. **`lessonChrome` reduced-motion, fixed once at the primitive** — `AnswerTile` entrance/wiggle and `ConfettiStars` gate on `usePrefersReducedMotion()` INSIDE `lessonChrome.jsx`, so every consumer inherits it (the app-wide gap `ACTIVITY_ROSTER_REPORT.md` flagged).
3. **Session-flow polish** — XP toast lingers (~3s, non-blocking), sticky back button on scrolling screens, a light "what's next / come back tomorrow" line at end-of-play (NOT the backlog A2 Session Complete redesign — one line of guidance, growth-mindset register), Grown-Ups hold-to-unlock shortened from >3s to ~1.5–2s (still a real child gate; HoldGate is rAF-driven — mind the shim trap).
4. **Progressive hints, bounded** — implement the named Word Builder first-letter hint (VISUAL position highlight only — hints never speak letters or sounds, ever); audit every activity for a hint affordance and ensure each has at least audio-replay; write the hint map in the report. Do not invent elaborate per-activity hint systems.
5. **Say It with Nova — desktop-verifiable subset + instrumentation** (see PART 5). Includes its Candy-token migration (it is the last standalone `gameTheme.js` reader).
6. **Moments tracing entry (approved)** — Draw It word completion writes a lightweight `magic_moments` row ("Traced cat!") so the parents' feed recovers the content source tracing removed.
7. **`test@yahoo.com` deletion (approved in principle — confirmation-gated)** — see PART 7.
8. **Close the disclosed gaps** — formal overlap probes for Find the Word + Quiz Boss; `gameTheme.js` endgame census.

Branch `fix/polish-pass` off main. Scope guards: NO Session Complete A2 redesign, NO Placement Adventure, NO analytics, NO speculative mobile-mic fix shipped unverified. Full leg: merge, push, production-verify.

## PRE-FLIGHT (gate)
1. `git status` clean; `git log origin/main..main --oneline` empty (push first with approval if not). Confirm `ce7171b` is an ancestor of HEAD.
2. `SUPABASE_SERVICE_ROLE_KEY` available (shell env or `.env.local`) — existence check only, never printed.

## STEP 0 — WRITE THE REPORT FILE FIRST (non-negotiable)
Create `docs/POLISH_PASS_REPORT.md` with the REPORT headers below, "IN PROGRESS" under each. Commit first; update live.

## AUTONOMY & RULES
Standard block: autonomous Bash; stops only for secrets, destructive DB ops beyond own `nextgenprecisiondrones+*` accounts (PART 7's deletion is exactly such a stop), live payment mode, history rewrites. Fresh test accounts via `admin-user.mjs` + `seed-progress`, deleted after. Candy tokens only, errorless, whole-screen verification, `getByRole`, `db-query.mjs` for reads, full gates before merge.

Known traps (do not rediscover): rAF throttling in unfocused tabs (shim); hidden-tab media-decode suspension (race audio waits, 4s `Promise.race` pattern); overlap probes = synchronous `.paused` at next `play()`; local Vite serves no `/api`; `/api/speak` may be absent on previews; Playwright `workers: 1` with a known residual provisioning-flake class (re-run failures in isolation before treating as regression); Chrome autofill can hijack login with `test@yahoo.com` — verify the active account from the auth token before acting (moot after PART 7 succeeds).

**CORE METHODOLOGY RULE:** anti-phonics, absolute. Say It with Nova is whole-word speech recognition — pronunciation help plays the WHOLE word; no phoneme feedback of any kind, ever. The Word Builder hint is a visual position highlight, silent.

**DESIGN LAW:** DESIGN_BRIEF.md throughout. All new/touched chrome: chunk shadows + press-down, 44px+, no red/X, no emoji, reduced-motion respected.

Read first: `GalaxyScreen.jsx` + whatever computes per-word `done`/`isCurrent`/`status` for it, `lessonChrome.jsx`, the XP toast implementation, the back-button placements on scrolling screens, HoldGate, `SayItWithNova.jsx` (full read: recognition lifecycle, celebration logic, the word-6/session-end boundary), `WordBuilder` (for the hint), the `magic_moments` schema + Moments feed renderer, `GameEngine.jsx`'s remaining `gameTheme.js` internals (`ConfettiBurst`/`SessionProgress`/`SoundMatch`/`SpellItOut`/`GameTypeSelector`+`GAME_TYPES`/`UpgradeModal`/`injectCSS`), prior report NOTES sections.

## PART 1 — GALAXY LOCK FIX (reproduce or characterize)
- First, read the actual status-derivation rule: what marks a word `done` vs `current` vs `locked` on the map, and from which data (`word_progress` fields? `learning_events`? mastery threshold? `isRealMastery`?).
- Attempt reproduction: seed children with the plausible real-world shapes — word attempted but below mastery; word mastered pre-`attempt_count` gate; word touched only via activities that write differently — and render the map for each. Find the shape that shows locked-despite-used.
- Reproduced → fix, with a seeded regression check. Not reproduced after honest attempts → write the exact derivation logic + the data shape that WOULD produce the symptom into the report AND into the device checklist (step: inspect the real child's `word_progress` row for `dance`). Do not fix blind.

## PART 2 — REDUCED-MOTION AT THE PRIMITIVE
- Gate `AnswerTile` entrance/wiggle and `ConfettiStars` inside `lessonChrome.jsx` via the shared `usePrefersReducedMotion()` hook. Every consumer inherits; remove now-redundant per-activity gates only where trivially safe (double-gating is harmless — prefer leaving them).
- Verify under emulated reduced motion across ≥3 activities including one untouched-this-pass consumer (e.g. WordMatch): sessions complete, no entrance-animation stalls, confetti suppressed.

## PART 3 — SESSION-FLOW POLISH
- **XP toast**: linger ~3s (from its current too-fast value — report the before/after numbers), never blocks input, reduced-motion safe.
- **Sticky back button**: identify the screens where it scrolls away (Guided Path at minimum); make it sticky — chunk-sm, 44px+, consistent placement. Whole-screen check for overlap with content.
- **End-of-play guidance**: when the day's path completes, one light "come back tomorrow" / next-step line in the existing completion surface. One line, growth-mindset register, no redesign.
- **Grown-Ups hold gate**: measure the current hold duration, set ~1.5–2s, verify with the rAF shim that it advances correctly and still genuinely gates.

## PART 4 — HINTS (bounded)
- Word Builder: first-letter position highlight after a defined struggle signal (e.g., first miss or N seconds idle — pick, justify, report). Visual only, silent.
- Audit: table of every rotation activity × its hint affordances; ensure minimum = audio replay everywhere it makes sense; implement only trivial gaps; report the map. Anything non-trivial goes to the report's recommendations, not this pass.

## PART 5 — SAY IT WITH NOVA (desktop half)
- **Candy migration**: full move off `gameTheme.js` onto `lessonChrome`/tokens; joins `isE2Activity`. Whole-screen.
- **Layout/UX**: center the mic control; 5s no-speech timeout with a gentle, errorless retry prompt (no red); **pronunciation help** button that plays the whole word via the singleton; **auto-listen**: after Nova's prompt finishes AND mic permission is already granted, start recognition without another tap — with a clean gesture-fallback path when permission isn't yet granted or auto-start is blocked (button remains the universal path). Unsupported browsers: the activity degrades gracefully (clear friendly state or exits rotation for that device — pick, justify) rather than sitting silently broken.
- **Word-6 celebration bug — investigate with the new lead**: sessions are 6 words, so "random celebration after word 6" is the last-word → SessionComplete boundary. Audit that transition for double-fire/race conditions (the `completeStroke` double-completion in `DRAW_IT_TRACING_REPORT.md` is the precedent pattern). Also audit recognition-result events arriving AFTER the question resolved (a late result firing a stale celebration). Reproducible → fix with a regression test. Not reproducible → characterize precisely in the report + device checklist.
- **Mobile-mic feasibility assessment (assess, instrument — do NOT ship a speculative fix)**: document the current Web Speech usage; lay out the WebKit constraint set (iOS Safari + Chrome-iOS are both WebKit: prefixed `webkitSpeechRecognition`, gesture requirements, permission flow, known silent-failure modes); add lightweight diagnostic instrumentation reachable on a phone (e.g., a debug readout behind the Grown-Ups gate or structured console events: permission state, recognition start/result/error/end with timestamps) so the device session yields actionable data. Report a verdict + recommended path: (a) fix within Web Speech (gesture-chained start, surfaced errors, retry UX), (b) graceful-unsupported handling as the floor, (c) server-side transcription — cost + COPPA implications (child voice data: consent, retention) — assessed, almost certainly deferred, and flagged for the legal review either way.

## PART 6 — MOMENTS TRACING ENTRY (approved)
- Draw It word completion inserts a `magic_moments` row (new kind, e.g. `tracing`): child, word, timestamp; the feed renders a "Traced cat!" card with the WordArt thumbnail when `has_art` (typographic treatment otherwise). No Storage upload — there is no artifact; this is a structured row.
- Respect the existing schema/RLS (client insert under the child's own auth — if the schema or policies need any change, that is a `supabase db push` stop). Verify the Parent Portal Moments tab renders it correctly, and that the old `drawing` kind's renderer still handles historical rows.

## PART 7 — test@yahoo.com DELETION (confirmation-gated)
- Re-verify read-only: creation date, children, event count, **zero subscriptions**, no Stripe linkage. Present the facts in-run and STOP for Sal's explicit confirmation (this is precisely the destructive-op stop in the standing rules — a chat-level approval is not sufficient for this one).
- On confirmation: delete via the same verified cascade path `admin-user.mjs delete` uses; confirm zero orphan rows (children, word_progress, learning_events, moments).
- Add to the device checklist: remove `test@yahoo.com` from Chrome's saved passwords on the automation profile (manual — the run cannot reach Chrome's password store), so the autofill hijack class dies with the account.

## PART 8 — HOUSEKEEPING (bounded)
- **Formal overlap probes** (synchronous `.paused`) across ≥10 questions each on Find the Word and Quiz Boss against a deploy with real audio — closes `ACTIVITY_ROSTER_REPORT.md`'s disclosed gap.
- **`gameTheme.js` endgame**: after Say-It migrates, census `GameEngine.jsx`'s internals. `SoundMatch`/`SpellItOut`: if unreachable from `ACTIVITY_DEFS`/any selector, they are dead code — delete them. Migrate the small live remainders (`ConfettiBurst`/`SessionProgress`/`GameTypeSelector`/`UpgradeModal`/`injectCSS`) if each is a bounded token swap; if any is not, report it. If the file ends up reader-less, delete it and note the retirement.
- **`docs/DEVICE_TEST_CHECKLIST.md` — a first-class deliverable.** Step-by-step script for Sal's phone session: (1) Say-It mic on the real device — exact steps, what the instrumentation shows, what to write down (permission state, which event fired/failed, browser + iOS version); (2) celebration-misfire repro attempts — Match & Sort every-answer, Word Hunt random, Say-It word 6 — with exactly what to note (browser, muted or not, precise tap sequence, screen recording encouraged); (3) dance lock: what to look at on the real child's Galaxy map + the `word_progress` row to capture if PART 1 didn't reproduce; (4) dad-test the two new activities — does Quiz Boss read as a battle to a kid, squint-test bear vs dog art at tile size; (5) skim `findTheWordManifest.js`'s 200 look-alike triples, flag weak ones; (6) Chrome saved-password cleanup. Each step: do X, observe Y, record Z.
- Update `docs/200MW_Master_Project_Doc_v3.md`: item 5 split status — automatable half DONE (merged) with this report; device-dependent remainder listed explicitly as awaiting the checklist session.

## VERIFY (fresh accounts; delete after)
- Galaxy lock: seeded repro fixed + regression check, or the characterization documented (state which).
- Reduced motion: primitive-level gate verified across ≥3 activities under emulation.
- XP toast timing (before/after), sticky back button on real scroll, end-of-play line renders once, hold-gate timing measured at the new value (with shim).
- Word Builder hint fires on the defined signal, visual-only, silent; hint map in report.
- Say-It desktop: full question flow on Candy chrome — prompt → auto-listen (or graceful fallback) → 5s timeout path → pronunciation-help button (singleton, whole word) → completion; instrumentation events visible; unsupported-browser state verified by stubbing recognition away.
- Moments: traced-word card renders in the Parent Portal (thumbnail for `has_art`, clean otherwise); historical `drawing` rows still render.
- test@yahoo.com: confirmed deleted with zero orphans (post-confirmation), or the stop reached and awaiting Sal.
- Overlap probes: formal results for both activities.
- Whole screen on every touched surface. Gates: `npm run build` (all sync checks), `check:no-emoji`, Playwright default invocation (suite grows with new specs for the galaxy fix if reproduced + Say-It desktop flow), `idor-proof.mjs` 9/9 with `DEPLOY_BASE_URL` against the pushed branch's preview (mandatory standing gate; if the Moments change touched any policy/schema, doubly so).

## MERGE & PRODUCTION (the full leg)
All green → merge → push (approval) → deploy confirmation via `gh api .../commits/<sha>/status` + `curl -sI https://200magicwordsapp.com` (never the Vercel MCP connector) → production walk with a fresh account: XP toast, sticky back button, hold-gate timing, one Say-It question (desktop, real audio, pronunciation help), Moments card visible in the Parent Portal, Galaxy map state for a seeded child, formal overlap spot-check → append PRODUCTION VERIFICATION → commit docs (including the device checklist) → push (second approval). Delete test accounts.

## REPORT (docs/POLISH_PASS_REPORT.md — created at STEP 0, filled live)
### PRE-FLIGHT — sync state, key presence
### GALAXY LOCK — derivation rule found, repro result, fix or characterization
### REDUCED MOTION — primitive change, consumers verified
### SESSION POLISH — toast/back/guidance/hold, before→after values
### HINTS — Word Builder implementation, the hint map, deferred recommendations
### SAY IT — migration, UX changes, word-6 findings, mobile-mic assessment + verdict, instrumentation spec
### MOMENTS — schema/kind decision, renderer verification
### TEST ACCOUNT — facts re-verified, confirmation outcome, deletion proof
### HOUSEKEEPING — overlap-probe results, gameTheme endgame outcome, v3 update
### DEVICE TEST CHECKLIST — pointer to the deliverable + what each step will decide
### VERIFICATION / PRODUCTION VERIFICATION — live checks, gates, walk results
### NOTES FOR NEXT PROMPTS — anything Placement Adventure / analytics should rely on
