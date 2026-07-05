import { IconSpeaker, IconSearch, IconBook, IconMic, IconSpark, IconTrophy } from '../components/icons';
import { InterestMusic, InterestArt } from '../components/icons/InterestGlyphs';
import { RHYME_MAP } from '../games/GameEngine';

// Single source of truth for the 11 Candy Galaxy activities — moved out of
// PlayScreen.jsx (which used to declare this array inline with zero
// eligibility logic) so the guided path and the activity picker it
// replaces can't drift on labels/icons.
//
// `rank` is the fixed pedagogical sequencing order for Option B's guided
// path (mission: receptive -> productive), consumed by getEligibleActivities
// below. It is NOT a difficulty signal — src/lib/difficultyGovernor.js
// remains the only source for "recommended" activity, surfaced as a
// secondary annotation rather than reordering the path (see
// docs/OPTION_B_BUILD_REPORT.md's Decisions log for why).
export const ACTIVITY_DEFS = [
  { id: 'word_match',    label: 'Tap & Hear',      Icon: IconSpeaker,  rank: 1 },
  { id: 'word_hunt',     label: 'Word Hunt',       Icon: IconSearch,   rank: 2 },
  { id: 'rhyme_time',    label: 'Match & Sort',    Icon: InterestMusic, rank: 3 },
  // Prompt 6: replaces Word Song (a Web Speech "chant" placeholder with no
  // real task — always reported correct:true). Find the Word is Dr.
  // Blank's own technique: hear the whole word, find it among look-alikes.
  { id: 'find_the_word', label: 'Find the Word',   Icon: InterestMusic, rank: 4 },
  { id: 'flash_cards',   label: 'Quiz Boss',       Icon: IconTrophy,   rank: 5 },
  { id: 'story_time',    label: 'Story Time',      Icon: IconBook,     rank: 6 },
  { id: 'story_builder', label: 'Fill the Story',  Icon: IconBook,     rank: 7 },
  { id: 'word_builder',  label: 'Word Builder',    Icon: IconSpark,    rank: 8 },
  { id: 'say_it',        label: 'Say It with Nova', Icon: IconMic,     rank: 9 },
  { id: 'draw_it',       label: 'Draw It',         Icon: InterestArt,  rank: 10 },
  // Prompt 6: Magic Video cut entirely — non-functional stub, never had
  // real produced video content, removed from the rotation rather than
  // left as permanent placeholder theater.
];

// Picture-matching activities (Tap & Hear / Word Hunt) may only ever be
// offered for a word with a real WordArt illustration — mirrors the exact
// has_art gate already proven correct server-side (api/session-
// generator.js's buildQuiz) and client-side (useSessionPlan.js's
// buildLocalQuiz, GameEngine.jsx's PICTURE_MATCH_GAME_TYPES filter). A
// function word or an unillustrated content word rendered as "the picture
// of X" is pedagogically wrong and visually degrades to a text chip
// pretending to be a photo.
const PICTURE_ACTIVITY_IDS = new Set(['word_match', 'word_hunt']);

// Match & Sort (RhymeTime) requires the word to actually have a rhyme
// entry — confirmed by reading GameEngine.jsx's RhymeTime component
// directly: it renders nothing (`if (!rhymeAnswer) return null`) for a
// word with no RHYME_MAP entry, regardless of has_art. This is a tighter,
// more correct gate than has_art for this one activity.
function hasRhyme(word) {
  return Object.prototype.hasOwnProperty.call(RHYME_MAP, word);
}

// Draw It has no image/rhyme dependency (confirmed via DrawIt.jsx — just
// "Draw a {word}!" text + audio), but a function word ("the", "is") isn't
// something a child can meaningfully draw.
function isDrawable(wordType) {
  return wordType !== 'function';
}

// Returns the ordered subset of ACTIVITY_DEFS valid for this word, given
// `{ word, word_type, has_art }` (the shape useWordsQuery/useCandyGalaxyData
// now provides after word_type/has_art were added to its select list).
export function getEligibleActivities(word) {
  if (!word) return [];
  const { word: w, word_type: wordType, has_art: hasArt } = word;

  return ACTIVITY_DEFS.filter((a) => {
    if (PICTURE_ACTIVITY_IDS.has(a.id)) return wordType !== 'function' && !!hasArt;
    if (a.id === 'rhyme_time') return hasRhyme(w);
    if (a.id === 'draw_it') return isDrawable(wordType);
    return true; // story_builder, flash_cards, word_builder, story_time, find_the_word (full 200-word manifest coverage — see findTheWordManifest.js), say_it
  }).sort((a, b) => a.rank - b.rank);
}
