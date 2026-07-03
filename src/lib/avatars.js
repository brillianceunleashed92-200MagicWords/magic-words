// Fixed avatar picks for child profiles — same convention as the legacy
// AVATARS list (App.jsx), just relocated so both the new and old trees
// can share it.
//
// `emoji` is a *legacy* identifier: existing child_profiles rows already
// persist one of these as their `avatar` text value from before this file
// existed, so AvatarIcon's lookup (components/icons/AvatarGlyphs.jsx) still
// needs the exact string to recognize old rows and map them to the right
// glyph — but it must never render as a literal character. Written as
// unicode escapes rather than the literal glyph so no emoji character
// exists in source (per docs/DESIGN_BRIEF.md §7), while the runtime string
// value is byte-identical to what's already in the database. New child
// profiles are keyed by `id` only (see ChildOnboardingScreen.jsx) — this
// legacy field never grows.
export const AVATARS = [
  { id: 'rocket', emoji: '\u{1F680}', name: 'Rocket Kid' },
  { id: 'alien', emoji: '\u{1F47E}', name: 'Space Alien' },
  { id: 'star', emoji: '\u{1F31F}', name: 'Star' },
  { id: 'fox', emoji: '\u{1F98A}', name: 'Space Fox' },
  { id: 'frog', emoji: '\u{1F438}', name: 'Galaxy Frog' },
  { id: 'lion', emoji: '\u{1F981}', name: 'Cosmic Lion' },
  { id: 'dog', emoji: '\u{1F436}', name: 'Astro Pup' },
  { id: 'cat', emoji: '\u{1F431}', name: 'Moon Cat' },
];
