// api/create-checkout-session.js
// Phase 2 Step 6 — creates a Stripe Checkout Session for the Family plan.
// Client sends { email, interval }; server resolves the actual price ID
// server-side (STRIPE_PRICE_FAMILY_MONTHLY/_YEARLY) so no price ID needs
// to be exposed to or trusted from the client.
//
// Security hardening: the userId this checkout gets attached to (via
// client_reference_id / metadata.user_id, which api/stripe-webhook.js
// later trusts to decide whose `subscriptions` row to write) used to come
// straight from the request body — meaning anyone could attach a paid
// subscription to an arbitrary account by just knowing/guessing its
// UUID. It's now derived from the caller's verified Supabase JWT only.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { logSecurityEvent } = require('./_lib/security');
const { logProductEvent } = require('./_lib/productEvents');

async function getVerifiedUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getVerifiedUserId(req);
  if (!user) {
    logSecurityEvent('auth_verification_failed', { endpoint: 'create-checkout-session' });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = user.id;
  const email = user.email;

  const { interval } = req.body ?? {};
  if (interval !== 'month' && interval !== 'year') return res.status(400).json({ error: 'interval must be "month" or "year"' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });

  const priceId = interval === 'month' ? process.env.STRIPE_PRICE_FAMILY_MONTHLY : process.env.STRIPE_PRICE_FAMILY_YEARLY;
  if (!priceId) return res.status(500).json({ error: `STRIPE_PRICE_FAMILY_${interval.toUpperCase()} not configured` });

  const stripe = new Stripe(stripeKey);

  try {
    // Reuse an existing Stripe customer if this user has one on file (e.g.
    // a prior canceled subscription) rather than creating a duplicate.
    let existingCustomerId;
    const admin = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL
      ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : null;
    if (admin) {
      const { data } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
      existingCustomerId = data?.stripe_customer_id || undefined;
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: existingCustomerId,
      customer_email: existingCustomerId ? undefined : email,
      client_reference_id: userId,
      subscription_data: { metadata: { user_id: userId } },
      metadata: { user_id: userId },
      success_url: `${origin}/app/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/upgrade/cancel`,
    });

    // checkout_started (Prompt 9 launch analytics): logged here, not
    // client-side — this moment already passes through the server, and
    // the client can't be trusted to report it honestly. ids + interval
    // only, no PII.
    if (admin) logProductEvent(admin, 'checkout_started', { userId, payload: { interval } });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session] failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
