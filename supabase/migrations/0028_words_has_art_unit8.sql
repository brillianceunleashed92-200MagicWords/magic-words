-- wordart-batch-2, Unit 8 — red, blue, green, yellow, orange, purple,
-- pink, black, white, brown, gray now have real WordArt illustrations
-- (abstract paint-drop swatches, own accurate hexes — see
-- docs/wordart-batch-2-depictability.md). `gold` deliberately NOT
-- included — collides with yellow in this flat illustration style (no
-- metallic/gradient rendering). Kept in sync with
-- src/components/wordArtManifest.json (scripts/check-wordart-sync.mjs
-- checks WordArt.jsx's REGISTRY against that manifest on every build).

update public.words set has_art = true where word in (
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray'
);
