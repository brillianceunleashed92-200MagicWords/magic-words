// Candy Galaxy design tokens — extracted verbatim from docs/mockup-D-candy-galaxy.html
// (the approved v2 visual spec). Single change point: restyle the app by editing here.

export const colors = {
  sky: '#5B4BD6',
  skyDeep: '#3D2FA8',
  skyNight: '#2B2080',
  sun: '#FFC531',
  mint: '#3EE0B8',
  bubble: '#FF6FA5',
  tang: '#FF8A4C',
  cloud: '#FFFFFF',
  ink: '#2A2160',

  // Derived / supporting tones lifted from the mockup's inline styles —
  // kept alongside the 9 locked brand colors above, not a separate palette.
  mutedInk: '#6E67A3',
  mutedInkLight: '#8B84BD',
  fireText: '#5A2A00',
  starText: '#5C4200',
  gemText: '#00543E',
  mintDeep: '#00432F',
  bubbleFlagText: '#4A2000',
};

export const skyGradient = `linear-gradient(180deg, ${colors.sky} 0%, ${colors.skyDeep} 55%, ${colors.skyNight} 100%)`;

// WordArt illustration palette — extracted verbatim from docs/mockup-E2-no-emoji.html's
// style-reference strip (the 4 locked animals). Every WordArt.jsx illustration follows the
// same fill/outline/inner triad relationship: outline is a darker shade of fill, inner/accent
// is a pale tint. See docs/DESIGN_BRIEF.md §1 for the full table.
export const wordArtColors = {
  dogFill: '#FFB84D', dogOutline: '#A66A1B', dogInner: '#FFF1D6',
  catFill: '#FF8A4C', catOutline: '#B35A28', catInner: '#FFD9BE',
  birdFill: '#5EC8F2', birdOutline: '#2E86AB', birdInner: '#CDEFFF',
  frogFill: '#3EE0B8', frogOutline: '#1C8C6C', frogInner: '#D6FFF3',
  buddyFill: '#FFC531', buddyOutline: '#B8890A', buddyInner: '#FFF1D6',
  blush: '#FF8FA8', dot: '#2A2160',
  // wordart-batch-1, Unit 1 (fish, bear, ball, book, cup)
  fishFill: '#4DD4E8', fishOutline: '#1B7A8C', fishInner: '#D6F7FC',
  bearFill: '#C98A52', bearOutline: '#7A4E24', bearInner: '#F0DAC0',
  ballFill: '#FF6FA5', ballOutline: '#B8285F', ballInner: '#FFD6E8',
  bookFill: '#6B5CE0', bookOutline: '#3F35A0', bookInner: '#E0DCFF',
  cupFill: '#8BC34A', cupOutline: '#4F7A1E', cupInner: '#E4F5D0',
  // wordart-batch-1, Unit 2 (horse, lion, rabbit, duck, cow, pig, turtle, monkey, shark, ant, bee)
  horseFill: '#B5794A', horseOutline: '#6B4423', horseInner: '#EFDBC2',
  lionFill: '#E8A33D', lionOutline: '#8A5A12', lionInner: '#FBE3B0',
  rabbitFill: '#D8D4E8', rabbitOutline: '#7A729E', rabbitInner: '#F2F0FA',
  duckFill: '#FFD93D', duckOutline: '#B8930A', duckInner: '#FFF6D0',
  cowFill: '#F5F0E8', cowOutline: '#8A8478', cowInner: '#4A4038',
  pigFill: '#FFAEC0', pigOutline: '#B85F76', pigInner: '#FFE3EA',
  turtleFill: '#6FCF7A', turtleOutline: '#2E7D38', turtleInner: '#DFF5E0',
  monkeyFill: '#C99B6B', monkeyOutline: '#7A5730', monkeyInner: '#F2E4D0',
  sharkFill: '#8FA3C4', sharkOutline: '#4A5D80', sharkInner: '#E2E8F5',
  antFill: '#5C4A38', antOutline: '#2E2318', antInner: '#A8927C',
  beeFill: '#FFC531', beeOutline: '#8F6A0A', beeInner: '#3A3228',
  // wordart-batch-1, Unit 5 (small, hot, cold, happy, fast, slow) — hot
  // reuses the cat/tang warm palette, cold reuses the bird cool palette
  // (same mug silhouette, temperature read via color+steam/ice, not a
  // second unrelated hex triad); snail (slow) gets its own.
  snailFill: '#A8C64A', snailOutline: '#5C7A1E', snailInner: '#E8F2C8',
};

export const fonts = {
  display: "'Baloo 2', sans-serif",
  body: "'Quicksand', sans-serif",
};

export const fontWeights = {
  displayMin: 600,
  displayMax: 800,
  bodyMin: 500,
  bodyMax: 700,
};

// Chunky 3D-shadow signature element — buttons/cards physically depress
// on press (see primitives/ChunkyButton.jsx, CloudCard.jsx).
export const shadows = {
  chunk: '0 8px 0 rgba(0,0,0,.16)',
  chunkSm: '0 6px 0 rgba(0,0,0,.14)',
  chunkLg: '0 10px 0 rgba(0,0,0,.2)',
  chunkPill: '0 5px 0 rgba(0,0,0,.15)',
};

// Accessibility floor per master prompt: 64px minimum touch target.
export const touchTarget = 64;

export const radii = {
  sm: 20,
  md: 26,
  lg: 32,
  xl: 34,
  pill: 100,
};

export const tokens = { colors, skyGradient, fonts, fontWeights, shadows, touchTarget, radii };
export default tokens;
