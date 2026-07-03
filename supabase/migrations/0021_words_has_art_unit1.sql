-- wordart-batch-1, Unit 1 — fish, bear, ball, book, cup now have real
-- WordArt illustrations. Kept in sync with
-- src/components/wordArtManifest.json (scripts/check-wordart-sync.mjs
-- checks WordArt.jsx's REGISTRY against that manifest on every build).

update public.words set has_art = true where word in (
  'fish', 'bear', 'ball', 'book', 'cup'
);
