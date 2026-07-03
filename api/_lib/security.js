// api/_lib/security.js
// Shared by every AI/TTS serverless function (session-generator,
// story-engine, parent-digest, speak). `_lib/` is a Vercel convention —
// files/directories prefixed with an underscore aren't turned into their
// own routes, only importable by other functions.
//
// Two responsibilities: verify the caller is a real signed-in user (kills
// anonymous drive-by abuse outright), and enforce a per-user/per-endpoint
// rate limit on top of that (kills a signed-in-but-abusive account from
// looping a paid endpoint).

const { createClient } = require('@supabase/supabase-js');

// Fire-and-forget log to security_events (migration 0017) — never awaited
// by callers, never throws into the request path. User UUIDs only, no
// names/emails/child data; this exists to answer "is something attacking
// us," not to store PII.
function logSecurityEvent(eventType, { userId = null, endpoint = null, detail = null } = {}) {
  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  admin.from('security_events').insert({ event_type: eventType, user_id: userId, endpoint, detail })
    .then(({ error }) => { if (error) console.error('[security-events] log write failed:', error.message); });
}

// Verifies the Authorization: Bearer <token> header against Supabase Auth
// and returns the real user, or null if missing/invalid. Uses the anon
// key (least privilege — verifying a JWT doesn't need service-role).
async function getVerifiedUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Fixed-window counter: one row per (user, endpoint, window). windowMinutes
// determines the bucket size (e.g. 1 for "per minute", 1440 for "per day").
// Returns { allowed, retryAfterSeconds }. Fails OPEN only if the rate-limit
// table itself is unreachable (a DB hiccup shouldn't take down every AI
// feature) — logged loudly so that's visible, not silent.
async function checkRateLimit(userId, endpoint, limit, windowMinutes) {
  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  try {
    const { data: existing, error: selectErr } = await admin
      .from('api_rate_limits')
      .select('count')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart)
      .maybeSingle();
    if (selectErr) throw selectErr;

    const currentCount = existing?.count ?? 0;
    if (currentCount >= limit) {
      const retryAfterSeconds = Math.ceil((new Date(windowStart).getTime() + windowMs - Date.now()) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }

    const { error: upsertErr } = await admin
      .from('api_rate_limits')
      .upsert(
        { user_id: userId, endpoint, window_start: windowStart, count: currentCount + 1 },
        { onConflict: 'user_id,endpoint,window_start' }
      );
    if (upsertErr) throw upsertErr;

    return { allowed: true };
  } catch (err) {
    console.error(`[rate-limit] check failed for ${endpoint}, failing open:`, err.message);
    return { allowed: true };
  }
}

// Combined helper most handlers call directly: verifies auth, then rate
// limit, writing the appropriate 401/429 response and returning null if
// either check fails (caller should `if (!user) return;`).
async function requireAuthAndRateLimit(req, res, endpoint, limit, windowMinutes) {
  const user = await getVerifiedUser(req);
  if (!user) {
    logSecurityEvent('auth_verification_failed', { endpoint });
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const { allowed, retryAfterSeconds } = await checkRateLimit(user.id, endpoint, limit, windowMinutes);
  if (!allowed) {
    logSecurityEvent('rate_limit_exceeded', { userId: user.id, endpoint });
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests', retryAfterSeconds });
    return null;
  }
  return user;
}

module.exports = { getVerifiedUser, checkRateLimit, requireAuthAndRateLimit, logSecurityEvent };
