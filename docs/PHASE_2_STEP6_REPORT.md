# Phase 2 Step 6 — Stripe Test-Mode Checkout + Gating: Run Report

Branch: `phase-2-parent-loop`, commit `c5e80bc`. Verified on the live
Vercel preview for this branch:
`https://magic-words-git-pha-cdfe78-brillianceunleashed92-6054s-projects.vercel.app`
(deployment `dpl_3A455FrvJMAfFWCJYyTVmwky1GR9`).

## Price IDs created

Via `scripts/create-stripe-products.mjs` (Stripe TEST MODE, idempotent):

- Product: `prod_UoN8JYjYwDK7lw` — "200 Magic Words — Family Plan"
- **Monthly**: `price_1TokOI1HwJlEooq4y3crPkgC` — $9.99/mo
- **Yearly**: `price_1TokOI1HwJlEooq4n13cOA46` — $79/yr

Both are in `.env.local`. **Not yet in Vercel** — see Open Items below.

## Endpoints built

- `api/create-checkout-session.js` — creates a Stripe Checkout subscription
  session, reusing an existing Stripe customer if one's on file.
- `api/stripe-webhook.js` — verifies the Stripe signature against the raw
  body, handles `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, writes `subscriptions` rows via
  `SUPABASE_SERVICE_ROLE_KEY`.
- `api/create-portal-session.js` — Stripe billing-portal link for
  Settings' "Manage subscription".

## Webhook verification — NOT YET DONE, blocked

Two separate gaps, found while trying to verify:

1. **`STRIPE_WEBHOOK_SECRET` doesn't exist yet.** I gave you the Stripe
   Dashboard walkthrough to create the endpoint and generate it; still
   waiting on that being added to `.env.local`/Vercel before any webhook
   event (real or via `stripe trigger`) can be verified — the handler
   returns a clean 500 "Stripe webhook not configured" without it, by
   design.
2. **`SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_PRICE_FAMILY_MONTHLY`/
   `STRIPE_PRICE_FAMILY_YEARLY` are not set in Vercel's Preview
   environment** (confirmed via `vercel env ls` — only
   `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`,
   `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` are configured there). Without these,
   `create-checkout-session` fails at the price-ID lookup and
   `create-portal-session`/the webhook handler can't write to
   `subscriptions` at all.

I did not add any of these myself: `SUPABASE_SERVICE_ROLE_KEY` is a
secret (mandatory confirmation stop per the master prompt — "adding/
rotating secrets"), and I'm treating the price IDs the same way since
they're payments configuration, even though they aren't secret values
themselves.

**What I need from you in Vercel (Project → Settings → Environment
Variables, scope to at least Preview):**
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Project
  Settings → API → service_role key (or `supabase projects api-keys`)
- `STRIPE_PRICE_FAMILY_MONTHLY` = `price_1TokOI1HwJlEooq4y3crPkgC`
- `STRIPE_PRICE_FAMILY_YEARLY` = `price_1TokOI1HwJlEooq4n13cOA46`
- `STRIPE_WEBHOOK_SECRET` — once you've completed the dashboard
  walkthrough

Once those are in, verification is a `stripe trigger checkout.session.completed`
(or a real test checkout) followed by checking the `subscriptions` table
— I'll do that as soon as they're confirmed added.

**Separate wrinkle worth flagging**: `STRIPE_SECRET_KEY`,
`VITE_STRIPE_PUBLISHABLE_KEY`, and `ELEVENLABS_API_KEY` all pulled back
as empty strings via `vercel env pull` (while `ANTHROPIC_API_KEY`,
added months ago, pulled its real value fine) — consistent with Vercel's
"Sensitive" environment variable option, which makes a value
write-only after creation (readable only by the running deployment,
never via CLI/API, even by the project owner). If that's intentional,
good — it's a stronger security posture. It does mean I can't test the
Stripe endpoints' logic locally against real preview secrets the way I
tested the AI ones below; verification has to happen through the actual
deployed function (a real browser checkout, or Sal confirming the
Settings tab's upgrade button reaches Stripe's hosted page).

## AI endpoint verification — DONE, all real Claude calls

Vercel's Preview environment has a working `ANTHROPIC_API_KEY`, so
these ran for real (not the local-dev fallback path):

### Parent Digest + Dinner Cards (`api/parent-digest.js`)

Input: a synthetic week (`cat` 90%, `dog` 75%, `bird` 40%, streak 4,
22 minutes). Real output:

> "Ellie had a fantastic week — she's really nailing 'cat' with 90%
> accuracy and making great strides with 'dog' too! She's kept up an
> impressive 4-day streak across 22 minutes of practice, showing some
> wonderful consistency. The word 'bird' is her next frontier, sitting
> at 40%, which just means she's right at the exciting edge of learning
> something new. A little extra time with 'bird' this week will help it
> click, and she's clearly building the confidence to get there!"

Dinner cards (all 3 correctly used only that week's words):
1. "Can you think of a bird you've seen outside, and what sound do you
   think it makes?"
2. "If you had a pet cat or a dog, what funny name would you give
   them?"
3. "Let's take turns saying a sentence about a bird, a cat, and a dog —
   who can make the silliest one?"

Warm, specific, growth-framed, grounded in the actual input data — no
generic filler.

### Story Engine (`api/story-engine.js`) — one real generation

Input: child "Ellie", interests `[animals, space]`, 15 mastered words
(`cat, dog, bird, run, jump, happy, big, small, the, a, is, my, I, see,
like`), target word `star`.

**Validator pass/fail attempts:**
```
attempt 1/3 — passed=false, rejected="and"
attempt 2/3 — passed=false, rejected="to"
attempt 3/3 — passed=true
```

Final story (3 attempts, matches the documented strict-vocabulary design
exactly — two real rejections before a clean pass, not a rubber-stamp):

> **Ellie Sees Stars**
> Ellie is happy. I see a big star. I see a small star. A bird jumped.
> The dog is happy. A cat runs. I like the big star. Ellie likes the
> stars.

`vocabularyUsed` returned matched the allow-list exactly (mastered words
+ "star" + "ellie") — confirms the hard-enforcement validator, not a
prompt suggestion, actually gated what reached the child.

## Client-side gating — verified locally (doesn't need live Claude/Stripe)

Confirmed with a fresh free-tier test account (documented in the Step 6
commit): Units 6+ render with the gold "teaser glow" immediately (no
progress needed — locked by definition for free tier), tapping a
locked node does nothing (no child-facing upsell), the Dashboard's
prominent upgrade banner correctly stays hidden below 20 mastered
words, and Settings' upgrade buttons render and attempt checkout
(failing with the same "endpoint not reachable" local-dev limitation
as every other `/api/*` call — expected).

## Open items (as of the original run — see Verification below for resolution)

1. ~~Add `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_PRICE_FAMILY_MONTHLY`,
   `STRIPE_PRICE_FAMILY_YEARLY` to Vercel (Preview, and Production
   when ready).~~ Done.
2. ~~Complete the Stripe Dashboard webhook walkthrough, add
   `STRIPE_WEBHOOK_SECRET` to `.env.local` and Vercel.~~ Done.
3. ~~Once both are done: a real test checkout (or `stripe trigger`) to
   confirm `subscriptions` actually gets written, then the phone test
   with card `4242 4242 4242 4242` you already planned.~~ Done via
   `stripe trigger` — see Verification.
4. ~~Full checkout → gating-unlock loop is still unverified end-to-end~~
   Verified — see below.

## Verification — 2026-07-02

Resumed on the same branch/preview URL. Setup was complete on the user's
side: all four env vars in Vercel Preview + Production, a Stripe Event
Destination pointing at the branch preview URL with the 3 subscription
events, deployment protection disabled, preview redeployed.

### Cleanup (interrupted run)

Deleted the leftover synthetic test user from the earlier interrupted
session (`nextgenprecisiondrones+mwcheckout1783002196761@gmail.com`,
`8a07cd80-9ee9-4dda-8779-245827321ccb`) via the Supabase admin API —
cascaded 1 `child_profiles` row. No `subscriptions` row existed for that
user, confirming the earlier run never reached a working webhook.

### Env sanity check

`vercel env ls` confirmed all four vars present in both Preview and
Production: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_PRICE_FAMILY_MONTHLY`,
`STRIPE_PRICE_FAMILY_YEARLY`, `STRIPE_WEBHOOK_SECRET`. This looked
sufficient, but two of them turned out to be wrong in ways `env ls`
can't detect (it only reports presence, not correctness) — see bugs
below.

### Bugs found and fixed

Both were found by actually running the payment loop, not by
inspection — the same pattern flagged elsewhere in this doc as the
reason to prefer real verification over assuming green.

1. **`api/stripe-webhook.js` crashed on every `checkout.session.completed`
   with `Invalid time value`.** Cause: `subscription.current_period_end`
   no longer exists on the Stripe Subscription object as of API version
   `2025-03-31` and later (this project is on `2026-04-22.dahlia`) —
   Stripe moved billing-period fields onto each subscription *item*
   (`items.data[0].current_period_end`) so subscriptions with items on
   different billing cycles can be represented. `new Date(undefined *
   1000).toISOString()` threw. Fixed by reading
   `subscription.items?.data?.[0]?.current_period_end` instead, with a
   null fallback. This is an API-version compatibility bug that would
   have hit **every real customer**, not a test artifact — worth a
   scan for the same top-level-field assumption anywhere else Stripe
   Subscription objects are read.
2. **`SUPABASE_SERVICE_ROLE_KEY` in Vercel didn't match Supabase's
   actual current service_role key.** The webhook's upsert to
   `subscriptions` failed with `new row violates row-level security
   policy` — service_role should bypass RLS unconditionally, so this
   meant the deployed key wasn't really service_role. Confirmed by
   fetching the real key via `supabase projects api-keys
   --project-ref ozhqsaysltiamadpcruz` and reproducing the exact same
   upsert locally, which succeeded. Fixed by removing and re-adding
   `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Preview + Production) with
   the correct value, confirmed with the user first since this is a
   secret rotation. Root cause of the original mismatch wasn't
   determined (not investigated further — out of scope once the fix
   was confirmed working).

Also worth flagging, not fixed (design tradeoff, not a bug): the
webhook's handler swallows `upsertSubscription` errors — logs them but
still returns `200` to Stripe (`api/stripe-webhook.js`, the
try/switch/catch structure only catches thrown errors, not the
`{error}` returned by a failed Supabase upsert). That's defensible
(avoids Stripe retry storms on unrecoverable errors), but it means
issue #2 above would have looked like a *successful* webhook delivery
from Stripe's side while silently not writing anything — only caught
here because the `subscriptions` row was checked directly afterward,
not because anything surfaced the failure. No log-based alerting exists
for this today.

Both fixes required a fresh deployment to take effect — Vercel
serverless functions snapshot env vars at deployment time, so adding
env vars or redeploying the *existing* build doesn't pick up new
values; a new build does. Deployed via `vercel deploy --target preview`
+ `vercel alias set` onto the branch's preview URL (rather than a git
push, to iterate faster) — the code fix is committed normally below,
so the next git push will produce an equivalent deployment.

### Payment loop — verified end to end

Created a fresh synthetic test user
(`drmarionsformula+stripewebhook1783012142@gmail.com`,
`6aacca30-be60-4a77-985a-1ddc9dd4834e`) via the Supabase admin API, per
the standing test-account convention.

Triggered the real webhook path with the Stripe CLI, reusing the
project's real recurring Family Monthly price and shaping the event's
`client_reference_id`/`metadata.user_id` to match what
`create-checkout-session.js` actually sends:

```
stripe trigger checkout.session.completed \
  --skip product --skip price \
  --override checkout_session:line_items.0.price=$STRIPE_PRICE_FAMILY_MONTHLY \
  --override checkout_session:line_items.0.quantity=1 \
  --override checkout_session:mode=subscription \
  --override checkout_session:client_reference_id=$USER_ID \
  --override checkout_session:metadata.user_id=$USER_ID \
  --remove checkout_session:payment_intent_data \
  --override payment_page_confirm:expected_amount=999
```

(The last three overrides/removals were needed because the CLI's
default `checkout.session.completed` fixture is one-time-payment mode
by default — `--skip`ping the fixture's own product/price and pointing
at the real recurring price directly needed a matching quantity, a
`mode=subscription` override, dropping the one-time-only
`payment_intent_data` block, and telling the fixture's payment
confirmation step the real $9.99 amount instead of its default.)

This is a real Stripe test-mode event delivered through the actual
configured Event Destination to the live webhook endpoint — not a
direct call into the handler. Confirmed via Stripe's event log
(`stripe events list`) that `client_reference_id` and
`metadata.user_id` carried through correctly and the session was
`mode: subscription`, `payment_status: paid`.

Resulting `subscriptions` row (queried directly with the service_role
key):

```json
{
  "user_id": "6aacca30-be60-4a77-985a-1ddc9dd4834e",
  "stripe_customer_id": "cus_UoRCHYspq3r1M5",
  "stripe_subscription_id": "sub_1TooKJ1HwJlEooq45AQDxu5G",
  "plan": "family",
  "status": "active",
  "current_period_end": "2026-08-02T17:23:01+00:00",
  "updated_at": "2026-07-02T17:23:06.335+00:00"
}
```

### Gating — confirmed with the real written plan value

`maxChildrenForPlan('family')` → `4` (vs. `1` for free),
`isUnitLocked(6, 'family')` → `false` (unlocked, vs. `true` for free),
`isUnitLocked(3, 'free')` → `false` (units 1–5 always open) — exercised
directly against `src/lib/queries/subscription.js`'s actual logic using
the `plan` value the webhook just wrote, not a hypothetical.

### Not needed

The browser-checkout fallback (`scripts/verify-checkout.mjs`, left over
from the interrupted run) wasn't used — the `stripe trigger` path
successfully exercised the real handler end to end, including the two
real bugs above, per the "lightweight first" instruction. Left
untouched in the working tree in case it's wanted for a future full
UI-level pass (e.g. actually testing the Stripe Checkout page itself,
which this approach doesn't touch).

### Cleanup

Deleted the synthetic test user and its cascaded `subscriptions` row
after verification (`auth.admin.deleteUser`). No leftover rows in
either Supabase or this branch's Stripe test-mode data beyond the
Stripe-side test objects themselves (customer/subscription/invoice),
which are inert test-mode records with no real charges.

### Result

Full checkout → webhook → `subscriptions` write → plan-gating loop is
verified end-to-end against the real deployed handler, with two real
bugs found and fixed along the way. Phase 2 Step 6 is done.
