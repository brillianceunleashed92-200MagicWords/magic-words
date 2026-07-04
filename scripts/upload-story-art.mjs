// scripts/upload-story-art.mjs
// Mission A4 — uploads a locally-downloaded story illustration to the
// story-art Storage bucket and writes its public URL onto the matching
// story_catalog row (target_word, tier). Pairs with the Higgsfield
// generation workflow: generate via mcp__higgsfield__generate_image
// (model recraft_v4_1, model_type vector, colors = the 5 dawn tokens
// #2A2150/#FFF8F0/#2DD4BF/#FF7A59/#FFB84D, background_color #FFF8F0,
// prompt = plain scene description + the fixed style suffix below),
// download the resulting _min.webp, then run this script to wire it in.
//
// Style suffix used for every catalog image so far (repeat verbatim for
// new ones to keep the house style consistent — this is prompt
// convention, not model-enforced, so consistency depends on reusing it):
//   "Flat vector illustration, simple bold shapes, single clean
//   silhouettes for each element, minimal internal detail, no gradients,
//   no outlines, no shadows, no photorealism, warm and friendly, soft
//   rounded forms, cream background."
//
// IMPORTANT — content-safety gate: this script does not review images.
// Per the mission's hard confirmation-stop, always visually review new
// generations (Read tool on the downloaded file) for anything scary,
// unsafe, or off-brand BEFORE running this script, especially for
// animals/subjects that could read as threatening (teeth, claws,
// aggressive posture) — do not mass-generate/upload unattended.
//
// Usage:
//   node --env-file=.env.local scripts/upload-story-art.mjs <word> <tier> <local-file-path>
//
// Requires (in .env.local or the environment):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const [, , word, tierArg, filePath] = process.argv;
const tier = parseInt(tierArg, 10);

if (!word || !tier || !filePath) {
  console.error('Usage: node --env-file=.env.local scripts/upload-story-art.mjs <word> <tier> <local-file-path>');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) { console.error('Missing VITE_SUPABASE_URL'); process.exit(1); }
if (!SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = 'story-art';

async function main() {
  const buf = readFileSync(filePath);
  const ext = filePath.split('.').pop();
  const path = `${word}-tier${tier}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: `image/${ext === 'webp' ? 'webp' : 'png'}`, upsert: true });
  if (uploadError) { console.error('upload failed:', uploadError.message); process.exit(1); }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: updateError, count } = await supabase
    .from('story_catalog')
    .update({ art_asset_url: pub.publicUrl })
    .eq('target_word', word)
    .eq('tier', tier);
  if (updateError) { console.error('catalog update failed:', updateError.message); process.exit(1); }

  console.log(`${word} (tier ${tier}): ${pub.publicUrl}`);
}

main();
