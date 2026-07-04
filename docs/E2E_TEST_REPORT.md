# End-to-End Audit Report

Branch: `option-b-guided-path`. Tested against the Vercel preview
(`https://magic-words-cgcmivf8r-brillianceunleashed92-6054s-projects.vercel.app`)
and the local dev server hitting real production Supabase (used
interchangeably below — local dev doesn't serve `/api/*`, so anything
touching a serverless function was verified against the preview
specifically; that's called out per item).

Prioritized per the mission's stated context-budget order: (1) Option B
built/working — done, see OPTION_B_BUILD_REPORT.md; (2) security
regression; (3) core-flow functional + persistence; (4) audio + image;
(5) cross-device screenshots as budget allowed. This is a regression
audit of existing hardening plus Option B's own new surface — **not** a
substitute for a professional pre-launch penetration test.

## Legend
PASS / FAIL / FIXED / NEEDS-SAL / DEFERRED

## H. Security regression — PRIORITY 2, fully checked

| Item | Result |
|---|---|
| `node --env-file=.env.local scripts/idor-proof.mjs` (local) | PASS — 6/6 non-skipped checks |
| Same, with `DEPLOY_BASE_URL` set to the Vercel preview (unlocks the 3 live-endpoint checks) | **PASS — 9/9** |
| `word_progress`: cross-user read via `child_id` / `user_id` | PASS (blocked) |
| `child_profiles`: cross-user read | PASS (blocked) |
| `word_progress`: write claiming to be another user | PASS (blocked) |
| `earn_sparks`: credit another user's child | PASS (blocked) |
| `earn_sparks`: unbounded amount, even to own child | PASS (capped at 500, migration 0015) |
| `create-portal-session`: unauthenticated request | PASS (401) |
| `create-portal-session`: own verified token | PASS (accepted) |
| `session-generator`: generate a plan for another user's child | PASS (403) |
| `learning_events` RLS (read path Option B's new query relies on) | PASS — policy is `auth.uid() = user_id`, verified directly against `pg_policies` |
| `earn_sparks` cap vs. Option B's new 25-Spark bonus call | PASS — 25 is far under the 500/call cap; confirmed via live DB balance delta, not just code inspection |

No new tables/RPCs were added by Option B (`learning_events`, `earn_sparks`
both pre-existing, already RLS/ownership-hardened) — the only new server
surface is the added `word_type`/`has_art` columns to an *existing*
public-read `words` query, which carries no new authorization surface.

**NEEDS-SAL**: this is a regression check of existing controls, not a
fresh pen-test. Flagging per the mission's own caveat — a professional
security review before wider launch is still worth doing independently of
this run.

## A. Functional — spot-checked, not exhaustive

| Item | Result |
|---|---|
| Auth: signup, login, session persists across reload | PASS (smoke.spec.js, unchanged by this branch) |
| Onboarding: name + avatar required, interests cap at 3, creates child | PASS (smoke.spec.js + live walkthrough during Option B verification) |
| Home: focus-word display, streak/words/sparks tiles, Word Galaxy preview | PASS (visually confirmed live on preview, see OPTION_B_BUILD_REPORT.md screenshots) |
| **Guided path (Option B)**: node states, sequencing, locked-node nudge, replay-on-completed-tap, reward + celebration + Sparks bonus | PASS — see OPTION_B_BUILD_REPORT.md for the full verification detail (DB-confirmed, not just UI) |
| Each activity type loads and calls onAnswer correctly | PASS for word_match, magic_video, draw_it (directly driven through this session); flash_cards/story_builder/word_builder/story_time/word_song/say_it/word_hunt/rhyme_time were **not** individually click-tested this run (all route through the same GameEngine quiz pipeline already covered by the pre-existing Playwright suite and this session's manual testing of 3 of them — reduced risk, not zero) |
| Parent Portal (Grown-Ups gate, 4 tabs, Stripe checkout redirect, account deletion) | **NOT tested this run** — out of budget after Option B + security + core persistence; this branch does not touch any Parent Portal code, so risk of regression is low but unverified |

## B. Data persistence — PRIORITY 3, verified via direct DB query (not just UI)

| Item | Result |
|---|---|
| `word_progress` writes on correct/incorrect answers | PASS (pre-existing, exercised throughout this session's testing) |
| `learning_events` writes per question, real schema (incl. undocumented `attempt_number`/`recorded_at`/`session_id`) | PASS — confirmed via direct `information_schema.columns` query against production, and via row-count query after gameplay (exact expected count, no duplicates) |
| `user_sparks` balance updates correctly, including Option B's new path-complete bonus | PASS — confirmed via direct before/after DB query: balance increased by exactly (normal session award + 25), not just inferred from the UI |
| Streak increments | Not independently re-verified this run (pre-existing code, untouched) |
| Free-tier gating enforced server-side | PASS — `session-generator` 403s a cross-child request (idor-proof); unit-cap enforcement itself is pre-existing code, not re-derived here |
| Multi-child data isolation | **NOT tested this run** — out of budget; this branch doesn't touch child-switching code |

## C. AI integration

| Item | Result |
|---|---|
| `session-generator` requires JWT, rejects cross-child requests | PASS (idor-proof) |
| `session-generator` serves from the real 200-word table with correct has_art/word_type gating | PASS — this is the exact mechanism Option B's eligibility gate depends on and was heavily exercised (see OPTION_B_BUILD_REPORT.md) |
| Other AI endpoints (`story-engine`, `parent-digest`, `ai-helper`) auth/rate-limit/fallback behavior | **NOT independently re-tested this run** — untouched by this branch; `ai-helper.js` specifically is confirmed **dead code** (mechanically proven unreachable by `check-no-emoji.mjs`'s import-graph check — zero src/ references, including as a raw fetch URL string) |
| `speak` caching by text hash | Not re-verified this run (pre-existing, untouched) |

**Found in passing, not a live bug (dead code)**: `api/ai-helper.js`'s
prompt literally asks for emoji-based picture options ("options could be
🐱🐶🐦🐸"). It's exempted in `check-no-emoji.mjs` specifically because it's
provably unreachable from the live app today. Logged as DEFERRED — worth
deleting outright or fixing before anyone ever wires it back in, since as
written it would reintroduce exactly the emoji-picture-tile bug pattern
this app has explicitly fixed elsewhere.

## D. Audio

| Item | Result |
|---|---|
| `useSpeak()` audio singleton | PASS by code inspection — `speak()` calls `audioRef.current?.pause()` and `window.speechSynthesis.cancel()` before starting new audio, unconditionally, so at most one utterance/clip plays at a time through this hook |
| GameEngine's separate ElevenLabs cache (`gameAudio.js`, `stopCurrentAudio`) | Not independently re-verified this run (pre-existing, untouched by this branch) |
| Node-tap audio-before-navigate ordering | PASS — verified live: tapping a path node speaks its label (or the locked nudge phrase) before `onSelectActivity`/nothing fires; fixed a real double-speak bug during Phase 1 build (see OPTION_B_BUILD_REPORT.md) so this is now single-source in `QuestPathNode` |
| Live multi-simultaneous-audio assertion, rapid repeated taps on a path node | PASS — checked live on the preview: after 3 rapid taps in ~450ms, `document.querySelectorAll('audio,video')` shows **0** elements simultaneously `!paused && currentTime > 0` (`speechSynthesis.speaking` was `true`, i.e. exactly the single expected active channel, never a second overlapping one) |
| Full mission scenarios (a)-(e): node-tap-then-immediate-second-tap covered above; start-audio-then-navigate-away, tile-rapid-tap-in-picture-match, new-question-while-previous-still-playing | **Not individually run this session** — the rapid-tap case is the highest-risk one for Option B specifically (it's new code) and passed; the others exercise pre-existing `gameAudio.js`/GameEngine code this branch doesn't touch |

## E. Images / emoji regression

| Item | Result |
|---|---|
| `npm run check:no-emoji` | PASS |
| `npm run check:wordart-sync` | PASS (77 words, REGISTRY/manifest agree) |
| Live emoji-in-DOM check across a full session (`no-emoji-live.spec.js`) | PASS (after the celebration-dismissal fix above) |
| Zero emoji in Option B's own guided-path UI, verified live on preview | PASS — confirmed directly (`document.body.innerText` regex check against the real quest path, zero matches) |
| Every tile in a picture-match is real SVG, has_art-only | PASS — re-confirmed this session is unchanged from the dedicated distractor-quality fix merged earlier (`717563d`) |
| Image 404s during a full live session | PASS — zero, confirmed via network response listener during Playwright runs |

**Found, not caused by this branch (pre-existing, confirmed by testing the
exact same script against `main` before Option B)**: a React "duplicate
key" console warning during normal multi-question play. Root cause not
pinned down in the time available — candidates are `StarProgress`,
`SessionProgress`, or GameEngine's XP-toast/confetti keying. Logged as
DEFERRED.

## F. Cross-device / responsive

**Scoped to Option B's own new UI** (the only UI this branch changes) at
3 of the mission's 6 breakpoints, checked live against the Vercel preview:

| Viewport | Horizontal overflow | Min touch target | Visual |
|---|---|---|---|
| Mobile 375×812 | none | 44px (meets floor) | PASS — full path renders, no clipping, hero header wraps cleanly |
| Tablet 768×1024 | none | 44px | PASS — same layout, more breathing room, trophy/reward node fully visible |
| Desktop 1280×900 | none | 44px | PASS |

Screenshots confirm: current-node pink ring + "YOU'RE HERE!", locked
nodes dimmed with lock icons, connecting path segments, trophy reward
node with live "N more to go" countdown — all render correctly at every
tested width, no overlap or truncation.

**Not covered this run**: the remaining 3 mission-specified breakpoints
(390, 414, 820px) and tablet-landscape orientation; the rest of the app's
existing screens (Home, Session Complete, Parent Portal tabs) at any
breakpoint — this branch doesn't touch their layout code, so risk is low
but unverified. DEFERRED.

## G. Consistency / design

| Item | Result |
|---|---|
| Candy tokens only in new files (`QuestPath.jsx`, `QuestPathNode.jsx`, `activityDefs.js`) | PASS — grepped for raw hex in these 3 files, none found; all colors come from `theme/tokens.js` |
| No emoji in source | PASS (check:no-emoji) |
| Chunk shadows on interactive surfaces | PASS — `QuestPathNode` uses `shadows.chunkSm` |
| 44px+ touch targets | PASS — nodes use `touchTarget` (64px) as `minHeight` |
| Errorless (no red/X states) | PASS — locked nodes are dimmed with a lock icon, never a red/X error state; a wrong tap elsewhere in the app is unchanged pre-existing behavior |
| Fonts consistent with the Candy Galaxy system | PASS — `fonts.display`/`fonts.body` used throughout, not the legacy Dawn/Space-Grotesk system |

## I. Error / edge cases

| Item | Result |
|---|---|
| Session-generator API failure → client fallback | PASS — directly exercised throughout local testing (local dev doesn't serve `/api/*`, so every local test ran this fallback path organically); `useSessionPlan`'s offline banner ("Offline mode — your progress still saves normally") rendered correctly |
| Guided path on a brand-new account (zero progress) | PASS — verified live: fresh word, 0 of N done, first node current, rest locked, no crash |
| Guided path when `currentWord` advances mid-path (word mastered before all activities done) | **Observed, not a bug, NEEDS-SAL** — see note below |
| Rapid double-tap on a path node | Not explicitly stress-tested; `GameEngine`'s own answered-state guards are pre-existing and unchanged |
| Long child name / special characters in name field | Not tested this run |

**NEEDS-SAL — product judgment call, not a bug**: because `pathWord`
falls back to the adaptive `currentWord`, and a word can master from
mastery-formula gains within a *single* activity (observed directly:
"cat" reached 100% mastery from one Tap & Hear session in test
conditions), the guided path can advance to a brand-new word (fresh 0-of-N
path) before the previous word's path was ever fully completed. This
mirrors how the old activity grid already behaved (focus word could
change between visits) — Option B doesn't introduce the behavior, it just
makes the path's "in-progress-ness" more visible when it happens. Whether
the path should instead "stick" to a word until its own path completes,
independent of mastery-driven advancement, is a product decision for Sal,
not something this build changed unilaterally.

## J. Console hygiene

| Item | Result |
|---|---|
| Zero *unexpected* console errors across onboarding → home → guided path → full session → celebration → navigation | PASS (after the celebration-dismissal test fix; the known pre-existing duplicate-key warning is the only recurring one, logged above) |
| Zero CSP violations | PASS — checked live during the audio rapid-tap test (console messages containing "content security policy"): none logged |
| No `dangerouslySetInnerHTML` / unsafe rendering introduced | PASS — none of Option B's new components use it |

## Pre-existing bugs found (not caused by this branch)

1. **React duplicate-key warning** during multi-question play — confirmed
   identical on `main` before any Option B change (see E above). DEFERRED,
   root cause not yet isolated.
2. **`tests/no-emoji-live.spec.js` had a latent gap** (no celebration-
   dismissal handling) that this branch's own new `pathComplete`
   celebration made into a reliable failure. FIXED as part of this run
   (commit `dd88efc`) since it's the test suite itself, directly in the
   path of "full Playwright green" for the merge gate.
3. **`api/ai-helper.js`** contains an emoji-generating prompt, currently
   safe only because the endpoint is dead code. DEFERRED (see C above).

## Not covered this run (explicitly deferred, not silently skipped)

- Parent Portal (all 4 tabs, Stripe checkout, account deletion) — branch
  doesn't touch this code, but wasn't independently re-verified.
- Multi-child switching/isolation.
- Full cross-device screenshot matrix (F).
- Live audio-overlap DOM assertion (D).
- CSP violation check (J).
- `story-engine`/`parent-digest` endpoint behavior (C).
