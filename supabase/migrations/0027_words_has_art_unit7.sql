-- wordart-batch-2, Unit 7 — apple, milk, cookie, cake, pizza, bread, egg,
-- water, soup, juice, banana, grapes now have real WordArt illustrations
-- (the full real Unit 7 word set, all concrete/unambiguous — see
-- docs/wordart-batch-2-depictability.md). Kept in sync with
-- src/components/wordArtManifest.json (scripts/check-wordart-sync.mjs
-- checks WordArt.jsx's REGISTRY against that manifest on every build).

update public.words set has_art = true where word in (
  'apple', 'milk', 'cookie', 'cake', 'pizza', 'bread', 'egg', 'water', 'soup', 'juice', 'banana', 'grapes'
);
