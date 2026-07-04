-- wordart-batch-2, Unit 9 — bed, chair, door, house, car, bus, hat, shoe,
-- phone, light, clock, table now have real WordArt illustrations (the
-- full real Unit 9 word set, all concrete/unambiguous — see
-- docs/wordart-batch-2-depictability.md). Kept in sync with
-- src/components/wordArtManifest.json (scripts/check-wordart-sync.mjs
-- checks WordArt.jsx's REGISTRY against that manifest on every build).

update public.words set has_art = true where word in (
  'bed', 'chair', 'door', 'house', 'car', 'bus', 'hat', 'shoe', 'phone', 'light', 'clock', 'table'
);
