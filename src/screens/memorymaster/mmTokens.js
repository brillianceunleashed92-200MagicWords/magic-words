// MEMORY_MASTER_R1 Phase 4 -- reuses the app's locked Candy Galaxy tokens
// (src/theme/tokens.js) exactly; adds a small set of derived neutral tones
// (paper/line/muted) local to this module only, matching
// mockup-P-memory-master.html's own --paper/--line/--muted values, which
// were themselves already derived from these same 9 brand colors. Not
// added to the shared tokens.js since they're specific to this flagged,
// not-yet-shipped module.
import { colors as base, fonts, fontWeights, shadows, radii, touchTarget, skyGradient } from '../../theme/tokens';

export const colors = {
  ...base,
  paper: '#F7F5FF',
  line: '#D8D2F5',
  muted: '#8A83C0',
};

export { fonts, fontWeights, shadows, radii, touchTarget, skyGradient };
