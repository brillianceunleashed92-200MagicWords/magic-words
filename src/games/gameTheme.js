// Shared lesson-player palette, extracted out of GameEngine.jsx for the
// same Fast Refresh reason as gameAudio.js (a component file can't also
// export plain values). Dense, low-motion lesson-player palette — Cloud
// surface per CLAUDE.md's dashboard/lesson-player token assignment. Comet
// Teal owns "correct"; Sunrise Coral is the energetic/attention accent
// (streaks, "wrong" feedback, CTAs) — not a fixed "correct = coral" rule,
// see CLAUDE.md token table.
import { colors as dawnTokens } from '../design-system/tokens';

export const T = {
  bg:      dawnTokens.cloud,
  teal:    dawnTokens.cometTeal,
  gold:    dawnTokens.marigold,
  coral:   dawnTokens.sunriseCoral,
  pink:    '#FF8B94',
  purple:  '#7B68EE',
  white:   dawnTokens.dawnIndigo,
  muted:   `${dawnTokens.dawnIndigo}99`,
  card:    `${dawnTokens.dawnIndigo}0a`,
  cardHov: `${dawnTokens.dawnIndigo}1a`,
  border:  `${dawnTokens.dawnIndigo}1f`,
  correct: dawnTokens.cometTeal,
  wrong:   dawnTokens.sunriseCoral,
};
