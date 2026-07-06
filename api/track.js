// api/track.js
// Prompt 9 launch analytics — the one client-originated first-party event
// endpoint. Everything else in product_events is either server-side-only
// (placement, checkout_started) or a derived query; this exists solely for
// the one signal that only the client can see: an upgrade surface actually
// rendered on screen (paywall_viewed).
//
// Hard rules (COPPA + anti-forgery, same posture as every other AI/TTS
// endpoint in this app):
// - JWT required + per-user rate-limited (requireAuthAndRateLimit, same
//   shared middleware as session-generator/story-engine/parent-digest/speak).
// - Caller identity comes ONLY from the verified JWT, never a client-
//   supplied userId/childId in the body — closes the same forged-identity
//   gap create-checkout-session.js and session-generator.js already closed.
// - STRICT server-side allowlist of event names AND payload keys per event
//   — rejects anything else outright. This is both the anti-PII guarantee
//   (no free-form strings ever reach product_events from a client) and the
//   anti-garbage guarantee (no accidental new event types slip in unreviewed).
const { createClient } = require('@supabase/supabase-js');
const { requireAuthAndRateLimit } = require('./_lib/security');
const { logProductEvent } = require('./_lib/productEvents');

// event name -> { allowed payload keys -> validator }. Anything not listed
// here, for event name or payload key, is rejected.
const EVENT_SCHEMAS = {
  paywall_viewed: {
    surface: (v) => ['dashboard_true_level', 'dashboard_mastered', 'settings'].includes(v),
  },
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 30/hour — generous for a handful of paywall-view events per real
  // session, tight enough to make a scripted spam attempt pointless.
  const user = await requireAuthAndRateLimit(req, res, 'track', 30, 60);
  if (!user) return;

  const eventType = req.body?.eventType;
  const schema = EVENT_SCHEMAS[eventType];
  if (!schema) return res.status(400).json({ error: 'Unknown or disallowed event type' });

  const rawPayload = req.body?.payload;
  if (rawPayload !== undefined && (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload))) {
    return res.status(400).json({ error: 'payload must be an object' });
  }

  const payload = {};
  for (const [key, value] of Object.entries(rawPayload ?? {})) {
    const validate = schema[key];
    if (!validate || !validate(value)) {
      return res.status(400).json({ error: `Disallowed or invalid payload key: ${key}` });
    }
    payload[key] = value;
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  // userId comes from the verified JWT only — never req.body — so a
  // forged identity in the request body has no effect (idor check 11).
  await logProductEvent(admin, eventType, { userId: user.id, payload });

  return res.status(200).json({ ok: true });
};
