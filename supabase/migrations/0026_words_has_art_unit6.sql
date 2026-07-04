-- wordart-batch-2, Unit 6 — baby, boy, girl, man, woman now have real
-- WordArt illustrations. mom, dad, friend deliberately NOT included —
-- see docs/wordart-batch-2-depictability.md (each would collide with
-- woman/man/either, no independent visual signal). Kept in sync with
-- src/components/wordArtManifest.json (scripts/check-wordart-sync.mjs
-- checks WordArt.jsx's REGISTRY against that manifest on every build).

update public.words set has_art = true where word in (
  'baby', 'boy', 'girl', 'man', 'woman'
);
