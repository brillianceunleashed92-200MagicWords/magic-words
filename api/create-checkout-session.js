// api/create-checkout-session.js
// Phase 2 Step 6 — creates a Stripe Checkout Session for the Family plan.
// Client sends { userId, email, interval }; server resolves the actual
// price ID server-side (STRIPE_PRICE_FAMILY_MONTHLY/_YEARLY) so no price
// ID needs to be exposed to or trusted from the client.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, email, interval } = req.body ?? {};
  if (!userId || !email) return res.status(400).json({ error: 'userId and email are required' });
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
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL) {
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
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

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session] failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
