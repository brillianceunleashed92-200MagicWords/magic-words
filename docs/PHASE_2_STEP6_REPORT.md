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

## Open items

1. Add `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_PRICE_FAMILY_MONTHLY`,
   `STRIPE_PRICE_FAMILY_YEARLY` to Vercel (Preview, and Production
   when ready).
2. Complete the Stripe Dashboard webhook walkthrough, add
   `STRIPE_WEBHOOK_SECRET` to `.env.local` and Vercel.
3. Once both are done: a real test checkout (or `stripe trigger`) to
   confirm `subscriptions` actually gets written, then the phone test
   with card `4242 4242 4242 4242` you already planned.
4. Full checkout → gating-unlock loop is still unverified end-to-end
   (client-side gating works, server-side subscription writes don't yet
   have what they need to run) — this is the one piece standing between
   here and "Phase 2 shipped."
