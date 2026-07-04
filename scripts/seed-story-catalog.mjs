// scripts/seed-story-catalog.mjs
// Mission A4 — seeds src/games/StoryTimeActivity.jsx's flagship story
// catalog (public.story_catalog, migration 0030). Text content is
// hand-authored here (not runtime-AI-generated — these are the curated
// "flagship" stories, distinct from api/story-engine.js's per-child
// on-the-fly generation for "New Story Friday"), all tier 3 (the fullest
// shape — see src/lib/localStory.js's getStoryTier) for Unit 1's 8
// already-illustrated words (matches the wordIcons.js precedent: ship
// coverage incrementally, starting with what's already illustrated).
//
// Deliberately does NOT set art_asset_url here — this script only seeds
// TEXT. Art is a separate, explicitly gated step
// (scripts/generate-story-art.mjs) per the mission's hard
// confirmation-stop: a small sample must be generated and reviewed
// before any bulk generation of child-facing imagery.
//
// Idempotent: upsert on (target_word, tier).
//
// Usage: node --env-file=.env.local scripts/seed-story-catalog.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) { console.error('Missing VITE_SUPABASE_URL'); process.exit(1); }
if (!SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const STORIES = [
  {
    target_word: 'cat', tier: 3, title: 'The Curious Cat',
    sentences: [
      'This is a cat.', 'The cat is small and orange.', 'The cat likes to play.',
      'It jumps and runs in the yard.', 'The cat sees a red ball.',
      'It rolls the ball with its paw.', 'The cat is happy and tired.', 'Now the cat takes a nap.',
    ],
    comprehension_question: { question: 'What did the cat play with?', choices: ['a ball', 'a book', 'a shoe'], correctIndex: 0 },
  },
  {
    target_word: 'dog', tier: 3, title: 'A Good Day for Dog',
    sentences: [
      'This is a dog.', 'The dog is brown and fluffy.', 'The dog runs in the park.',
      'It likes to chase a ball.', 'The dog barks at a bird.', 'The bird flies away fast.',
      'The dog is tired now.', 'It lies down for a rest.',
    ],
    comprehension_question: { question: 'Where did the dog run?', choices: ['in the park', 'in the pool', 'in the house'], correctIndex: 0 },
  },
  {
    target_word: 'bird', tier: 3, title: 'The Little Bird',
    sentences: [
      'This is a bird.', 'The bird is blue and small.', 'It sits on a tall tree.',
      'The bird sings a happy song.', 'It flies up into the sky.', 'The bird looks for some food.',
      'It finds a little worm.', 'The bird flies back to the tree.',
    ],
    comprehension_question: { question: 'What color is the bird?', choices: ['blue', 'red', 'green'], correctIndex: 0 },
  },
  {
    target_word: 'fish', tier: 3, title: 'A Fish in the Pond',
    sentences: [
      'This is a fish.', 'The fish is orange and shiny.', 'It swims in a big pond.',
      'The fish likes to swim fast.', 'It sees a green leaf.', 'The fish swims under the leaf.',
      'The fish is happy in the water.', 'It swims home to rest.',
    ],
    comprehension_question: { question: 'Where does the fish live?', choices: ['in a pond', 'in a tree', 'in a box'], correctIndex: 0 },
  },
  {
    target_word: 'bear', tier: 3, title: 'The Sleepy Bear',
    sentences: [
      'This is a bear.', 'The bear is big and brown.', 'It walks in the forest.',
      'The bear looks for some honey.', 'It finds a tree full of honey.', 'The bear eats the sweet honey.',
      'Now the bear feels very sleepy.', 'It goes to sleep in its cave.',
    ],
    comprehension_question: { question: 'What did the bear eat?', choices: ['honey', 'fish', 'bread'], correctIndex: 0 },
  },
  {
    target_word: 'ball', tier: 3, title: 'Play Ball!',
    sentences: [
      'This is a ball.', 'The ball is round and red.', 'A boy kicks the ball.',
      'The ball rolls across the grass.', 'A dog runs after the ball.', 'The dog brings the ball back.',
      'The boy laughs and claps.', 'They play ball all day.',
    ],
    comprehension_question: { question: 'Who brought the ball back?', choices: ['the dog', 'the cat', 'the bird'], correctIndex: 0 },
  },
  {
    target_word: 'book', tier: 3, title: 'A Story Book',
    sentences: [
      'This is a book.', 'The book has a blue cover.', 'A girl opens the book.',
      'She sees pictures of animals.', 'The girl reads about a lion.', 'Then she reads about a whale.',
      'The girl smiles at the pictures.', 'She reads the book again.',
    ],
    comprehension_question: { question: 'What does the girl read about?', choices: ['animals', 'cars', 'weather'], correctIndex: 0 },
  },
  {
    target_word: 'cup', tier: 3, title: 'A Cup of Milk',
    sentences: [
      'This is a cup.', 'The cup is yellow and small.', 'A boy fills the cup with milk.',
      'He carries the cup carefully.', 'The boy takes a big sip.', 'The milk is cold and yummy.',
      'He drinks until the cup is empty.', 'The boy washes his cup.',
    ],
    comprehension_question: { question: 'What was in the cup?', choices: ['milk', 'juice', 'water'], correctIndex: 0 },
  },
];

function vocabularyUsed(sentences) {
  const words = new Set();
  for (const s of sentences) {
    for (const w of s.toLowerCase().replace(/[^a-z' ]/g, '').split(' ')) {
      if (w) words.add(w);
    }
  }
  return [...words];
}

async function main() {
  for (const story of STORIES) {
    const row = { ...story, vocabulary_used: vocabularyUsed(story.sentences) };
    const { error } = await supabase.from('story_catalog').upsert(row, { onConflict: 'target_word,tier' });
    if (error) {
      console.error(`FAILED ${story.target_word} tier ${story.tier}:`, error.message);
    } else {
      console.log(`Seeded: ${story.target_word} (tier ${story.tier}) — "${story.title}"`);
    }
  }
}

main();
