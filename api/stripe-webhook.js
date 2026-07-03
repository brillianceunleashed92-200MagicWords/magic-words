// api/stripe-webhook.js
// Phase 2 Step 6 — writes to public.subscriptions (service_role only,
// per migration 0009's RLS: clients have no insert/update policy on that
// table by design, so a compromised client can't grant itself Family).
//
// Needs the raw request body for Stripe signature verification, so body
// parsing is disabled below and the stream is read manually.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Failures here mean a customer may have paid Stripe with no matching
// subscriptions row ever written — genuinely alert-worthy, not just a log
// line to scroll past. logWebhookFailure gives it a durable, queryable
// home (webhook_failures, migration 0017) in addition to the distinctive
// console.error prefix a log drain would actually watch for.
async function logWebhookFailure(supabase, { eventId, error, payload }) {
  console.error(`[stripe-webhook:CRITICAL] ${error} (event ${eventId})`);
  const { error: logErr } = await supabase.from('webhook_failures').insert({
    source: 'stripe', event_id: eventId ?? null, error, payload: payload ?? null,
  });
  if (logErr) console.error('[stripe-webhook:CRITICAL] failed to even log the failure:', logErr.message);
}

async function upsertSubscription(supabase, { userId, customerId, subscription }) {
  if (!userId) {
    await logWebhookFailure(supabase, {
      eventId: subscription.id,
      error: 'no user_id in metadata — cannot link subscription',
      payload: { customerId, subscriptionId: subscription.id },
    });
    return;
  }
  // API versions 2025-03-31+ moved current_period_end off the subscription
  // object onto each subscription item (a subscription can now have items on
  // different billing cycles) — subscription.current_period_end is gone.
  const currentPeriodEnd = subscription.items?.data?.[0]?.current_period_end;
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan: subscription.status === 'active' || subscription.status === 'trialing' ? 'family' : 'free',
    status: subscription.status,
    current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) {
    await logWebhookFailure(supabase, {
      eventId: subscription.id,
      error: `subscriptions upsert failed: ${error.message}`,
      payload: { userId, customerId, subscriptionId: subscription.id, status: subscription.status },
    });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !stripeKey) return res.status(500).json({ error: 'Stripe webhook not configured' });

  const stripe = new Stripe(stripeKey);
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await upsertSubscription(supabase, { userId, customerId: session.customer, subscription });
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        await upsertSubscription(supabase, { userId, customerId: subscription.customer, subscription });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        if (userId) {
          const { error } = await supabase.from('subscriptions').update({
            plan: 'free',
            status: subscription.status,
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId);
          if (error) {
            await logWebhookFailure(supabase, {
              eventId: subscription.id,
              error: `cancellation update failed: ${error.message}`,
              payload: { userId, subscriptionId: subscription.id },
            });
          }
        }
        break;
      }
      default:
        // Unhandled event types are expected (Stripe sends many) — no-op.
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] handler failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
