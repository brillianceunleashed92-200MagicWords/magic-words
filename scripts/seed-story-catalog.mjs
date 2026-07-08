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
    comprehension_question: { question: 'Where did the dog run?', choices: ['park', 'pool', 'house'], correctIndex: 0 },
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
    comprehension_question: { question: 'Where does the fish live?', choices: ['pond', 'tree', 'box'], correctIndex: 0 },
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
  // Unit 2 (free tier) — same tier-3 shape, extending catalog coverage
  // toward the mission's 20-50 target after the sample-review sign-off.
  {
    target_word: 'ant', tier: 3, title: 'The Busy Ant',
    sentences: [
      'This is an ant.', 'The ant is tiny and black.', 'It walks under a big leaf.',
      'The ant finds a piece of bread.', 'It carries the bread to its home.', 'Other ants come to help.',
      'They all work together.', 'Now the ants share a happy meal.',
    ],
    comprehension_question: { question: 'What did the ant find?', choices: ['bread', 'a shoe', 'a rock'], correctIndex: 0 },
  },
  {
    target_word: 'bee', tier: 3, title: 'The Busy Bee',
    sentences: [
      'This is a bee.', 'The bee is yellow and black.', 'It flies from flower to flower.',
      'The bee collects sweet nectar.', 'It flies back to the hive.', 'The bee makes golden honey.',
      'All the bees share the honey.', 'The bee buzzes a happy tune.',
    ],
    comprehension_question: { question: 'What does the bee make?', choices: ['honey', 'milk', 'juice'], correctIndex: 0 },
  },
  {
    target_word: 'cow', tier: 3, title: 'The Gentle Cow',
    sentences: [
      'This is a cow.', 'The cow is black and white.', 'It stands in a green field.',
      'The cow eats soft green grass.', 'It walks to a cool pond.', 'The cow takes a long drink.',
      'Then it rests under a tree.', 'The cow is calm and happy.',
    ],
    comprehension_question: { question: 'Where did the cow drink water?', choices: ['a pond', 'a cup', 'a box'], correctIndex: 0 },
  },
  {
    target_word: 'duck', tier: 3, title: 'The Happy Duck',
    sentences: [
      'This is a duck.', 'The duck is yellow and small.', 'It swims in a calm pond.',
      'The duck paddles with its feet.', 'It quacks at its duck friends.', 'They all swim in a line.',
      'The duck finds a piece of bread.', 'It happily eats its snack.',
    ],
    comprehension_question: { question: 'Where did the duck swim?', choices: ['a pond', 'a tree', 'a box'], correctIndex: 0 },
  },
  {
    target_word: 'frog', tier: 3, title: 'The Jumping Frog',
    sentences: [
      'This is a frog.', 'The frog is green and small.', 'It sits on a lily pad.',
      'The frog sees a little fly.', 'It jumps high into the air.', 'The frog catches the fly.',
      'Then it jumps back to the pad.', 'The frog croaks a happy sound.',
    ],
    comprehension_question: { question: 'What did the frog catch?', choices: ['a fly', 'a ball', 'a leaf'], correctIndex: 0 },
  },
  {
    target_word: 'horse', tier: 3, title: 'The Fast Horse',
    sentences: [
      'This is a horse.', 'The horse is brown and tall.', 'It stands in a big field.',
      'The horse likes to run fast.', 'It gallops across the grass.', 'The wind blows through its mane.',
      'The horse stops by a fence.', 'It rests after a fun run.',
    ],
    comprehension_question: { question: 'Where did the horse run?', choices: ['a field', 'a lake', 'a house'], correctIndex: 0 },
  },
  {
    target_word: 'lion', tier: 3, title: 'The Proud Lion',
    sentences: [
      'This is a lion.', 'The lion is golden and strong.', 'It rests under a warm sun.',
      'The lion has a big fluffy mane.', 'It stands up and stretches.', 'The lion lets out a big roar.',
      'Other animals hear the sound.', 'Then the lion naps in the shade.',
    ],
    comprehension_question: { question: 'What sound does the lion make?', choices: ['a roar', 'a quack', 'a buzz'], correctIndex: 0 },
  },
  {
    target_word: 'monkey', tier: 3, title: 'The Playful Monkey',
    sentences: [
      'This is a monkey.', 'The monkey is brown and quick.', 'It swings from tree to tree.',
      'The monkey finds a ripe banana.', 'It peels the banana with its hands.', 'The monkey eats the yellow banana.',
      'Then it swings to see its friends.', 'They all play together happily.',
    ],
    comprehension_question: { question: 'What did the monkey eat?', choices: ['a banana', 'an apple', 'bread'], correctIndex: 0 },
  },
  {
    target_word: 'pig', tier: 3, title: 'The Muddy Pig',
    sentences: [
      'This is a pig.', 'The pig is pink and round.', 'It lives on a sunny farm.',
      'The pig finds a puddle of mud.', 'It rolls around in the mud.', 'The mud keeps the pig cool.',
      'The pig oinks a happy sound.', 'Then it naps in the warm sun.',
    ],
    comprehension_question: { question: 'Where did the pig roll around?', choices: ['mud', 'pond', 'box'], correctIndex: 0 },
  },
  {
    target_word: 'rabbit', tier: 3, title: 'The Quick Rabbit',
    sentences: [
      'This is a rabbit.', 'The rabbit is white and soft.', 'It hops through a green garden.',
      'The rabbit finds a fresh carrot.', 'It nibbles the crunchy carrot.', 'Then the rabbit hears a sound.',
      'It hops quickly to its burrow.', 'The rabbit feels safe and happy.',
    ],
    comprehension_question: { question: 'What did the rabbit eat?', choices: ['a carrot', 'a banana', 'bread'], correctIndex: 0 },
  },
  {
    target_word: 'shark', tier: 3, title: 'The Big Shark',
    sentences: [
      'This is a shark.', 'The shark is gray and big.', 'It swims in the deep blue sea.',
      'The shark glides past the coral.', 'It sees a school of small fish.', 'The shark swims along beside them.',
      'Then it swims down to the ocean floor.', 'The shark rests near the rocks.',
    ],
    comprehension_question: { question: 'Where does the shark swim?', choices: ['the sea', 'a pond', 'a cup'], correctIndex: 0 },
  },
  {
    target_word: 'turtle', tier: 3, title: 'The Slow Turtle',
    sentences: [
      'This is a turtle.', 'The turtle is green with a hard shell.', 'It walks slowly on the sand.',
      'The turtle moves toward the water.', 'It swims into the calm sea.', 'The turtle glides through the waves.',
      'It finds a cozy rock to rest.', 'The turtle naps in the warm sun.',
    ],
    comprehension_question: { question: 'Where did the turtle walk?', choices: ['sand', 'house', 'road'], correctIndex: 0 },
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
