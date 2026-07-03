-- wordart-batch-1, Unit 3 — swim, dance, sing now have real WordArt
-- illustrations. Kept in sync with src/components/wordArtManifest.json.

update public.words set has_art = true where word in (
  'swim', 'dance', 'sing'
);
