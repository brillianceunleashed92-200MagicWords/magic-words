// Full-sentence TTS carrier prompt for a quiz, tailored to the game type.
// Extracted out of GameEngine.jsx into its own module so activity
// components that live in separate files (FindTheWord, SayItWithNova, etc.)
// can import it without creating a circular import back into
// GameEngine.jsx (which imports them). Used both to warm the audio cache
// at session start and to play the live prompt in-game, so the cached
// text key always matches what's actually spoken (no re-fetch delay, no
// cache-miss mismatch) — every activity component calls this instead of
// building its own text, specifically because a single `quiz` object gets
// reused across whichever activity the child picks, so the carrier
// sentence can only be chosen once the gameType is known, not baked into
// the quiz at build time.
//
// Isolated single-word TTS is what makes this app's narration sound
// robotic — wrapping the word in a short carrier sentence (varied per
// activity, matching what that activity actually asks the child to do)
// both sounds more natural (sentence prosody) and is better Blank-method
// pedagogy (words heard in context, not in isolation). The target word
// stays clearly audible — quoted and prominent — in every template below,
// so this isn't "burying the word," just not saying it in a vacuum.
//
// Deliberately NOT changed: word_hunt and rhyme_time already ask a real
// question. word_hunt's specifically does NOT say the target word — the
// whole task is matching an unlabeled picture to its word among 4 text
// options, so naming the word aloud would hand the child the answer.
// story_builder's carrier likewise omits the target word for the same
// reason (it's the fill-in-the-blank answer).
export function getPromptText(quiz, gameType) {
  if (!quiz) return null;
  const word = quiz.word;
  const isFunction = (quiz.wordClass ?? 'noun') === 'function';
  switch (gameType) {
    case 'word_hunt':     return 'Which word matches this picture?';
    case 'rhyme_time':    return `Which word rhymes with ${word}?`;
    // Tap & Hear — the word is already shown on screen ("Tap the picture
    // of X"), so saying it aloud aids pronunciation/verbal imitation
    // without giving anything away.
    case 'word_match':    return `This word says "${word}". Can you find its picture?`;
    // Quiz Boss — spoken only when the child taps to reveal (see
    // FlashCardChallenge's handleReveal), i.e. only after they've already
    // chosen to see the word, so saying it here is the reveal itself.
    case 'flash_cards':   return isFunction ? `This word is "${word}".` : `This word says "${word}".`;
    // Fill the Story — deliberately generic: the target word is the
    // blank's answer, so naming it in the prompt would defeat the task.
    case 'story_builder': return 'Which word finishes the sentence?';
    case 'word_builder':  return `Can you spell "${word}"?`;
    case 'draw_it':       return `Let's trace "${word}"!`;
    // Find the Word — the deliberate exception to this file's own
    // carrier-sentence convention: the question audio IS the target word,
    // spoken in isolation (Blank's whole-word look-alike discrimination
    // technique). Wrapping it in a sentence would bury the exact signal
    // the child needs to match against the tiles.
    case 'find_the_word': return word;
    case 'story_time':    return `Let's read a story about "${word}"!`;
    case 'say_it':        return `Can you say "${word}"?`;
    default:              return word;
  }
}
