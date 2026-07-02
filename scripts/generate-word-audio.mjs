// scripts/generate-word-audio.mjs
// Phase 2 Step 4 — batch-generates ElevenLabs MP3s for all 200 words,
// uploads to the `word-audio` Storage bucket (public read, created in
// migration 0010), and writes the public URL back to words.audio_url.
//
// Idempotent: skips any word that already has a non-null audio_url,
// unless --force is passed. Safe to re-run after adding new words.
//
// Usage:
//   node --env-file=.env.local scripts/generate-word-audio.mjs [--force] [--limit=N]
//
// Requires (in .env.local or the environment):
//   ELEVENLABS_API_KEY      — server-side TTS key
//   VITE_SUPABASE_URL       — same project as the app
//   SUPABASE_SERVICE_ROLE_KEY — needed to write words.audio_url (words has
//                               no client write policy — see migration
//                               0001_words.sql) and to upload to Storage.

import { createClient } from '@supabase/supabase-js';

const VOICE_ID = 'QeKcckTBICc3UuWL7ETc'; // same voice as api/speak.mjs
const MODEL_ID = 'eleven_turbo_v2';
const BUCKET = 'word-audio';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ELEVENLABS_API_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1); }
if (!SUPABASE_URL) { console.error('Missing VITE_SUPABASE_URL'); process.exit(1); }
if (!SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY (needed to write words.audio_url and upload to Storage)'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function generateAudio(word) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: word,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}

async function main() {
  const { data: words, error } = await supabase
    .from('words')
    .select('id, word, audio_url')
    .order('sort_order', { ascending: true });
  if (error) { console.error('Failed to fetch words:', error.message); process.exit(1); }

  const targets = (FORCE ? words : words.filter((w) => !w.audio_url)).slice(0, LIMIT);
  console.log(`${words.length} total words, ${targets.length} to generate (force=${FORCE}, limit=${LIMIT === Infinity ? 'none' : LIMIT}).`);

  let totalChars = 0;
  let succeeded = 0;
  let failed = 0;

  for (const [i, w] of targets.entries()) {
    process.stdout.write(`[${i + 1}/${targets.length}] ${w.word} … `);
    try {
      const audioBuffer = await generateAudio(w.word);
      totalChars += w.word.length;

      const path = `${w.word}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
      if (uploadError) throw new Error(`upload: ${uploadError.message}`);

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('words')
        .update({ audio_url: pub.publicUrl })
        .eq('id', w.id);
      if (updateError) throw new Error(`db update: ${updateError.message}`);

      console.log('done');
      succeeded++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total characters sent to ElevenLabs: ${totalChars}`);
  console.log('Check your ElevenLabs dashboard for exact cost — pricing varies by plan.');
}

main();
