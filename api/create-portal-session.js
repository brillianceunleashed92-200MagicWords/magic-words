// api/create-portal-session.js
// Phase 2 Step 6 — Stripe customer billing portal link (Settings tab's
// "Manage subscription"). Lets a Family subscriber update payment
// method, view invoices, or cancel without any custom UI on our side.
//
// Security hardening: this used to take `userId` straight from the
// request body and open a billing-portal session for whatever Stripe
// customer that user_id had on file — meaning anyone could open the
// billing portal (view invoices/name/email/partial card, change payment
// method, cancel the subscription) for an arbitrary account just by
// knowing/guessing its UUID. It's now derived from the caller's verified
// Supabase JWT only.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

async function getVerifiedUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await getVerifiedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
