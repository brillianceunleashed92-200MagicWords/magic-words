// api/create-portal-session.js
// Phase 2 Step 6 — Stripe customer billing portal link (Settings tab's
// "Manage subscription"). Lets a Family subscriber update payment
// method, view invoices, or cancel without any custom UI on our side.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) return res.status(404).json({ error: 'No Stripe customer on file for this account' });

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${origin}/app`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-portal-session] failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
