-- wordart-batch-1, Unit 5 — small, happy, hot, cold, fast, slow now have
-- real WordArt illustrations. This completes the free-tier batch
-- (Units 1-5) — all 27 words judged DEPICTABLE in
-- docs/wordart-batch-1-depictability.md now have art.

update public.words set has_art = true where word in (
  'small', 'happy', 'hot', 'cold', 'fast', 'slow'
);
