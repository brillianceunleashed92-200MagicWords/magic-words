// Single source of truth for "can this word take -ing/-ed, and what's the
// correctly-spelled result" — used by WordBuilder.jsx (and anything else
// that needs to inflect a word) so this judgment call is made in exactly
// one place instead of drifting across components.
//
// Root cause this file fixes: WordBuilder.jsx used to pick a suffix from a
// hash of the word's characters with zero knowledge of whether the word
// was even a verb, producing real ones like "froging" (frog is a noun) and
// "doged" (dog is a noun). Word class alone isn't enough either — several
// of the actual verbs in this word list are irregular (eat→ate, fly→flew,
// run→ran, not eated/flied/runed), so offering "-ed" for them would
// reproduce the identical bug on a different set of words. Each verb
// below explicitly lists which suffixes produce a real inflected form,
// not just "is this a verb."
//
// Coverage: as of Sprint 2 Part B (word-list unification), sessions are
// generated from the real 200-word Supabase table, not the old 18-word
// hardcoded list this file used to be scoped to — so `quiz.word` in
// WordBuilder can now be any of the 200 curriculum words, most of which
// aren't in this map yet. That's a safe gap, not a wrong one: any word
// not listed here is treated as non-inflectable (the safe default is "no
// suffix," never a guess), so WordBuilder just offers fewer inflection
// options for words not yet classified here, rather than ever producing
// an invalid form. Expanding this map to the full 200 words is a
// follow-up, not required for word-selection correctness.

export const WORD_CLASS = {
  cat: 'noun', dog: 'noun', bird: 'noun', frog: 'noun',
  eat: 'verb', fly: 'verb', jump: 'verb', run: 'verb',
  big: 'adjective', sad: 'adjective',
  the: 'function', can: 'function', is: 'function', they: 'function',
  not: 'function', and: 'function', with: 'function', do: 'function',
};

// Only verbs appear here, and only with the suffixes that produce a real
// word for that specific verb (irregular past tense verbs are excluded
// from 'ed' rather than guessing a regular inflection).
const VALID_SUFFIXES = {
  eat: ['ing'],   // eating; irregular past "ate", not "eated"
  fly: ['ing'],   // flying; irregular past "flew", not "flied"/"flyed"
  run: ['ing'],   // running (CVC-doubled); irregular past "ran", not "runed"
  jump: ['ing', 'ed'], // jumping, jumped — regular verb, both are real words
};

const CONSONANTS = new Set('bcdfghjklmnpqrstvwxyz');
const VOWELS = new Set('aeiou');

// CVC (consonant-vowel-consonant) single-syllable check for doubling the
// final consonant before -ing/-ed (run→running, hop→hopping) — excludes
// w/x/y as the final consonant per standard English spelling rules.
function isCvcDoubling(word) {
  if (word.length < 3) return false;
  const [c2, v, c1] = [word.at(-3), word.at(-2), word.at(-1)];
  return CONSONANTS.has(c2) && VOWELS.has(v) && CONSONANTS.has(c1) && !'wxy'.includes(c1);
}

function gerund(verb) {
  if (verb.endsWith('e') && !verb.endsWith('ee')) return verb.slice(0, -1) + 'ing';
  if (isCvcDoubling(verb)) return verb + verb.at(-1) + 'ing';
  return verb + 'ing';
}

function pastTense(verb) {
  if (verb.endsWith('e')) return verb + 'd';
  if (isCvcDoubling(verb)) return verb + verb.at(-1) + 'ed';
  return verb + 'ed';
}

// Suffixes this specific word can take and still be a real word. Empty for
// anything that isn't a verb, or a verb with no regularly-inflectable form
// in our set (e.g. words not in VALID_SUFFIXES at all).
export function validSuffixesFor(word) {
  return VALID_SUFFIXES[word] ?? [];
}

// Deterministic per-word pick (not random-during-render, same purity
// concern as GrownUpsScreen's MathGate) from ['', ...validSuffixesFor(word)]
// — '' (base form only) is always a valid choice, so this never fails.
export function pickValidSuffix(word) {
  const options = ['', ...validSuffixesFor(word)];
  const sum = [...word].reduce((s, c) => s + c.charCodeAt(0), 0);
  return options[sum % options.length];
}

// The actual spelled-out inflected form. Throws in dev if asked for a
// suffix that isn't in this word's valid list — callers should always
// check validSuffixesFor()/pickValidSuffix() first; this is the same
// "fail loudly on a broken invariant" pattern as the Story Engine
// validator, not a normal control-flow path.
export function inflect(word, suffix) {
  if (!suffix) return word;
  if (!validSuffixesFor(word).includes(suffix)) {
    const msg = `[wordMorphology] "${word}" cannot take suffix "${suffix}" — not in its valid-suffix list. This would produce an invalid word.`;
    if (import.meta.env?.DEV) throw new Error(msg);
    console.error(msg);
    return word;
  }
  if (suffix === 'ing') return gerund(word);
  if (suffix === 'ed') return pastTense(word);
  return word;
}
