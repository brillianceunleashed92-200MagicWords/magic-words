// Id -> display label for the 10 Candy Galaxy activities, extracted out of
// activityDefs.js (docs/FEAT_PARENT_METRICS_R1.md rule 2) so parent-metrics
// chart derivations — and a plain Node/Playwright test — can read activity
// labels without importing activityDefs.js's icon components and
// GameEngine.jsx (RHYME_MAP) dependency chain, neither of which is
// Node-loadable. activityDefs.js imports from here, not the other way
// around — this file is the single source of truth for id -> label.
export const ACTIVITY_LABELS = {
  word_match: 'Tap & Hear',
  word_hunt: 'Word Hunt',
  rhyme_time: 'Match & Sort',
  find_the_word: 'Find the Word',
  flash_cards: 'Quiz Boss',
  story_time: 'Story Time',
  story_builder: 'Fill the Story',
  word_builder: 'Word Builder',
  say_it: 'Say It with Nova',
  draw_it: 'Draw It',
};
