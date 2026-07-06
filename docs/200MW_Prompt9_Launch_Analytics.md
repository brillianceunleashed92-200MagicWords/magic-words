# 200 MAGIC WORDS — PROMPT 9: FIRST-PARTY ANALYTICS + STORY TIME CHROME + PLACEMENT TRUE-LEVEL FIX
## Ninth prompt (launch sprint, part 2 of 2 — after this, the gap to launch is Stripe-live + legal + the launch sweep). Self-contained.

## MISSION
1. **Launch analytics, first-party only.** COPPA constraints are absolute for a child-directed product: NO third-party analytics SDKs, NO advertising identifiers, NO PII in event payloads (ids only — never names, emails, or free-form child text). The design principle is **derive, don't duplicate**: a metric already answerable from existing tables gets a QUERY, not a new event.
2. **Placement true-level fix** (the "sharp edge" `PLACEMENT_ADVENTURE_REPORT.md` flagged and dropped): a free child measured at Unit 9 stores `placement_unit = 5`, and the Dashboard banner reads that column — so the upgrade hook understates the measurement. Add a server-written `child_profiles.measured_unit` (set in `finalize()` alongside the floor, automatically covered by migration 0033's table-level UPDATE revoke), and point the Dashboard banner's "Nova found their level: Unit N" at it. Backfill n/a (events hold history; column starts fresh).
3. **story_time chrome migration** (the live seam every child sees, flagged twice): move Story Time onto the Candy `isE2Activity` chrome AND deduplicate the close buttons — `StoryReader`'s internal close is currently the ONLY working exit while its portal is open (repair item 1 made it load-bearing), so the shared chrome close must thread to the exact same `onExit` path before the internal one is removed. Exit-saves-progress is the regression to protect.
4. **Doc corrections**: v3's COMPLETION ESTIMATE paragraph still says ~80% and lists Placement as a gap — refresh it; add the new standing constraint that ALL `child_profiles` writes now require a service-role endpoint (post-0033) so future avatar/name-edit work doesn't rediscover it as a mystery permission error.

Branch `feat/launch-analytics` off main. Scope guards: NO `/app-legacy` work, NO third-party SDKs, NO parent-facing analytics UI (internal script only), NO Stripe changes.

## PRE-FLIGHT (gate)
1. `git status` clean; `git log origin/main..main --oneline` empty (push first with approval if not). Confirm the placement merge commit is an ancestor of HEAD.
2. `SUPABASE_SERVICE_ROLE_KEY` available (shell env or `.env.local`) — existence only, never printed.

## STEP 0 — REPORT FILE FIRST + RUN TIMING (standing template)
Create `docs/LAUNCH_ANALYTICS_REPORT.md` with the REPORT headers below, "IN PROGRESS" under each, and the RUN TIMING start timestamp. Close out with end + total wall-clock.

## AUTONOMY & RULES
Standard block: autonomous Bash; stops for secrets, destructive DB ops beyond own `nextgenprecisiondrones+*` accounts, live payment mode, history rewrites, and this pass's `supabase db push` (the `measured_unit` migration, plus any track-path schema needs). Fresh test accounts, deleted after. Candy tokens, whole-screen verification, `getByRole`, `db-query.mjs`, full gates before merge.

Known traps (do not rediscover): rAF throttling in unfocused tabs; hidden-tab media suspension (4s race on audio waits); overlap probes = synchronous `.paused`; local Vite serves no `/api` (server behavior verifies on the pushed branch's preview with `DEPLOY_BASE_URL`); `/api/speak` possibly absent on previews; Playwright `workers: 1` + the residual provisioning-flake class (re-run in isolation before calling regression); the signed-stateless-token and REVOKE-verification patterns from `PLACEMENT_ADVENTURE_REPORT.md` are the precedents to follow for anything similar here.

**CORE METHODOLOGY RULE:** anti-phonics, absolute — relevant here only to Story Time copy/audio, which this pass must not alter (chrome migration only; the narration system itself is explicitly out of scope, per the polish pass's own flag that it wasn't deeply reviewed).

**DESIGN LAW:** DESIGN_BRIEF.md throughout for the story_time chrome work — the migrated wrapper matches every other `isE2Activity` surface (skyGradient, top bar with close/mute/StarProgress, 44px+, chunk shadows, reduced-motion respected).

Read first: `PLACEMENT_ADVENTURE_REPORT.md` NOTES (the `product_events` shape and taxonomy conventions to extend), `product_events` migration, the Stripe checkout endpoint + webhook handler (where commerce events naturally pass through the server), `UpgradeModal`/upgrade banners (paywall-view instrumentation points), `GameEngine.jsx`'s `isE2Activity` branch + the `!isE2Activity` chrome (`SessionProgress`/`ConfettiBurst`), `StoryTimeActivity` → `StoryReader` (the `onExit` threading from repair item 1 — read that item's note in v3 before touching anything), `DashboardTab.jsx` (banner), `handlePlacement.finalize()`, `COPPA_DATA_INVENTORY.md`.

## PART 1 — METRIC DERIVATION MAP (assess FIRST — this decides what gets built)
Build the launch-metrics table: for each metric below, identify whether it is DERIVABLE from existing data or needs a NEW event. Starting hypothesis (verify each against the real schema, correct where wrong):
- Signups by day → `auth.users.created_at` (derive)
- Children created / onboarding completed → `child_profiles.created_at` (derive)
- Activation (child with ≥1 real attempt) + time-to-activation → first `learning_events` row (derive)
- D1/D7 return → distinct event days per child after first activity (derive)
- Streak distribution → `user_streaks` (derive)
- Placement funnel (started/completed/skipped/retaken, unit distribution, free children measured >5 = upsell pipeline) → `product_events` + `child_profiles.measured_unit` (exists after this pass)
- Subscriptions: active count, new by day, cancellations → `subscriptions` via the webhook's existing writes (derive — verify the webhook actually persists what's needed; if a lifecycle gap exists, extend the webhook handler, not a new client event)
- **Paywall viewed / upgrade tapped → NO table exists → new events** (`paywall_viewed`, `checkout_started`)
Write the final map in the report before implementing. Only the genuinely underivable signals get events.

## PART 2 — THE TRACK PATH (only for what PART 1 proves underivable)
- `checkout_started`: written SERVER-SIDE inside the existing checkout-session endpoint (the moment already passes through the server; no client involvement).
- `paywall_viewed` (and `upgrade_tapped` if the map wants it): client-originated → a minimal `/api/track` endpoint. Hard rules: JWT-required + per-user rate-limited (same middleware as every AI endpoint), a STRICT server-side allowlist of event names, payload keys allowlisted per event (reject anything else — no free-form strings, which is both the anti-PII and the anti-garbage guarantee), writes via service role into `product_events` following the placement taxonomy conventions (started/completed pairs; server-state distinguishes look-alike triggers). Dedup/noise control for `paywall_viewed` (e.g., once per session per surface) — pick, justify.
- idor-proof: extend with an 11th check if `/api/track` ships — forged cross-user tracking rejected (event lands under the caller's verified identity only, never a claimed one) and disallowed event names/payload keys rejected. idor becomes 11/11.

## PART 3 — THE REPORT SCRIPT (the launch dashboard)
- `scripts/analytics-report.mjs`: service-role, local, READ-ONLY. Prints the full PART 1 metric set with a date-range argument (default: last 14 days + all-time). Zero writes — enforce by construction (only `select`s; say so in the report).
- `docs/ANALYTICS.md`: each metric's exact definition and query logic (so "activation" means one thing forever), the event taxonomy (existing + new), the derive-don't-duplicate principle, and the COPPA posture (first-party only, ids-only payloads, no third-party SDKs).
- Update `COPPA_DATA_INVENTORY.md` with `product_events` + the new event types and their payload shapes — the legal review reads this file; it must be true.

## PART 4 — PLACEMENT TRUE-LEVEL FIX
- Migration: `child_profiles.measured_unit` (nullable, 1-18 check). Covered by 0033's revoke automatically — VERIFY via `information_schema.table_privileges` (the 0032 lesson: never assume a privilege), and confirm idor check 9 (direct column write) still rejects with the new column present.
- `finalize()` writes `measured_unit = trueMeasuredUnit` alongside the floored `placement_unit`.
- `DashboardTab.jsx` banner reads `measured_unit` (fallback to `placement_unit` when null, so pre-fix placements don't render a broken banner). Banner copy unchanged otherwise; verify the >5-on-free positive case renders LIVE this time (the prior pass skipped that screenshot).

## PART 5 — STORY TIME CHROME MIGRATION (the deliberate two-part fix)
- Order matters: FIRST thread `GameEngine`'s shared chrome close to `StoryReader`'s `onExit` path and prove exit-saves still works; THEN add `story_time` to `isE2Activity`; THEN remove `StoryReader`'s internal close button. At no commit may zero working exits exist while the portal is open.
- Whole-screen result: Story Time's outer wrapper on skyGradient + the standard top bar, `StoryReader`'s white card unchanged inside, exactly one close control, mute + StarProgress behavior consistent with every other activity.
- Regression protection: a Playwright spec — enter Story Time, exit mid-story via the (now shared) close, assert progress saved (the exact repair-item-1 failure mode).
- After migration, census `gameTheme.js` readers one more time — expected remainder: only the `/app-legacy`-reachable set; state it so the eventual legacy-deletion pass inherits a precise map.

## PART 6 — HOUSEKEEPING (bounded)
- v3: refresh the COMPLETION ESTIMATE paragraph (percentage + gap list — Placement is done; remaining gap = device-verified items, Stripe live + legal + key rotation, launch sweep); add the LAUNCH SPRINT item 2 (this pass) as DONE with a one-liner; add the standing constraint note: post-0033, all `child_profiles` writes are service-role-only — future avatar/name edits need a server endpoint; idor count update if PART 2 shipped the 11th check.

## VERIFY (fresh accounts; delete after)
- **Derivation map**: every "derive" metric produced by the script against production data + a seeded fixture (create a fixture child, play 2 activities, confirm the numbers move exactly as the definitions say: signups, activation, placement funnel).
- **New events**: `paywall_viewed` fires once per session per surface (open the upgrade surface twice, one row); `checkout_started` fires from the real checkout endpoint on the preview (TEST-mode Stripe — no live payment surface touched); disallowed event name via `/api/track` → rejected; forged identity → rejected (idor 11/11 if shipped, else 10/10).
- **True-level**: rerun the Persona-A shape against the preview — free child measured 9 → `placement_unit 5`, `measured_unit 9`, Dashboard banner LIVE screenshot saying Unit 9.
- **Story Time**: full session on the new chrome; exit mid-story via the shared close → progress saved (spec + live); whole-screen screenshots; reduced-motion pass; exactly one close button in the DOM.
- **Report script**: runs read-only (demonstrate: no write queries present), output pasted into the report as the first real launch-metrics snapshot.
- **Gates**: `npm run build` (all sync checks), `check:no-emoji`, Playwright default invocation (suite grows: story_time exit spec + any track-path spec), idor 10/10 or 11/11 with `DEPLOY_BASE_URL` against the preview.

## MERGE & PRODUCTION (the full leg)
All green → merge → push (approval) → deploy confirmation (`gh api .../commits/<sha>/status` + `curl -sI https://200magicwordsapp.com`) → production walk: one Story Time session on the new chrome incl. mid-story exit, paywall surface fires its event (query it), run `analytics-report.mjs` against production and paste the snapshot, confirm the placement banner path with a fresh placed child → append PRODUCTION VERIFICATION (+ RUN TIMING close-out) → commit docs → push (second approval). Delete test accounts.

## REPORT (docs/LAUNCH_ANALYTICS_REPORT.md — created at STEP 0, filled live)
### RUN TIMING — start / end / total
### PRE-FLIGHT — sync state, key presence
### METRIC DERIVATION MAP — the final derive-vs-event table, corrections to the hypothesis
### TRACK PATH — endpoint design, allowlists, dedup rule, idor extension result
### REPORT SCRIPT — metric definitions summary, first production snapshot
### TRUE-LEVEL FIX — migration, privilege re-verification, banner result
### STORY TIME — the three-step migration order as executed, exit-saves proof, gameTheme reader map
### HOUSEKEEPING — v3 updates incl. the child_profiles write constraint
### VERIFICATION / PRODUCTION VERIFICATION — fixtures, gates, walk, timing close-out
### NOTES FOR NEXT PROMPTS — what the Stripe-live pass and the launch sweep should rely on
