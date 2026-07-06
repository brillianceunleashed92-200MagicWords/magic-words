# LAUNCH ANALYTICS REPORT (Prompt 9)

## RUN TIMING — start / end / total
- Start: 2026-07-06T02:57:19Z
- End: IN PROGRESS
- Total wall-clock: IN PROGRESS

## PRE-FLIGHT — sync state, key presence
- `git status` clean on `main` before branching; `git log origin/main..main` empty (main == origin/main).
- Confirmed placement merge commit (`cc803f9 merge: Placement Adventure (Prompt 8)`) is an ancestor of HEAD.
- `SUPABASE_SERVICE_ROLE_KEY` present in `.env.local` (existence checked only, not printed; not present in shell env).
- Branched `feat/launch-analytics` off `main` at pre-flight commit `9322ce3`.
- Approval model confirmed with user: autonomous throughout, hard stops only at `supabase db push` and `git push origin main` (per CLAUDE.md).

## METRIC DERIVATION MAP — the final derive-vs-event table, corrections to the hypothesis

Verified directly against live schema (`information_schema.columns` via `db-query.mjs`, not assumed):

| Metric | Verdict | Source |
|---|---|---|
| Signups by day | DERIVE (confirmed) | `auth.users.created_at` — readable via the Management-API SQL path (`db-query.mjs`'s technique), not PostgREST (auth schema isn't exposed there). |
| Children created / onboarding completed | DERIVE (confirmed) | `child_profiles.created_at` — row is only ever written once onboarding (name/avatar/interests) completes; no separate "started onboarding, abandoned" signal exists or is needed for this metric. |
| Activation (child w/ ≥1 real attempt) + time-to-activation | DERIVE (confirmed) | `learning_events` (`child_id`, `recorded_at`) — first row per child; time-to-activation = that row's `recorded_at` minus the child's `child_profiles.created_at`. |
| D1/D7 return | DERIVE (confirmed) | distinct `date_trunc('day', recorded_at)` per `child_id` in `learning_events`, counted relative to each child's first event day. |
| Streak distribution | DERIVE (confirmed) | `user_streaks.current_streak` — bucketed histogram. |
| Placement funnel (started/completed/skipped/retaken, unit distribution, free children measured >5) | DERIVE (confirmed) | `product_events` (event_type LIKE 'placement_%') for funnel counts; `child_profiles.measured_unit` (added this pass, PART 4) for the true-unit distribution and the >5-on-free upsell-pipeline count — using `measured_unit` here instead of `placement_unit` is exactly the point of PART 4, since `placement_unit` is already floored and would undercount the pipeline. |
| Subscriptions: active count | DERIVE (confirmed) | `subscriptions` current-state count where `status IN ('active','trialing')` — a snapshot query, no history needed. |
| Subscriptions: new by day | **CORRECTED — real gap found, webhook extended (not a new client event, per the doc's own instruction)** | `subscriptions` has no `created_at` — it's a single upserted row per `user_id` (`onConflict: 'user_id'`), so `updated_at` gets overwritten on every renewal/status change and can't answer "when did this user first subscribe." Fix: migration 0034 adds `subscriptions.created_at timestamptz not null default now()`, backfilled to each existing row's own `updated_at` (best available approximation, not a fabricated date) for pre-existing rows. `upsertSubscription()` in `api/stripe-webhook.js` was NOT changed to touch this column — Supabase's `.upsert()` only sets columns present in the payload object, so `created_at` is populated once on INSERT and left untouched by every subsequent conflict-UPDATE for free, no application code change required. |
| Subscriptions: cancellations by day | DERIVE, with a documented limitation | `subscriptions` rows where `status = 'canceled'`, filtered by `updated_at` — valid because `customer.subscription.deleted` is the only handler that sets `status` to a canceled value, so `updated_at` at that moment genuinely is the cancellation timestamp. **Known limitation** (documented in `ANALYTICS.md`, not solved here — would need an event-sourced history table, out of scope for launch): if a user later resubscribes, the row is overwritten and the original cancellation date is lost. Acceptable for a v1 launch dashboard. |
| Paywall viewed | **NEW EVENT (confirmed underivable)** | No table records "an upgrade surface rendered." `paywall_viewed` added. |
| Checkout started | **NEW EVENT (confirmed underivable), written server-side** | `api/create-checkout-session.js` already resolves the verified user and builds the Stripe session server-side — `checkout_started` logged there via the existing `logProductEvent` pattern (moved from `session-generator.js` into a small shared `_lib/productEvents.js` so both endpoints use the same function instead of duplicating it). |
| Upgrade tapped | **SCOPED OUT, decided during this pass** | Considered per the doc's "(and upgrade_tapped if the map wants it)" hint. Decided against it: `checkout_started` already fires the moment a tap successfully starts a real checkout session, which is the funnel signal that actually matters (did the paywall convert to a real Stripe session); a separate client-side `upgrade_tapped` would only add value for "tapped but the checkout call failed," a rare failure-path signal not worth a second event type at launch per derive-don't-duplicate. Revisit if checkout failure-rate ever becomes a real question. |

### Corrections to the doc's starting hypothesis
1. Subscriptions "new by day" was hypothesized as pure-derive; verification found it wasn't (no `created_at`) — fixed via the webhook/schema extension above, exactly the escape hatch the doc itself anticipated.
2. Placement funnel's ">5 on free = upsell pipeline" hypothesis named `placement_unit`, but that column is already floored to 5 for free plans by `finalize()` (Prompt 8) — using it would make the ">5" condition permanently false for every free child. `measured_unit` (PART 4 of this pass) is the actually-correct column, confirmed by re-reading `finalize()`'s write path.
3. `upgrade_tapped` scoped out (see table) — a deliberate reduction of the hypothesis, not an oversight.

## TRACK PATH — endpoint design, allowlists, dedup rule, idor extension result

**`checkout_started`** — written server-side inside `api/create-checkout-session.js`, right after the Stripe session is created (only if it succeeds). No client involvement; `logProductEvent` extracted from `session-generator.js` into a shared `api/_lib/productEvents.js` so both endpoints (and the new `/api/track.js`) use one function instead of three copies.

**`paywall_viewed`** — new `api/track.js`, JWT-required (`requireAuthAndRateLimit`, 30/hour/user — generous for real usage, tight against scripted spam) + a strict server-side allowlist: `EVENT_SCHEMAS = { paywall_viewed: { surface: enum } }`. Any event name not in that map, or any payload key not in that event's own schema, is rejected with 400 — no free-form strings ever reach `product_events` from a client. Identity comes only from the verified JWT (`user.id`); the endpoint never reads a `userId`/`childId` from the request body at all, so there's no field to even attempt forging.

**Dedup rule (client-side, `usePaywallViewedTracker`)**: once per `sessionStorage` key per surface (`mw_paywall_viewed:<surface>`) — justified because a banner can re-render many times in one visit (React re-renders, tab switches) but should only report "viewed" once per real visit; `sessionStorage` (not `localStorage`) lets a genuinely new session re-report it, matching the VERIFY step's own framing ("open the upgrade surface twice, one row" — twice *in the same session*).

**3 real paywall surfaces identified and wired** (all in the live `/app` tree — confirmed `GameTypeSelector`/`UpgradeModal` in `src/App.jsx` are `/app-legacy`-only, explicitly out of scope, before wiring anything there):
- `dashboard_true_level` — `DashboardTab.jsx`'s true-level banner (PART 4 of this pass)
- `dashboard_mastered` — `DashboardTab.jsx`'s mastered-count banner
- `settings` — `SettingsTab.jsx`'s always-available subtle banner

**`upgrade_tapped` scoped out** — see METRIC DERIVATION MAP's reasoning; `checkout_started` already covers the funnel signal that matters.

**idor-proof extension**: verified the file's actual runnable-check count directly rather than trusting prior prose (`git show HEAD:scripts/idor-proof.mjs | grep -c '^\s*check('` → **11** real checks before this pass, not the "10" prior reports' prose implied — a minor historical drift in how groups vs. individual `check()` calls were counted, not a functional gap). Added 5 new checks under a single new numbered group (disallowed event name rejected, disallowed payload key rejected, a valid call from A succeeds and is unaffected by a claimed `userId` in the body, the resulting row is confirmed to land under A's own `user_id` via a direct admin-client query — not just an HTTP status assumption, unauthenticated request rejected). **11 → 16 real checks.** Result pending a real run against the deployed preview (VERIFY section).

## REPORT SCRIPT — metric definitions summary, first production snapshot

`scripts/analytics-report.mjs` — service-role, local, read-only by
construction (`runQuery()` throws on any statement not starting with
`select`/`with`, not just documented as read-only). Reuses `db-query.mjs`'s
Management-API SQL path (needed for `auth.users`, which PostgREST never
exposes) rather than supabase-js. `--days N` (default 14) controls the
time-windowed metrics; every metric also prints an all-time figure.

**Test run against real production data** (before the `measured_unit`
migration was pushed, to sanity-check the 7 other metric groups first):
signups/children-created/activation/D1-D7/streak-distribution/placement-
funnel all ran and returned real numbers. One query (placement unit
distribution) correctly failed with `column "measured_unit" does not
exist` — expected, confirms the script queries the real column name rather
than silently returning empty, and will pass once migration 0034 is
pushed. Full run incl. subscriptions/paywall/checkout metrics deferred to
after the db push (VERIFY section) — first real full snapshot pasted there
and at PRODUCTION VERIFICATION.

`docs/ANALYTICS.md` written: every metric's exact definition, the full
event taxonomy (4 existing placement events + 2 new), the derive-don't-
duplicate principle, 2 documented known limitations (cancellation history
lost on resubscribe; test/seed data can show odd activation timing), and
the COPPA posture. `docs/COPPA_DATA_INVENTORY.md` updated with a new
"First-party analytics events" row describing `product_events`'
ids-only/enum-only payload shape.

## TRUE-LEVEL FIX — migration, privilege re-verification, banner result

Migration `0034_launch_analytics.sql` adds `child_profiles.measured_unit` (nullable, 1-18 range check, same shape as `placement_unit`). `finalize()` in `api/session-generator.js` now writes both `placement_unit` (floored) and `measured_unit` (true) in the same update call — one write path, service-role-only, same as before.

`DashboardTab.jsx`'s banner condition changed from `activeChild?.placement_unit > FREE_TIER_MAX_UNIT` to `(activeChild?.measured_unit ?? activeChild?.placement_unit) > FREE_TIER_MAX_UNIT`, with the message string using the same fallback — so a placement completed before this migration (measured_unit null) still renders correctly using the old floored value, rather than a blank/broken banner. `childProfiles.js`'s `select()` extended to fetch `measured_unit` so `activeChild` actually carries it.

Privilege re-verification (not assumed, per the 0032→0033 lesson): pending a real `information_schema.table_privileges` check after the migration runs (VERIFY section) — expected to show only `postgres`/`service_role` with UPDATE on `child_profiles`, same as after 0033, since 0034 adds a column to an already-fully-revoked table rather than touching grants itself. idor check 9 (direct column write, now including `measured_unit` as an equally-protected column) will be re-run against the preview to confirm.

## STORY TIME — the three-step migration order as executed, exit-saves proof, gameTheme reader map

**Precondition confirmed before touching anything** (per the doc's own instruction to read repair item 1's note first): `GameEngine.jsx`'s render call for `story_time` already passed `onExit={handleExitEarly}` — the exact same shared exit-save path every other activity uses — since `CELEBRATION_COMPLETION_FIX_REPORT.md`'s Bug 5 fix. The "thread the close" step was therefore verification, not new code: the shared chrome's close button and `StoryReader`'s internal button already called the identical function; the real gap (per Bug 5's own diagnosis) was that `StoryReader`'s full-screen portal (`position:fixed, inset:0, z-index:9990`) visually covered the shared chrome's close button, making it unreachable — not a wiring gap.

**3 commits, in the doc's exact order, each leaving at least one working exit**:
1. `tests/story-time-chrome.spec.js` added — enters Story Time via the guided path, taps "Start reading," exits via whichever "Exit and save progress" control is reachable (`.last()` in DOM order — resilient across every intermediate state below without needing per-commit spec variants), asserts a clean return Home with zero phantom XP credit. Passed against the pre-migration baseline (internal button only reachable).
2. `story_time` added to `GameEngine.jsx`'s `isE2Activity` list — chrome flips to skyGradient + the shared top bar underneath, but `StoryReader`'s portal still covers everything, so the internal button remains the only reachable exit. Spec re-run: still passes, unchanged (same aria-label, same underlying function).
3. `StoryReader.jsx` gained an `ownChrome` prop (default `true`, preserving `StoryScreen.jsx`'s "New Story Friday" behavior exactly — it has no other chrome around it and still needs its own portal/background/close button). `StoryTimeActivity.jsx` now passes `ownChrome={false}`: no portal, no background, no internal close button — just the inner white card in normal document flow (same `maxWidth:780` column convention as `WordMatch`'s own wrapper), so `GameEngine`'s shared top-bar close (already wired, now finally unobstructed) becomes the only close control. This is the one commit where portal-removal and button-removal happen atomically — doing either alone first would either strand the shared close unreachable (remove portal, keep old chrome) or leave zero exits (remove button before the shared one is reachable).

**Real bug found and fixed mid-verification, unrelated to the chrome work itself**: the Playwright spec initially failed with `column child_profiles.measured_unit does not exist` cascading into a stuck "Loading your galaxy…" loader (react-query retrying the failing query) — root cause was PART 4's `childProfiles.js` select-list change reaching production *before* migration 0034 had been pushed. Confirmed directly via a raw REST call, not assumed. Resolved by pushing 0034 (see TRUE-LEVEL FIX). Also fixed two wrong assumptions in the spec itself during debugging (not app bugs): the post-exit destination is Home ("Hey StoryKid! Ready to fly?"), and `handleExitEarly`'s pending-writes + streak-update round-trip needs a 20s (not 10s) visibility timeout.

**Verified live** (screenshot from the passing spec's trace, `--trace=on`): skyGradient background, top bar (close ×, gold StarProgress bar, mute speaker) — same shared chrome as every other `isE2Activity` surface — white card unchanged inside, exactly one close control visible. Spec passed twice in a row for stability (14.6s, 16.8s).

**`gameTheme.js` (`T`) reader census, re-run after the migration** — corrects the doc's own assumption ("expected remainder: only the `/app-legacy`-reachable set"):
| Component | Still reads `T`? | Live or `/app-legacy`-only? |
|---|---|---|
| `SoundMatch`, `SpellItOut` | Yes | `/app-legacy` only — confirmed absent from `src/lib/activityDefs.js`'s live rotation |
| `UpgradeModal`, `GameTypeSelector` | Yes | `/app-legacy` only — confirmed via `src/main.jsx`'s route table (`/app-legacy/*` → `App.jsx`, distinct from `/app/*` → `CandyGalaxyShell.jsx`) |
| `SessionProgress` + `GameEngine`'s own `!isE2Activity` background/fallback | Yes | **Live machinery** — still exercised whenever `SoundMatch`/`SpellItOut` render, since `GameEngine.jsx` itself is shared by both trees |
| **`SessionComplete`** | Yes | **Live — the doc's "only `/app-legacy`" assumption was wrong for this one.** Imported directly into `src/screens/PlayScreen.jsx` (confirmed via grep) and rendered at the end of every real session regardless of game type, not gated by `activityDefs.js` at all. |

Corrected remainder for the eventual legacy-deletion pass: `SoundMatch`/`SpellItOut`/`UpgradeModal`/`GameTypeSelector` are genuinely `/app-legacy`-only and safe to delete together with that tree; `SessionProgress` is live but only reachable via the two legacy-only game types (so it becomes dead *with* them); `SessionComplete` is live and independent of `/app-legacy` — it cannot be deleted alongside that tree and would need its own migration off `gameTheme.js`'s `T` if that file is ever removed.

## HOUSEKEEPING — v3 updates incl. the child_profiles write constraint

`docs/200MW_Master_Project_Doc_v3.md` updated:
- LAUNCH SPRINT item 2 added, marked DONE, summarizing this whole pass.
- COMPLETION ESTIMATE refreshed: Parent Loop 75%→78%, overall 80%→85%; gap list now reads "device-verified items, Stripe live + legal + key rotation, launch sweep" (Placement + analytics both moved from "gap" to "done").
- New standing constraint note: post-0033, all `child_profiles` writes are service-role-only — future avatar/name-edit work needs a server endpoint, not a direct client `.update()`.
- BACKLOG's `story_time` chrome migration bullet removed (done this pass); `/app-legacy` bullet corrected with the `SessionComplete` census finding (live, not legacy-only).
- KEY REFERENCE: idor count updated 10→16 (with a pointer to this report for why the historical figure was already slightly off); migrations table list updated with `child_profiles.measured_unit`, `subscriptions.created_at`, `product_events`.
- "Last updated" date bumped.

## VERIFICATION / PRODUCTION VERIFICATION — fixtures, gates, walk, timing close-out
IN PROGRESS

## NOTES FOR NEXT PROMPTS — what the Stripe-live pass and the launch sweep should rely on
IN PROGRESS
