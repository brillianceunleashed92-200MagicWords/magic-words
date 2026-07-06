# Launch Analytics (Prompt 9)

First-party only. **No third-party analytics SDKs, no advertising identifiers,
no PII in event payloads** — ids only, never names/emails/free-form child
text. See `COPPA_DATA_INVENTORY.md` for the full child-data posture; this
file is the metrics/event reference.

## Principle: derive, don't duplicate

A metric already answerable from an existing table gets a **query**, not a
new event. `product_events` (and the two new events below) exist only for
signals no existing table can answer. See `docs/LAUNCH_ANALYTICS_REPORT.md`
PART 1 for the full verification of every metric against the live schema.

## Metric definitions (so "activation" means one thing forever)

| Metric | Definition | Source |
|---|---|---|
| Signups | One row in `auth.users` | `auth.users.created_at` |
| Children created | One row in `child_profiles` (onboarding — name/avatar/interests — completes atomically, so row creation = onboarding completion) | `child_profiles.created_at` |
| Activation | A child with ≥1 row in `learning_events` (a real game attempt) | `min(learning_events.recorded_at)` per `child_id` |
| Time-to-activation | First `learning_events.recorded_at` minus that child's `child_profiles.created_at` | derived, per child |
| D1 / D7 return | A child has ≥1 distinct `learning_events` day exactly 1 / 7 days after their first activity day | derived, per child |
| Streak distribution | Histogram of `user_streaks.current_streak` | `user_streaks` |
| Placement funnel | Counts of `placement_started` / `placement_completed` / `placement_skipped` / `placement_retaken` | `product_events` |
| Placement unit distribution / upsell pipeline | Distribution of `child_profiles.measured_unit` (the TRUE measured level — **not** `placement_unit`, which is already floored to 5 for free plans); "upsell pipeline" = free-plan children with `measured_unit > 5` | `child_profiles.measured_unit`, `subscriptions` |
| Active subscriptions | Count where `status in ('active','trialing')` | `subscriptions` |
| New subscriptions by day | Count grouped by `subscriptions.created_at` | `subscriptions.created_at` (added migration 0034 — see below) |
| Cancellations by day | Count where `status = 'canceled'`, grouped by `updated_at` | `subscriptions.updated_at` — valid because `customer.subscription.deleted` is the only handler that ever writes a canceled status, so `updated_at` at that moment is the real cancellation timestamp |
| Paywall viewed | One `paywall_viewed` event per session per surface | `product_events` |
| Checkout started | One `checkout_started` event per successful Stripe Checkout Session creation | `product_events` |

### Known limitations (documented, not silently papered over)
- **Cancellation history is overwritten on resubscribe.** `subscriptions` is
  a single upserted row per `user_id`; if a canceled user later resubscribes,
  the original cancellation `updated_at` is gone. An event-sourced
  subscription-history table would fix this — out of scope for launch.
- **Activation/time-to-activation can show odd values for pre-existing
  test/seed data** created out of chronological order (e.g. a fixture's
  `learning_events` row seeded before its `child_profiles.created_at`) —
  a real artifact of test data, not a query bug. Real users can never
  produce a `learning_events` row before their `child_profiles` row exists
  (the row can't be created without a child first), so this should read
  as ~0 or positive for all real accounts.

## Event taxonomy

`product_events` — `(id, event_type, user_id, child_id, payload jsonb, created_at)`, service-role-only (RLS enabled, no client policies — same posture as `security_events`).

| event_type | Fired by | payload | Notes |
|---|---|---|---|
| `placement_started` | `api/session-generator.js` (server) | `{}` | First ladder call, no prior completed placement |
| `placement_completed` | `api/session-generator.js` (server) | `{ placementUnit, trueMeasuredUnit }` | |
| `placement_skipped` | `api/session-generator.js` (server) | `{}` | Beginner path chosen, or abandoned mid-ladder |
| `placement_retaken` | `api/session-generator.js` (server) | `{}` | A prior *completed* placement existed (checked server-side) |
| `checkout_started` | `api/create-checkout-session.js` (server) | `{ interval: 'month' \| 'year' }` | Fires only after a real Stripe Checkout Session is created |
| `paywall_viewed` | `api/track.js` (client-originated, JWT-verified) | `{ surface: 'dashboard_true_level' \| 'dashboard_mastered' \| 'settings' }` | Deduplicated client-side to once per browser session per surface |

`upgrade_tapped` was considered and deliberately not added — see
`LAUNCH_ANALYTICS_REPORT.md` PART 1 for the reasoning (`checkout_started`
already captures the funnel signal that matters).

## `/api/track` — the one client-originated event endpoint

- JWT required (`requireAuthAndRateLimit`), 30 requests/hour/user.
- Identity comes only from the verified JWT — the endpoint never reads a
  `userId`/`childId` from the request body.
- `event_type` and every payload key are checked against a strict
  server-side allowlist (`EVENT_SCHEMAS` in `api/track.js`) — anything else
  is rejected with 400. This is both the anti-PII guarantee (no free-form
  strings ever reach `product_events` from a client) and the anti-garbage
  guarantee (no new event types slip in unreviewed).

## COPPA posture

- First-party only — no Google Analytics, Segment, Mixpanel, Facebook
  Pixel, or any third-party analytics/advertising SDK anywhere in the
  dependency tree (verified by grep, see `COPPA_DATA_INVENTORY.md`).
- Every event payload is ids/enums only — never a child's name, free text,
  or any identifier beyond `user_id`/`child_id` (parent + child account
  ids, not directly child-identifying on their own).
- `scripts/analytics-report.mjs` is read-only by construction (refuses to
  execute anything that isn't a `select`/`with` statement) — no write path
  exists from the reporting tool itself.

## Running the report

```
node scripts/analytics-report.mjs [--days N]   # default 14; every metric also shows all-time
```
