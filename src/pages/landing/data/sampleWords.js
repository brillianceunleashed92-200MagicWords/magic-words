// Small representative sample pulled from the real WORDS set in App.jsx,
// used only for the landing page's word-rise sequence and method explainer.
// No `emoji` field — WordRise.jsx (the only consumer) only ever renders
// `word`, so a per-word emoji here would be dead data that just happens to
// carry a literal emoji character in source. Removed rather than left
// inert, per the round-2 rule that any file on a live route may not
// contain an emoji character at all, used or not.
export const CONTENT_WORDS = [
  { word: "cat" },
  { word: "run" },
  { word: "big" },
  { word: "jump" },
  { word: "dog" },
];

export const NON_CONTENT_WORDS = [
  { word: "the" },
  { word: "is" },
  { word: "and" },
  { word: "you" },
  { word: "on" },
];
