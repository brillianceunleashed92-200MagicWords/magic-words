// Shared lesson-player palette, extracted out of GameEngine.jsx for the
// same Fast Refresh reason as gameAudio.js (a component file can't also
// export plain values).
//
// Previously mapped to the old dawn-gradient tokens (design-system/tokens.js)
// — a real, currently-shipping inconsistency: every other Candy Galaxy
// screen (Home/Galaxy/GrownUps/Login) already runs on the candy token
// system (theme/tokens.js), but the lesson player PlayScreen.jsx actually
// renders was still on the pre-Candy-Galaxy palette. Single change point,
// same technique as the earlier dawn-gradient migration described in
// CLAUDE.md Phase 5a — remapped here, propagates everywhere `T` is used.
//
// WordMatch/WordHunt/RhymeTime/FlashCardChallenge/StoryBuilder (the 5 named
// Candy Galaxy activities) were rewritten directly against theme/tokens.js
// during the E2 rebuild and no longer read `T` — this object now mainly
// serves SoundMatch/SpellItOut/SessionComplete/UpgradeModal/
// GameTypeSelector, which weren't part of that rebuild's scope.
import { colors as candy } from '../theme/tokens';

export const T = {
  bg:      candy.cloud,
  teal:    candy.mint,
  gold:    candy.sun,
  coral:   candy.tang, // "energetic accent", not an error color — see docs/DESIGN_BRIEF.md §7 (no red error states)
  pink:    candy.bubble,
  purple:  candy.sky,
  white:   candy.ink,
  muted:   `${candy.ink}99`,
  card:    `${candy.ink}0a`,
  cardHov: `${candy.ink}1a`,
  border:  `${candy.ink}1f`,
  correct: candy.mint,
  wrong:   candy.tang,
};
