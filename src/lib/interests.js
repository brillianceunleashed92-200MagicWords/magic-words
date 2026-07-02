// Moderated interest list for the child-creation flow (blueprint 3.2 "The
// Memory Layer" + Story Engine theme matching). Fixed list only — no
// free-form text input from/about a child, per the AI Safety Rules
// ("no child PII to AI providers").
export const INTERESTS = [
  { id: 'dinosaurs', label: 'Dinosaurs', emoji: '🦕' },
  { id: 'space', label: 'Space', emoji: '🚀' },
  { id: 'animals', label: 'Animals', emoji: '🐾' },
  { id: 'princesses', label: 'Princesses', emoji: '👑' },
  { id: 'superheroes', label: 'Superheroes', emoji: '🦸' },
  { id: 'cars_trucks', label: 'Cars & Trucks', emoji: '🚗' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'bugs', label: 'Bugs', emoji: '🐛' },
  { id: 'magic', label: 'Magic', emoji: '✨' },
];

export const MAX_INTERESTS = 3;
