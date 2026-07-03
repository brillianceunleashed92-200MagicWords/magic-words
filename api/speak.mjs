export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
  // caps the cost of each ElevenLabs call (see Phase 5 rate limiting).
  if (content.length > 300) {
    return res.status(400).json({ error: 'text must be 300 characters or fewer' });
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
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(Buffer.from(audio));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
