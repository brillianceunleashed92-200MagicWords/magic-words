# 200 MAGIC WORDS — FEAT_QUICK_WINS_R1: PACKAGE E, SIX QUICK WINS
**Written:** July 8, 2026 · **Execute from:** `~/magic-words` · **Branch:** `feat/quick-wins`

## MISSION — six quick wins, one bundle
Five polish items plus one auth bug fix. Order below is by risk (heaviest
first). Each item is independently shippable — if any one triggers a
STOP (a migration Sal must approve, an unreproducible flake), ship the
rest and document the STOP; a partial Package E is a valid, successful
run.

1. Streak freeze token (Sal's ratified rule — the one non-trivial item)
2. Sleeping stars — review-due, dimmed, tap-to-review
3. Unit-relative Session Complete framing — light copy/data reframe, NOT
   the A2 redesign
4. Honest "Minutes this week" label — keep the number, mark it an
   estimate
5. Grown-Ups "Settings" tab-bar label clip at 375px — CSS fix
6. Password-reset `verifyOtp` recovery-session flake — diagnose-then-fix
   (confirmed on unmodified main)

## ARCHITECTURE NOTES (locked)
- Do not change the stored mastery formula, `isRealMastery`, or the Star
  Keeper 1/3/7/14/30 ladder (`src/lib/starKeeper.js`,
  `word_progress.next_review_at`). Sleeping stars READ `next_review_at`;
  they do not change when it's set. Replay proof stays valid.
- Reuse, don't fork. Sleeping-star "wake" launches the EXISTING
  `reviewOnly` session path in the session-generator (same path Package
  B/C extended) — do not add a new endpoint or a second review flow. The
  minutes label keeps the existing `SECONDS_PER_EVENT` proxy — this run
  relabels, it does not re-instrument time.
- Streak freeze is a streak-logic change, not a mastery change. Recon
  where the streak reset decision is actually made (server edge function
  vs. client on session load — `user_streaks` table) and put the freeze
  check at that exact decision point. Do not scatter freeze logic across
  readers.
- Session Complete stays small. DESIGN_BRIEF §6 "mastery is the reward":
  the per-session summary is not a level-up. Do not borrow
  `LevelUpCelebration.jsx`'s bigger treatment. This is a framing/copy
  tweak only.
- DESIGN_BRIEF is authoritative for every pixel touched. No emoji
  anywhere (grep-enforced), no red, no X marks. Sleeping-star dimming
  uses existing tokens (reduced opacity / desaturate on `--sun`), never a
  new color. Every card/tile/button/pill keeps the `--chunk`/`--chunk-sm`
  + press-down contract. Respect `prefers-reduced-motion` on any
  wake/shield animation.

## RULES
1. Report `docs/QUICK_WINS_REPORT.md` at STEP 0, with RUN TIMING, live
   updates, first commit. FINAL STATUS self-certifies the docs push.
2. Approval stops: `git push origin main`; `supabase db push`
   (streak-freeze storage will likely need a column — recon first, write
   the migration, then STOP-and-present before pushing); destructive
   ops. Deployment check after push (~3 min, never silent past 5).
3. New `product_events`/`learning_events` types (e.g.
   `streak_freeze_used`, `streak_freeze_granted`): DB CHECK constraint
   AND — if client-posted — the `api/track` allowlist, same change, plus
   a positive-landing test proving the write lands (migrations 0035/0036
   lesson). Server-only-logged types touch the CHECK constraint only
   (document which).
4. idor-proof reruns — any freeze write path and the sleeping-star review
   launch get the full treatment: ownership-verified (a user can only
   touch their own streak/freeze/review). Every negative check gets a
   positive twin (a legitimate landing, not just an empty rejection set).
5. Candy tokens, errorless, no emoji, no red/X. Suite baseline 86
   (75 + Blank engine's 11) — only add. Enumerate the new specs in the
   report.
6. TRAPS section required. Reproduce-before-fix on item 6 — force the
   flake, capture it, then fix.

## PHASE 0 — REPORT + RECON
Read and report current state for each item before any code:
- Streak: `user_streaks` schema + the exact place the reset-vs-increment
  decision runs (server or client), and where the streak count renders
  (dashboard pill per mockup-D `.streak-row`).
- Stars: where word-stars render, how `next_review_at` is read on that
  surface, and the `reviewOnly` launch entrypoint in the
  session-generator.
- Session Complete: the component, the data it currently shows, and
  where current-unit + per-unit mastery counts are available.
- Minutes label: the `SECONDS_PER_EVENT` computation and the "Minutes
  this week" render site (Parent Portal / Grown-Ups).
- Settings clip: the Grown-Ups tab-bar component and the CSS truncating
  "Settings" at 375px.
- Password reset: the recovery component, the `verifyOtp({token_hash})`
  call, and the auth-state handling around it (`PASSWORD_RECOVERY`
  event, session establishment before the update call).

## PHASE 1 — LOCKED DECISIONS TABLE (report, before code)
Sal has ratified these three; record them verbatim, then recon-confirm
feasibility:
1. **Streak freeze rule v1** (conservative, tunable later by
   WEEKLY_INSIGHTS): hold at most 1 freeze; grant 1 at the start of each
   ISO week if the child has an active streak and holds 0; on a missed
   day, if a freeze is held, auto-consume it and preserve the streak (log
   `streak_freeze_used`). Two consecutive missed days still reset — only
   one freeze exists and it's spent on the first gap. A freeze never
   manufactures streak the child didn't otherwise earn beyond one
   protected day.
2. **Minutes label**: keep the `SECONDS_PER_EVENT`-derived number; render
   it as an estimate — "~12 min" (or "About 12 min") — and add one honest
   parent-facing micro-note that it's approximate, based on activity. No
   re-instrumentation.
3. **Sleeping stars**: stars past `next_review_at` render "asleep"
   (dimmed via existing tokens, no emoji); tapping one wakes it into the
   existing `reviewOnly` review. Not-due stars are visually and
   behaviorally unchanged.

Add the exact copy strings (Session Complete unit framing, minutes note,
any freeze-indicator label) to this table so nothing is invented
in-flight.

## PHASE 2 — STREAK FREEZE TOKEN (heaviest; migration STOP likely)
Recon storage first: can `user_streaks` hold `freeze_tokens` (+
`freeze_last_granted_at`, optional `freeze_used_at`), or is a new column
set required? If a migration is needed, write it and STOP-and-present for
approval before `supabase db push`. Then: grant/accrue per the locked
rule at the reset-decision point; auto-consume on a missed day; render a
small freeze/shield indicator when one is held (icons/, not emoji;
`--chunk-sm` + press-down if interactive). Telemetry per RULE 3. Verify
live: a held-freeze user who misses a day keeps the streak (token
consumed, event logged); positive twin — a no-freeze user still resets
exactly as before; accrual restores one freeze the next ISO week.

## PHASE 3 — SLEEPING STARS
Dim review-due stars via tokens (reduced opacity/desaturate on `--sun`);
tap wakes into the existing `reviewOnly` session — no new endpoint, no
fork. Verify live: a child with review-due stars sees them asleep;
tapping launches a real review; a not-due star is untouched;
`prefers-reduced-motion` honored on the wake animation. idor-proof: the
review launch stays ownership-scoped.

## PHASE 4 — DISPLAY HONESTY (Session Complete framing + Minutes label)
Reframe the Session Complete summary relative to the child's current unit
(e.g. unit name + N of M unit word-stars) — small, no new celebration,
tokens intact. Relabel "Minutes this week" as the ratified estimate with
the parent micro-note; number/proxy unchanged. Verify live at real data:
framing reads unit-relative; label reads as an estimate; no emoji; no
layout regression at 375px or desktop.

## PHASE 5 — GROWN-UPS "SETTINGS" 375px CLIP
Fix the tab-bar layout so all labels (incl. "Settings") render fully at
375px down to ~320px, with no regression at larger widths. Design tokens
and icon-weight (§8) intact. Verify with a Playwright viewport check at
375px asserting the full untruncated label. Note: Grown-Ups sits behind
the parent hold-gate, so this spec (and any Parent-Portal minutes-label
spec) must clear the gate with real Playwright mouse events
(`page.mouse.down()`/`up()` around a wait) — the rAF hold timer does not
advance under synthetic `dispatchEvent`.

## PHASE 6 — PASSWORD-RESET verifyOtp RECOVERY FLAKE (reproduce-first)
Reproduce the flake before fixing and document the failing signature.
Likely cause: a race between establishing the recovery session
(`verifyOtp({token_hash})` / `PASSWORD_RECOVERY`) and the password-update
call — the update fires before the recovery session is live. Fix so the
update reliably awaits an established recovery session; guard the race,
don't paper it with a sleep. Fixtures: use the `verifyOtp({token_hash})`
admin pattern with `parental_consent` metadata on the fixture (standing
trap — `admin.generateLink` implicit-flow links are PKCE-rejected).
Verify: a Playwright spec drives the full recovery→new-password→login
flow deterministically (multiple runs, no flake). A no-fix run WITH
evidence is still a successful run — but this one is confirmed on main,
so a real fix is expected.

## PHASE 7 — FIXTURES + TESTS (86 + new only)
Seed: a child holding a freeze who misses a day (streak survives) and one
without (resets — positive twin); a child with review-due stars (sleeping
+ wake-to-review); a session reaching Session Complete (unit framing);
Parent-Portal data for the minutes label; a 375px viewport spec; the
recovery-flow spec. Use `child_profiles` service-role seeding for
REVOKE-protected columns. New specs additive over 86 — enumerate them in
the report.

## PHASE 8 — GATES, VERIFY, SHIP
Full gates: `npm run build`, `npm run check:no-emoji`, `npm run
check:wordart-sync` (+ any other sync checks), Playwright `workers:1`,
`node scripts/idor-proof.mjs` (freeze + review write paths touched) —
confirm idor-proof actually executes against the live branch preview, not
the `if(deployBase)` skip branch (a deploy-gated check that only ever
skipped has never really run). Capture the browser console on the first
full-suite run (dead-import / uniform-timeout lesson — console before
memory assumptions). If a multi-mode endpoint's shared per-user rate
limit trips a false 429, spend a second identity's budget for the
positive flow. Preview walk on the live branch preview: freeze-protected
streak, sleeping-star wake, Session Complete framing, minutes estimate
label, 375px Settings, full recovery flow. Merge `feat/quick-wins` →
`main` `--no-ff` → approval → push → deployment check (GitHub
commit-status API + `vercel list`, MCP is on the wrong account) →
production walk with a fresh test account → cleanup + cascade-verify
(zero orphaned test accounts) → report DONE with end timing → docs push,
self-certified as FINAL STATUS's last line.

## REPORT (docs/QUICK_WINS_REPORT.md)
### RUN TIMING
### RECON + LOCKED DECISIONS TABLE
### STREAK FREEZE — rule as shipped, migration (STOP/approved), telemetry, freeze-kept vs no-freeze-reset twins
### SLEEPING STARS — dim mechanic, wake→reviewOnly reuse, ownership check
### DISPLAY HONESTY — Session Complete unit framing (before/after), minutes estimate label + parent note
### SETTINGS 375px — the fix, viewport proof
### PASSWORD RESET — reproduced signature, root cause, fix, deterministic spec
### VERIFICATION — fixtures, new specs vs 86 baseline, gates, idor-proof, preview + production walks
### TRAPS — reusable lessons
### NOTES FOR WEEKLY_INSIGHTS — which Package E signals are tunable/readable: streak-freeze grant/use rate, sleeping-star wake uptake, per-unit Session Complete completion — what the self-improvement loop should watch.
