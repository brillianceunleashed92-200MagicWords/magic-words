// Moderated interest list for the child-creation flow (blueprint 3.2 "The
// Memory Layer" + Story Engine theme matching). Fixed list only — no
// free-form text input from/about a child, per the AI Safety Rules
// ("no child PII to AI providers").
//
// Rendered via <InterestIcon id={i.id}> (components/icons/InterestGlyphs.jsx)
// — no emoji field here; interests are stored/keyed by `id` only, no
// backward-compat data constraint like avatars.js has.
export const INTERESTS = [
  { id: 'dinosaurs', label: 'Dinosaurs' },
  { id: 'space', label: 'Space' },
  { id: 'animals', label: 'Animals' },
  { id: 'princesses', label: 'Princesses' },
  { id: 'superheroes', label: 'Superheroes' },
  { id: 'cars_trucks', label: 'Cars & Trucks' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'sports', label: 'Sports' },
  { id: 'music', label: 'Music' },
  { id: 'art', label: 'Art' },
  { id: 'bugs', label: 'Bugs' },
  { id: 'magic', label: 'Magic' },
];

export const MAX_INTERESTS = 3;
