import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUser, checkRateLimit, logSecurityEvent } from './_lib/security.js';

const CACHE_BUCKET = 'tts-cache';

function cacheKeyFor(text) {
  return `${createHash('sha256').update(text).digest('hex')}.mp3`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Requires a real signed-in caller — every uncached call here costs
  // real money (ElevenLabs), and this endpoint previously had no auth
  // check at all.
  const user = await getVerifiedUser(req);
  if (!user) {
    logSecurityEvent('auth_verification_failed', { endpoint: 'speak' });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { word, text } = req.body ?? {};
  const raw = text ?? word;
  if (typeof raw !== 'string') {
    return res.status(400).json({ error: 'text must be a string' });
  }
  // Strip control/non-printable characters (replaced with a space so
  // words don't get mashed together) before trimming/length-checking —
  // a request body is fully attacker-controlled input reaching a paid
  // third-party API.
  const content = raw.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!content) {
    return res.status(400).json({ error: 'text is required' });
  }
  // Nothing legitimate here is longer than a question sentence — also
  // caps the cost of each ElevenLabs call.
  if (content.length > 300) {
    return res.status(400).json({ error: 'text must be 300 characters or fewer' });
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cacheKey = cacheKeyFor(content.toLowerCase());

  // Extends the existing per-word audio caching (word-audio bucket,
  // pre-generated once for all 200 core words) to dynamically-phrased
  // question sentences, which previously hit ElevenLabs fresh on every
  // single request even for byte-identical text — e.g. "Which picture
  // shows a cat?" gets asked to every child studying "cat". A cache hit
  // costs nothing (a Storage GET), so it's checked before — and doesn't
  // consume — the rate limit budget below.
  const { data: cached } = await admin.storage.from(CACHE_BUCKET).download(cacheKey);
  if (cached) {
    const buf = Buffer.from(await cached.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-TTS-Cache', 'hit');
    return res.status(200).send(buf);
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(user.id, 'speak', 60, 1);
  if (!allowed) {
    logSecurityEvent('rate_limit_exceeded', { userId: user.id, endpoint: 'speak' });
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({ error: 'Too many requests', retryAfterSeconds });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });

  try {
    const upstream = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/QeKcckTBICc3UuWL7ETc',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: content,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: errText });
    }

    const audio = await upstream.arrayBuffer();
    const audioBuffer = Buffer.from(audio);

    // Fire-and-forget: don't make the child wait on the cache write, and
    // a cache-write failure shouldn't fail a response that already
    // succeeded. Logged loudly so a persistent failure is visible.
    admin.storage.from(CACHE_BUCKET).upload(cacheKey, audioBuffer, { contentType: 'audio/mpeg', upsert: true })
      .then(({ error }) => { if (error) console.error('[speak] cache write failed:', error.message); });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-TTS-Cache', 'miss');
    return res.status(200).send(audioBuffer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
