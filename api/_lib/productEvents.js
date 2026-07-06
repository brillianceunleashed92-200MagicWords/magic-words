// api/_lib/productEvents.js
// Shared by every endpoint that writes to product_events (migration 0032,
// extended 0034) — first-party-only analytics, no third-party SDK anywhere
// near this (COPPA: child-directed product). Extracted out of
// session-generator.js during Prompt 9 so api/create-checkout-session.js
// and api/track.js can log through the same function instead of each
// duplicating the insert.
//
// Fire-and-forget, same pattern as security.js's logSecurityEvent —
// deliberately never awaited by callers, never throws into the request
// path. ids only, never names/emails/free-form child text (payload keys
// are allowlisted per event by each caller, not by this function itself).
async function logProductEvent(admin, eventType, { userId, childId, payload } = {}) {
  const { error } = await admin.from('product_events').insert({
    event_type: eventType, user_id: userId ?? null, child_id: childId ?? null, payload: payload ?? {},
  });
  if (error) console.error('[product-events] log write failed:', error.message);
}

module.exports = { logProductEvent };
