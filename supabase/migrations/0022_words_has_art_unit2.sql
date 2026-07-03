-- wordart-batch-1, Unit 2 — horse, lion, rabbit, duck, cow, pig, turtle,
-- monkey, shark, ant, bee now have real WordArt illustrations. Kept in
-- sync with src/components/wordArtManifest.json.

update public.words set has_art = true where word in (
  'horse', 'lion', 'rabbit', 'duck', 'cow', 'pig', 'turtle', 'monkey', 'shark', 'ant', 'bee'
);
