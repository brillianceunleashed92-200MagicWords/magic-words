# Phase 2 "Parent Loop" — End-of-Run Report

Branch: `phase-2-parent-loop` (off `main`, not merged — per the master
prompt's instruction). 9 commits, all pushed, each independently
build/lint/smoke-verified before the next step started.

## What shipped

**Step 1 — Multi-child profiles.** `child_profiles` (already existed,
empty, from an abandoned prototype) extended and wired up for real:
onboarding flow, child switcher, free-tier cap (1 child) vs. family-tier
cap (4). Every progress table (`word_progress`, `user_stats`,
`user_streaks`, `user_sparks`, `learning_events`) re-keyed from
`user_id` to `child_id`, including a uniqueness-grain fix caught only by
live-testing a second child creation (409 conflict) — the old
`UNIQUE(user_id, word)` / `user_id`-as-PK constraints had to be dropped
and rebuilt on `child_id`, not just have a column added.

**Step 2 — 5 new activity types.** Word Builder, Draw It, Story Time,
Word Song, Magic Video — all wired into `GameEngine.jsx` and
`PlayScreen.jsx`'s 10-activity picker. StoryBuilder re-enabled (was
built but disabled). Extracted `gameTheme.js`/`gameAudio.js` out of
`GameEngine.jsx` to fix Fast Refresh violations from the new imports.

**Step 3 — The Story Engine.** `api/story-engine.js`: per-child AI
stories using ONLY the child's mastered vocabulary + the target word +
their name — a hard-enforced allow-list validator (not a prompt
suggestion), 3-attempt retry with rejected words fed back into the next
prompt, guaranteed-safe local-template fallback if all attempts fail.
"New Story Friday" surfaces on Home when the newest story is missing or
>6 days old — no cron.

**Step 4 — ElevenLabs audio.** All 200 words now have real
ElevenLabs-generated MP3s (voice `QeKcckTBICc3UuWL7ETc`), uploaded to
Supabase Storage, `words.audio_url` populated. `useWordSpeak` wraps the
existing `useSpeak` hook with a word→audio_url lookup so Home, Galaxy,
and the Story reader all play real audio instead of Web Speech
synthesis, zero call-site churn. Resolved the carry-over `speak.js` ESM
warning in the same pass (renamed to `.mjs` — it used `export default`
while every sibling `api/*.js` used `module.exports`, a real mismatch,
not a false positive).

**Step 5 — Full Parent Portal.** Rebuilt from a single flat view into 4
tabs: Dashboard (This Week stats + AI Insight via
`api/parent-digest.js`, no cron, + printable Dinner Table Cards),
Moments (real Magic Moments feed with an `html2canvas`-generated
branded share image → native Web Share sheet or download), Mastery Map
(existing heatmap, relocated), Settings (Daily Time Limit + Weekend
Streak Pause, now genuinely persisted to `parent_settings` and enforced
in the child app via a soft Nova "time for a break" lockout — verified
live end-to-end, not just that the setting saves). Also resolved the
carry-over bundle-size item found while working in this area:
`src/main.jsx` was eagerly bundling the entire unlinked legacy `App.jsx`
tree into every route's initial load. Route-level `React.lazy` dropped
the initial gzip payload from 247KB (shared across every route) to
~82KB for the entry chunk, comfortably under the 300KB target.

**Step 6 — Stripe. NOT DONE — blocked, needs Sal.** See below.

**Step 7 — Speech practice v1 ("Say It with Nova").** Closes the exact
gap flagged in `docs/mlc-engine-audit.md`: FlashCardChallenge's "Verbal
Imitation" MLC binding had no real speech capture. New activity uses
the Web Speech `SpeechRecognition` API with the same errorless-learning
scaffold as WordMatch, and an honest self-rate fallback for unsupported
browsers/denied mic permission (verified both paths live).

## Blocked: Step 6, Stripe

Per the master prompt's own mandatory-confirmation-stop list ("anything
touching payments configuration or live Stripe mode"), this was never
attempted without real test-mode keys. Mid-session, live Stripe keys
(`sk_live_.../pk_live_...`) and a live ElevenLabs key were pasted
directly into chat. The ElevenLabs key was usable (test/prod distinction
doesn't apply to it) and is now in `.env.local`, powering Step 4. The
Stripe keys were refused and never touched — using live keys during
unverified checkout-flow development risks real charges. **Needed from
Sal to unblock**: `sk_test_...` / `pk_test_...` keys (Stripe Dashboard →
Developers → API keys, toggle "Test mode" first). Recommend rotating the
three keys that were pasted in plaintext chat regardless, since exposure
risk doesn't depend on whether they were used.

Once provided: `subscriptions` table already exists (migration 0009,
read-only client RLS — writes are webhook-only by design), so Step 6 is
schema-ready. Remaining work is a Stripe Checkout session endpoint, a
webhook handler writing `subscriptions` rows, and gating
(`maxChildrenForPlan` in `src/lib/queries/subscription.js` already
reads `plan` — just needs a real value flowing in instead of the
always-free default).

## Numbers

- **Migrations**: 0005–0013 (9 new, all additive, all applied live via
  `supabase db push --linked`, all RLS-covered).
- **ElevenLabs usage**: 782 characters total across all 200 words
  (one-time generation via `scripts/generate-word-audio.mjs`, safe to
  re-run — idempotent, skips existing `audio_url`s). Negligible cost at
  any plan tier; exact billing is on Sal's ElevenLabs dashboard.
- **Bundle**: entry chunk 257KB/82KB gzip (was 815KB/247KB gzip shared
  across every route pre-Phase-2). `GameEngine` (271KB/77KB gzip),
  legacy `App` (99KB/30KB gzip), and `html2canvas` (201KB/47KB gzip) are
  now separate lazy chunks, only downloaded when actually needed.
- **Lint**: 71 problems (63 errors, 8 warnings), up from a 64-problem
  baseline at Phase 2's start. All net-new errors are the same two
  already-accepted categories: `require`/`module`/`process` `no-undef`
  in new `api/*.js` CommonJS files (consistent with every existing
  `api/*.js`), and one `react-hooks/set-state-in-effect` in
  `useSessionTimeLimit.js` matching an existing accepted pattern
  elsewhere in the codebase (`GrownUpsScreen.jsx`'s `MathGate`).
- **Playwright**: `tests/smoke.spec.js`, 3/3 passing after every step
  (one assertion updated mid-Phase-2 when Step 5's portal restructuring
  legitimately moved the text it checked for).

## Definition of Done — status

"Full end-to-end flow from parent creating 2 child profiles through
Stripe checkout to time-limit enforcement": everything up to Stripe
checkout is done and live-verified (2-child creation, all 10 activities
including the new speech one, Story Engine, real audio, Parent Portal,
time-limit enforcement with a real DB-backed setting actually gating a
session). Stripe checkout itself is the one incomplete link, blocked on
credentials as described above — not a scope cut, a hard external
dependency.

## Gaps and follow-ups worth flagging

- **`learning_events` had zero writers in the new Candy Galaxy
  architecture** until Step 5 (only the disconnected legacy `App.jsx`
  tree used it). Fixed as part of building "minutes this week," but
  worth knowing the "minutes" number is a 15-seconds-per-event proxy,
  not real session-duration tracking — same approximation the legacy
  dashboard used, now just actually fed by live data.
- **No staging/dev Supabase project** (flagged before Phase 2, still
  true) — every migration and every live verification pass this phase
  ran against production, same manual-provision/cleanup discipline as
  before. Still recommend provisioning a real staging project before
  handing any of this to CI.
- **`useSessionTimeLimit`'s daily limit is a client-only trust
  boundary** (documented in the hook itself) — a determined kid could
  clear `localStorage`. Matches the master prompt's own "soft Nova
  lockout" framing, not a security control; flagging so it's not later
  assumed to be one.
- **Say It with Nova's speech matching is presence/absence, not
  pronunciation quality** — "did the transcript match the word," not a
  scored assessment. Honest v1, same spirit as FlashCardChallenge's
  original self-rate caveat it replaces.
- Parent Portal's AI Insight and Dinner Cards were verified for their
  graceful-failure path (local dev doesn't serve `/api/*`) but not the
  full live Claude-backed generation — same known limitation as the
  Story Engine and session generator, needs a Vercel preview or `vercel
  dev` to verify further.
