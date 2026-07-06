# 200 MAGIC WORDS — PROMPT 8: PLACEMENT ADVENTURE
## Eighth prompt (repair sequence engineering-complete; this begins the launch sprint). Self-contained. The biggest pre-launch retention lever per the Product Blueprint: a new reader who already knows Units 1–4 must not start at "cat."

## MISSION
Build the Placement Adventure: an optional, adventure-framed placement flow at child creation that finds a starting unit through whole-word recognition probes, sets a starting-unit floor WITHOUT fabricating any progress data, and feeds the free-tier upgrade surface when a child measures beyond Unit 5.

1. **Entry point** — after Star Learner onboarding (name + avatar), the PARENT chooses: "Brand-new reader — start at the beginning" (skip, default) or "Let Nova find their level" (placement). True beginners — most 4–5-year-olds — never see a single probe. A "Retake placement" affordance lives behind the Grown-Ups gate.
2. **Adventure framing** — Nova flies between unit-stars "finding your starting star." Child-facing copy NEVER contains test/quiz/exam/score language. Candy chrome throughout (`lessonChrome` primitives).
3. **Probes** — reuse existing mechanics only: Find the Word (Nova says the word → pick among its hand-curated look-alikes from `findTheWordManifest.js`, which covers all 200 words) and, for `has_art` words, the picture→word mechanic. No new question types.
4. **THE MEASUREMENT EXCEPTION (explicit, documented)** — placement suspends the errorless completion scaffold: NO hint-glow, NO second-chance completion (either would destroy the signal). Still NO red, NO X, ever — a miss simply glides forward ("Let's try another!"). Every miss is indistinguishable from a hit in tone; only the data differs. Document this as a sanctioned exception in `DESIGN_BRIEF.md` §5 with the rationale (measurement context, onboarding-only), same brief-stays-authoritative rule as always.
5. **Adaptive ladder (server-side, deterministic)** — rungs at units {1, 3, 5, 7, 9, 12, 15, 18}; 2 probe words per rung (mixed mechanics where possible); pass = 2/2; 1/2 → exactly one tiebreak word decides; climb until the first failed rung; placement = the last PASSED rung's unit. Hard caps: ≤14 questions total, target 3–5 minutes. Exit/abandon mid-placement = treated as skipped (start Unit 1), resumable never (a fresh retake instead — stale half-placements are worse than none). Tune constants only with logged justification.
6. **Data model — no fabricated mastery** — migration adds `child_profiles.placement_unit` (nullable) + `placement_completed_at`. The session-generator's current-unit derivation respects `placement_unit` as a FLOOR; `word_progress` is never seeded by placement. Earlier units remain visible and playable on the Galaxy map (the `inProgress` logic from the polish pass is unaffected — untouched words below the floor still show as locked/reachable per the existing rules; verify the map renders sanely for a placed child). Existing children: column nullable, zero behavior change.
7. **Free-tier interaction** — placement may MEASURE beyond Unit 5. A free child starts at `min(placement_unit, 5)`; the TRUE measured level is stored and surfaced in the Parent Portal ("Nova found their level: Unit N — unlock Units 6–18 with the Family Plan") as the upgrade hook. Server-enforced as always.
8. **Placement events (analytics groundwork)** — first-party only, no third-party SDKs (child-directed product; COPPA): `placement_started` / `placement_completed` (with resulting unit + true measured unit) / `placement_skipped` / `placement_retaken`. Land them wherever learning telemetry naturally lives (assess: `learning_events` with a placement game_type vs. a small `product_events` table — pick the one Prompt 9's broader analytics pass can extend, justify in the report; a new table = `supabase db push` stop).

Branch `feat/placement-adventure` off main. Scope guards: no Session Complete redesign, no story_time chrome (next prompt), no `/app-legacy` work, no third-party analytics.

## PRE-FLIGHT (gate)
1. `git status` clean; `git log origin/main..main --oneline` empty (push first with approval if not). Confirm the polish-pass merge commit is an ancestor of HEAD.
2. `SUPabase_SERVICE_ROLE_KEY` available (shell env or `.env.local`) — existence only, never printed.

## STEP 0 — REPORT FILE FIRST (non-negotiable) + RUN TIMING
Create `docs/PLACEMENT_ADVENTURE_REPORT.md` with the REPORT headers below, "IN PROGRESS" under each, **and a `RUN TIMING` line recording the start timestamp (date, HH:MM local)**. At close-out, complete it with the end timestamp and total wall-clock duration. This RUN TIMING requirement is now part of the standing template — every future prompt's report carries it.

## AUTONOMY & RULES
Standard block: autonomous Bash; stops only for secrets, destructive DB ops beyond own `nextgenprecisiondrones+*` accounts, live payment mode, history rewrites, plus the migration's `supabase db push`. Fresh test accounts (`admin-user.mjs` + `seed-progress`), deleted after. Candy tokens, whole-screen verification, `getByRole`, `db-query.mjs`, full gates before merge.

Known traps (do not rediscover): rAF throttling in unfocused tabs; hidden-tab media suspension (4s `Promise.race` on audio waits); overlap probes = synchronous `.paused`; local Vite serves no `/api` (server ladder behavior verifies on the pushed branch's preview with `DEPLOY_BASE_URL`); `/api/speak` may be absent on previews; Playwright `workers: 1` with the known residual provisioning-flake class (re-run in isolation before calling regression).

**CORE METHODOLOGY RULE:** anti-phonics, absolute. Probes are whole-word recognition; audio is whole words via the singleton; no letter sounds/names/blending anywhere, including in any placement copy.

**SECURITY RULE (this prompt's sharpest edge):** placement mode must not become a premium-content bypass. The server-side probe-plan generator (extend `api/session-generator.js`'s mode pattern — `reviewOnly` is the precedent) returns SHORT, word-level, placement-flagged plans through the same child-ownership verification; it may sample words above the free cap for MEASUREMENT, but must never return a playable full session plan for gated units, and completing placement must not unlock gated content (only the min(placement, 5) floor applies for free plans). **Extend `scripts/idor-proof.mjs` with a 10th check**: a forged placement request cannot extract a full premium session plan nor set a floor above the caller's plan allowance. idor becomes 10/10 from this pass forward.

**DESIGN LAW:** DESIGN_BRIEF.md throughout, plus the documented placement exception from MISSION #4. 44px+, chunk shadows, no emoji, reduced-motion respected (probe transitions and Nova's flight respect the gate; the flow completes fully under reduced motion).

Read first: the Star Learner onboarding flow (where the parent-choice screen inserts), `api/session-generator.js` (current-unit derivation, `reviewOnly` mode pattern, tier gating), `useSessionPlan.js`, `findTheWordManifest.js`, `FindTheWord.jsx`/the picture→word mechanic (what's reusable as a probe renderer vs. what assumes the errorless scaffold — assess whether to reuse components with a `placementMode` prop or build a thin `PlacementProbe` wrapper over `lessonChrome`; justify the choice), `child_profiles` schema + RLS, GalaxyScreen/`useCandyGalaxyData` (floor interaction), Parent Portal dashboard (where the true-level/upgrade surface lands), prior NOTES sections.

## PART 1 — BASELINE
Fresh account through the REAL onboarding today: capture where Star Learner ends and the first session begins (the insertion point), what a brand-new child's Galaxy/session state looks like at Unit 1, and the Parent Portal dashboard's current upgrade surfaces. Screenshots.

## PART 2 — SERVER: PROBE PLAN + FLOOR + EVENTS
- Placement mode in `session-generator.js` per the SECURITY RULE: deterministic ladder plans (rung unit → 2 words + tiebreak candidate), sampled from the rung's unit words (mix mechanics; `has_art` → picture probe eligible, all words → Find the Word probe via the manifest). Child-ownership verified; plan-tier read; placement-flagged responses.
- Ladder progression server-adjudicated (client reports probe answers; server advances rungs and finalizes placement — the client must not be able to self-declare Unit 18). Assess the cleanest shape (stateful rows vs. signed ladder state round-tripped) and justify; whatever wins, forged finalization is covered by the new idor check.
- Migration: `placement_unit`, `placement_completed_at` (+ the events table if that's the PART/MISSION #8 verdict). `supabase db push` stop.
- Floor applied in current-unit derivation for session plans; free cap still wins (`min`).
- Events written per MISSION #8.

## PART 3 — CLIENT: THE ADVENTURE FLOW
- Parent-choice screen at the end of Star Learner (two chunky options; "start at the beginning" is the visually-default path). Grown-Ups gate hosts "Retake placement" (retake overwrites `placement_unit` after a fresh run; confirm copy makes clear progress is never erased).
- Probe screens on `lessonChrome`: Nova porthole speaks (Find the Word probes: bare word, never displayed; picture probes: existing prompt convention), 2×2 tiles, tap answers ONCE — no scaffold completion, per the measurement exception. Between rungs, a light Nova flight beat ("On to the next star!") — short, reduced-motion-aware.
- Completion: "Nova found your starting star — Unit N!" celebration (§6 size), then into the normal flow at the floored unit. Free child measured above 5: child sees Unit 5 as their star (no paywall language at the child); the TRUE level + upgrade line lands in the Parent Portal dashboard.
- Abandon/exit mid-placement → skipped (Unit 1), clean state, retake available.

## PART 4 — HOUSEKEEPING (bounded)
- The two trivial deferred hint gaps from the polish pass: audio-replay buttons on Fill the Story and Word Builder, same pattern as everywhere else.
- Update `docs/200MW_Master_Project_Doc_v3.md`: move Placement Adventure from BACKLOG into a new LAUNCH SPRINT section with DONE status + one-line summary; note idor is now 10 checks; note the RUN TIMING template rule.

## VERIFY (fresh accounts; delete after)
- **Beginner path**: choose "start at the beginning" → zero probes, Unit 1, identical to baseline.
- **Placement path, scripted personas** (against the pushed branch's preview — the ladder is server-side):
  - Persona A answers everything correctly through rung 9 then misses rung 12 twice → placed Unit 9; on a premium plan starts at 9; on free starts at 5 with the Parent Portal showing true level 9 + upgrade line.
  - Persona B misses rung 1 → placed Unit 1 (floor of the ladder), tone check: the child-facing experience reads as a fun flight, zero failure language.
  - Persona C: 1/2 on a rung → tiebreak word decides both directions (verify both).
  - Persona D abandons at rung 3 → skipped, Unit 1, retake works and overwrites.
- **Measurement exception**: during probes, a wrong tap advances with "Let's try another!" — NO hint-glow, NO second chance, NO red/X (screenshot the miss state); `DESIGN_BRIEF.md` §5 exception paragraph committed.
- **No fabricated data**: after placement, `word_progress` has ZERO rows from placement; Galaxy map renders sanely for a placed child (floor unit current, below-floor words per existing rules).
- **Security**: idor-proof **10/10** with `DEPLOY_BASE_URL` against the preview, including the new placement check; a forged placement finalization cannot set a floor above plan allowance.
- **Events**: all four event types written with correct payloads (query them).
- **Reduced motion**: full placement completes with flight beats suppressed.
- **Whole screen** every state; overlap spot-check on probe audio (synchronous `.paused`).
- **Playwright**: new self-provisioning specs — beginner path, one full placement persona, the measurement-exception miss state — suite green at default invocation.
- **Gates**: `npm run build` (all sync checks), `check:no-emoji`, Playwright, idor 10/10.

## MERGE & PRODUCTION (the full leg)
All green → merge → push (approval) → deploy confirmation (`gh api .../commits/<sha>/status` + `curl -sI https://200magicwordsapp.com`; never the Vercel MCP connector) → production walk with a fresh account: parent-choice screen renders, run a short real placement (answer honestly, note where it places), confirm the Parent Portal surface, confirm `word_progress` stayed empty, delete the account → append PRODUCTION VERIFICATION (with RUN TIMING end/total) → commit docs → push (second approval).

## REPORT (docs/PLACEMENT_ADVENTURE_REPORT.md — created at STEP 0, filled live)
### RUN TIMING — start / end / total wall-clock
### PRE-FLIGHT — sync state, key presence
### BASELINE — onboarding insertion point, new-child state, portal surfaces
### SERVER — mode design, ladder adjudication shape chosen + why, migration, floor, events-home verdict
### CLIENT — parent choice, probe renderer decision (reuse-with-prop vs wrapper) + why, flow states
### MEASUREMENT EXCEPTION — implementation, brief §5 update
### FREE-TIER SURFACE — min() behavior, portal upgrade line
### SECURITY — the 10th idor check, forged-finalization result
### HOUSEKEEPING — hint buttons, v3 update
### VERIFICATION / PRODUCTION VERIFICATION — personas, gates, walk, timing close-out
### NOTES FOR NEXT PROMPTS — what the analytics pass (Prompt 9) should rely on (events home, taxonomy started)
