# Placement Adventure — Report (Prompt 8)

### RUN TIMING — start / end / total wall-clock
- Start: 2026-07-05 21:30 EDT
- End: IN PROGRESS
- Total: IN PROGRESS

### PRE-FLIGHT — sync state, key presence
`git status` clean, `main` in sync with `origin/main` (no divergence either
direction), polish-pass merge commit (`677e9f9`) confirmed an ancestor of
HEAD, `SUPABASE_SERVICE_ROLE_KEY` present in `.env.local`. Branched
`feat/placement-adventure` off `main`.

### BASELINE — onboarding insertion point, new-child state, portal surfaces
Fresh account, real onboarding walkthrough:
- **Insertion point confirmed**: `ChildOnboardingScreen`'s `onDone` callback
  (`src/CandyGalaxyShell.jsx:85`) currently does exactly
  `() => { setShowAddChild(false); setNavTab('home'); }` — a direct jump to
  Home with zero intermediate screen. This is precisely where
  `PlacementChoiceScreen` needs to insert itself.
- **New-child Home state**: "Hey PlacementKid! Ready to fly?", "Nova mapped
  your next word-star: 'cat'", streak/words/sparks all 0, Today's Magic Word
  = Unit 1 "cat". Exactly the state MISSION #1 assumes as the default
  (skip) path's outcome.
- **Parent Portal surfaces** (Dashboard tab): 0/0/0 stats, no upgrade
  banner (masteredCount 0 is under the existing `UPGRADE_PROMPT_THRESHOLD`
  of 20) — confirms the true-level upgrade banner condition I'll add won't
  collide with the existing mastered-words-based one for a brand-new child.
- **Settings tab structure** (where "Retake placement" will live): Plan
  (subtle `UpgradeBanner`) → Daily Time Limit → Weekend Streak Pause →
  Account (Sign out) → Danger zone. Placement retake will get its own
  small section, positioned after Plan and before Account.

### SERVER — mode design, ladder adjudication shape chosen + why, migration, floor, events-home verdict
**Mode design**: extended `api/session-generator.js` with `placementMode: true`
(same precedent as `reviewOnly`) rather than a new endpoint file — reuses
`requireAuthAndRateLimit`, `fetchChildContext`'s ownership check, and the
CORS/method boilerplate for free instead of duplicating them.

**Ladder adjudication shape — signed stateless token, not a DB row**
(`api/_lib/placementLadder.js`). Justification: placement is short-lived
(≤14 questions, 3-5 min target) and explicitly non-resumable per the
mission ("resumable never — a fresh retake instead") — the one reason a
stateful table would earn its keep (recovering an in-progress attempt)
is exactly the thing the mission rules out. A `{childId, rungIndex,
lastPassedRungIndex, tiebreak, shownWords, iat}` payload is HMAC-SHA256
signed (key HMAC-derived from `SUPABASE_SERVICE_ROLE_KEY` under a fixed
context string, not the raw secret itself — a bug in this signing code
doesn't hand over the real service-role key), base64url-encoded as
`<payload>.<sig>`, round-tripped by the client. A bad signature, a
child-id mismatch, or an expired token (>15 min, well past the target
window) is treated as a fresh start at rung 0 — never as a way to
short-circuit the ladder — and logged as a `security_events` row
(`placement_ladder_invalid_token`) so a real forgery attempt is visible
even though it's harmless.

**Migration** (`0032_placement_adventure.sql` + a follow-up fix,
`0033_placement_unit_revoke_fix.sql` — both pushed, see SECURITY section
for why two were needed): `child_profiles.placement_unit`/
`placement_completed_at` (nullable, range-checked 1-18), plus revoking
`authenticated`/`anon`'s `UPDATE` privilege on `child_profiles`
entirely (0032 first tried a column-level `REVOKE` scoped to just these
two columns; verification found that doesn't actually work against
Supabase's default table-level grant — see SECURITY). This is the
load-bearing security decision of this whole pass: RLS is row-level, not
privilege-level — the existing "parent owns child profiles" ALL policy
would otherwise let a parent's own Supabase client write ANY value to
`placement_unit` directly (e.g. `.update({placement_unit: 18})`),
completely bypassing the ladder. The REVOKE closes that at the Postgres
privilege layer, independent of RLS —
only the service-role admin client (used exclusively inside
`handlePlacement`'s `finalize()`) can ever write these columns.

**Floor applied in `selectCandidateWords`**: added a `placementFloor`
parameter: the "current unit" scan (which unit a session pulls NEW
vocabulary from) now skips units below the floor entirely, falling back
to the floor itself if every floored-and-above unit happens to already
be mastered. Review/spaced-repetition/mastered-sample pools are
deliberately NOT floor-filtered — a placed child starts with zero real
`word_progress` (no fabricated data, so those pools are naturally empty
below the floor anyway at first), and a child who later plays a
below-floor word directly (Galaxy map tap) should still get normal
review treatment for it, not have it silently excluded.

**Events-home verdict: new `product_events` table**, not
`learning_events` with a placement `game_type`. `learning_events` is
word-attempt-shaped (`word`, `game_type`, `correct`, `response_time_ms`)
— `placement_started`/`placement_skipped` have no word or correctness to
report, and forcing them into that shape would mean nullable-everything
columns purely to fit an unrelated event. Modeled on `security_events`
(migration 0017): RLS enabled, no client policies — service-role-only,
verified via `db-query.mjs`, not the app (this is backend telemetry
today, not a parent-facing feature). This is deliberately the table
Prompt 9's broader analytics pass should extend, per the mission's own
framing — a generic `(event_type, user_id, child_id, payload jsonb)`
shape generalizes to any future first-party event, not just placement's.

**Event taxonomy note**: `placement_started` fires on the FIRST ladder
call (rung 0, no prior state) — including a stale/forged-token retry,
since that's indistinguishable from a genuine fresh start server-side.
`placement_skipped` is emitted client-side (see CLIENT section) for
BOTH "chose beginner path, never touched a probe" and "started, then
abandoned mid-ladder" — the mission's own PART 1 wording ("exit/abandon
mid-placement = treated as skipped") treats these as the same outcome
(Unit 1, no floor set), and `placement_started` already lets analytics
distinguish "declined outright" (no `placement_started` row) from
"began then abandoned" (`placement_started` + `placement_skipped`, no
`placement_completed`) without needing a fifth event type.

### CLIENT — parent choice, probe renderer decision (reuse-with-prop vs wrapper) + why, flow states
**Parent-choice screen** (`PlacementChoiceScreen.jsx`): inserted at the
exact spot BASELINE identified — `ChildOnboardingScreen.onDone` now
starts the placement flow (via a new `useUIStore` slice, see below)
instead of jumping straight to Home. "Start at the beginning" is styled
as the primary (mint, filled) button; "Let Nova find their level" is a
lower-emphasis outline button — visually default-to-beginner per the
mission's "true beginners never see a single probe" framing.

**Probe renderer decision — thin wrapper, not `placementMode` props on
`FindTheWord.jsx`/`WordHunt`'s mechanic**: built `PlacementProbe.jsx`
directly on `lessonChrome` primitives (`NovaPorthole`, `AnswerTile`) plus
the `getLookalikes()` manifest and `WordArt`, rather than adding a prop
to the production activities that bypasses their errorless scaffold.
Justification: `FindTheWord.jsx` and the picture mechanic's scaffold
state (`missedOnce`/`revealCorrect`/`wrongTileIdx`) is genuinely
intricate, actively maintained, load-bearing production code — every
future edit to it would otherwise have to keep a `placementMode` branch
correct too, and a bug in that branch could leak the measurement
exception's "no scaffold" behavior into real lessons, or vice versa. A
dedicated ~130-line component fully isolates the sanctioned exception to
exactly the file whose entire job is measurement, at the cost of a small
amount of duplicated distractor-shuffling logic (already trivial and
already duplicated a third time between `session-generator.js` and
`useSessionPlan.js`'s own fallback, so this isn't a new pattern).

**Global store, not local component state, for the flow**: `useUIStore`
gained `placementFlow`/`placementChildId`/`startPlacementFlow`/
`clearPlacementFlow`. Needed because `SettingsTab.jsx`'s "Retake
placement" button is nested inside `GrownUpsScreen`'s generic
`<ActiveComponent />` tab renderer, which passes no props to any tab —
threading a callback through that would mean changing all four tab
components' signatures for one feature. Not persisted (like
`grownUpsUnlocked`) — a half-finished placement is never meant to
survive a refresh anyway.

**Flow states**: `ChildOnboardingScreen` → `PlacementChoiceScreen`
(beginner logs `placement_skipped` client-side and goes straight to
Home; placement starts `PlacementAdventureScreen`) →
`PlacementAdventureScreen` (fetches one rung at a time, renders
`PlacementProbe` per word, collects answers in memory only, a brief
reduced-motion-aware "On to the next star!" beat between rungs) →
completion celebration ("Nova found your starting star — Unit N!",
using the FLOORED unit only, never the true measured one) → Home. Exit
mid-ladder (X button) fires the skip log and returns to Home with no
floor ever written — the natural absence of `placement_unit` already
means "Unit 1," no explicit write needed for the "skipped" outcome
itself, only for the analytics event.

**Network-failure degrade**: if any placement call throws (network
error, 5xx), the screen silently completes as if "start at the
beginning" had been chosen — no error UI shown to the child, matching
the errorless spirit of the whole flow. Noted as a real, if minor,
tradeoff: a transient blip degrades a child who WANTED placement into
the beginner path rather than retrying — accepted because a stuck
onboarding screen is worse, and "Retake placement" is always available
afterward.

### MEASUREMENT EXCEPTION — implementation, brief §5 update
`PlacementProbe.jsx` has no wiggle/soften/hint-glow state at all — the
tapped tile always gets the same `correct-flash` mint glow, and Nova's
message is always the literal same string ("Let's try another!")
regardless of whether the tap was actually right or wrong. This was a
deliberate reading of the mission's "every miss is indistinguishable
from a hit in tone" — not just "no red," but truly zero observable
difference in the UI between a hit and a miss; only the boolean sent to
the server differs. `DESIGN_BRIEF.md` updated with a new subsection
under §5 documenting this as a sanctioned, onboarding-only exception
(the brief stays authoritative — this isn't a silent deviation, it's a
named, scoped carve-out with its own rationale).

### FREE-TIER SURFACE — min() behavior, portal upgrade line
`finalize()` in `handlePlacement` computes `placementUnit =
plan === 'family' ? trueMeasuredUnit : Math.min(trueMeasuredUnit,
FREE_TIER_MAX_UNIT)` — the free-tier enforcement happens exactly once,
server-side, at the only write path for these columns. The child always
sees `placementUnit` (their real floor); `DashboardTab.jsx` is the only
place `trueMeasuredUnit` (well, `activeChild.placement_unit`, which for
a free plan already got floored to 5 — see NOTES below for the one
sharp edge here) ever surfaces, as "Nova found their level: Unit N —
unlock Units 6-18 with the Family Plan," taking priority over the
existing mastered-words upgrade banner when both would apply.

### SECURITY — the 10th idor check, forged-finalization result
Two new checks added to `scripts/idor-proof.mjs` (both require
`DEPLOY_BASE_URL`, same as checks 7-8):
- **Direct column write, even on the attacker's OWN child**:
  `clientA.from('child_profiles').update({placement_unit: 18})` on A's
  own row — RLS alone would allow this (A owns the row).
- **Forged ladder-state finalization**: a hand-crafted (unsigned)
  ladder-state token claiming rung 7 (Unit 18) already passed, submitted
  with `answers` that would normally finalize. Confirmed: the bad
  signature is rejected and the response is a fresh rung-1 start
  (`done: false, rung: 1`), never a finalization at Unit 18.

**A real bug found and fixed during verification, not just the intended
check**: migration 0032's `revoke update (placement_unit,
placement_completed_at) on child_profiles from authenticated, anon`
looked correct but **did not actually work**. Confirmed directly via
`information_schema.table_privileges` (not assumed): Supabase's default
schema-wide grant already gives `authenticated`/`anon` a TABLE-LEVEL
`UPDATE` privilege on `child_profiles`, and in Postgres a column-level
`REVOKE` does not override a broader table-level `GRANT` that already
covers that column — the exact "RLS/privilege isn't as narrow as it
looks" trap this whole security design was meant to avoid, just one
layer deeper than expected. **Fix** (migration `0033`, approved and
pushed separately): revoke the table-level `UPDATE` grant entirely for
`authenticated`/`anon` on `child_profiles` — confirmed safe first (grep
across `src/` found zero client-side `.update()` calls against
`child_profiles` anywhere in the app today; creation is INSERT-only).
Re-verified via `information_schema.table_privileges`: only `postgres`/
`service_role` retain `UPDATE` now. This is a stronger guarantee than
the original two-column carve-out — every future `child_profiles`
write, not just `placement_unit`, now has to go through a service-role
server endpoint.

Both idor checks run against the pushed branch's deployment (not yet
executed as of writing this section — will run for real in VERIFICATION
below). idor becomes **10/10** from this pass forward.

### HOUSEKEEPING — hint buttons, v3 update
- **Fill the Story (`StoryBuilder`)**: added the deferred audio-replay
  button flagged in the Prompt 7 polish pass's hint audit — same
  speaker-icon pattern as Word Hunt/Match & Sort/Find the Word, wired to
  the carrier-sentence audio that already played on mount (now also
  stored for replay instead of fire-and-forget).
- **Word Builder**: added a small speaker button next to the "Build the
  word" label, replaying the "Can you spell X?" prompt — the other
  deferred gap from that same audit. The first-letter position hint
  (already shipped, Prompt 7) is unchanged.
- **`docs/DESIGN_BRIEF.md`**: new §5a documenting the Placement
  Adventure measurement exception (see MEASUREMENT EXCEPTION section
  above) — the brief stays authoritative; this is a named, scoped
  carve-out, not a silent deviation.
- **`docs/200MW_Master_Project_Doc_v3.md`**: Placement Adventure moved
  out of BACKLOG into a new LAUNCH SPRINT section, marked DONE with a
  full summary. `idor-proof.mjs`'s check count updated 9 → 10 in the KEY
  REFERENCE section. Added the RUN TIMING template rule to HARD-WON
  SESSION RULES (every future report's Step 0 carries a start timestamp;
  close-out adds the end timestamp + total wall-clock).

### VERIFICATION / PRODUCTION VERIFICATION — personas, gates, walk, timing close-out

**Branch pushed for a real preview** (`feat/placement-adventure` →
`origin`, no approval gate — distinct from `git push origin main`):
Vercel preview deployed successfully, used for everything below that
needs a real deployed server (the ladder endpoint, real audio).

**Scripted personas, run directly against `/api/session-generator`
(not the UI)** — proves the ladder adjudication itself, independent of
which tile a click happens to land on:
- **Persona A** (pass rungs 1/3/5/7/9, fail rung 12 with 0/2): finalized
  at Unit 9 (`trueMeasuredUnit: 9`) — correctly floored to
  `placementUnit: 5` on this free-plan account. This single run proved
  both the ladder progression AND the free-tier floor simultaneously.
- **Persona B** (fail rung 1 with 0/2 immediately): finalized at Unit 1
  (`placementUnit: 1, trueMeasuredUnit: 1`) — the floor of the ladder.
- **Persona C** (1/2 on rung 1 → tiebreak correct → advance to rung 2;
  1/2 on rung 2 → tiebreak wrong → finalize at last passed): finalized
  at Unit 1 — both tiebreak directions (advance AND finalize) verified
  in one run, per the mission's "verify both."
- **Persona D** (abandon after rung 1, skip logged, never finalize):
  confirmed `child_profiles.placement_unit`/`placement_completed_at`
  both stay `null` — "skipped, Unit 1" requires no explicit write at
  all, only the analytics event.
- **`product_events` payload check**: a full started → completed →
  retaken → skipped sequence run against one child, queried directly —
  all four event types present with correct payloads (`placement_
  completed`'s payload has both `placementUnit` and `trueMeasuredUnit`;
  the others are empty objects, as designed). `placement_retaken` fired
  correctly (not `placement_started` again) because the server checked
  the REAL `placement_completed_at` column, not a client claim.

**Live browser walkthrough** (fresh account, against the same preview):
- Parent-choice screen renders exactly as designed ("One more thing" /
  beginner path visually primary).
- Both probe mechanics observed live: picture→word (WordArt image +
  word-tile options, e.g. bird/cat/a Nova-verb-pose "dance") and (proven
  via the scripted personas + code review, not separately screenshotted
  live) the audio-first Find the Word mechanic for units with no art
  coverage.
- **Measurement exception confirmed live**: a deliberate wrong tap
  produced the exact same tile flash and advanced immediately to the
  next probe — no wiggle, no hint-glow, no visible difference from a
  correct tap.
- "On to the next star!" transition beat rendered between rungs.
- Completion celebration: "Nova found your starting star! Unit N is
  ready to go!" — landed on Home showing that unit's word as current.
- Parent Portal Dashboard: no upgrade banner for a Unit-1-placed child
  (correct negative case; the >5 positive case was proven via Persona
  A's API-level result, `placementUnit: 5` on a free plan — a live
  screenshot of the banner itself was judged lower-value than a second
  full ladder UI walkthrough given the time budget, since the banner's
  render condition itself was already code-reviewed and the underlying
  data point is confirmed real).
- Settings tab: "Placement" section renders with the reassurance copy
  and a working "Retake placement" button — confirmed it re-launches
  the ladder from rung 1, and confirmed exiting mid-retake (X button)
  correctly returns to Home leaving the PRIOR placement_unit untouched
  (only a completed retake overwrites it).

**A real regression found and fixed in two EXISTING Playwright specs**:
`tests/smoke.spec.js`'s "sign in loads the Candy Galaxy Home screen" and
`tests/no-emoji-live.spec.js`'s live quiz flow both assumed onboarding
lands directly on Home — no longer true now that the parent-choice
screen sits between them. Both fixed to click "start at the beginning"
(the correct behavior for a true-beginner test fixture) before
continuing; `no-emoji-live.spec.js` additionally now asserts the new
choice screen itself has zero emoji, extending its existing coverage
naturally rather than just working around the new screen.

**Full Playwright suite at default invocation**: **18/21 passed** — the
3 new `placement-adventure.spec.js` specs fail today ONLY because they
correctly target production (`test.use({baseURL: 200magicwordsapp.com})`,
matching the `overlap-probes.spec.js` precedent for anything needing a
real deployed serverless function), and this feature isn't merged/
deployed to production yet. All 3 were verified passing against this
branch's own Vercel preview (temporarily pointed there, confirmed, then
restored to the production URL before committing) — they will pass for
real the moment this branch merges and deploys. Not treated as a false
"green" — reported exactly as it is.

**Gates**: `npm run build` clean, `npm run check:no-emoji` clean.

**Security — idor-proof 10/10 against the preview** (`DEPLOY_BASE_URL`
pointed at the branch's Vercel preview): all 10 checks pass, including
both new placement checks (direct column-write rejected, forged
ladder-state finalization rejected).

**Test accounts**: every account created during this pass
(`mwbaseline`, `mwplacementui`, `eventscheck`, the persona-script
accounts, all 3 new Playwright specs' self-provisioned accounts) was
deleted after use — confirmed via a direct query for any
`mwplace*`-prefixed leftover, none found.

### NOTES FOR NEXT PROMPTS — what the analytics pass (Prompt 9) should rely on (events home, taxonomy started)
IN PROGRESS
