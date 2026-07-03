-- wordart-batch-1, Unit 4 — sleep, sit now have real WordArt
-- illustrations (the only 2 Unit-4 words judged unambiguously depictable
-- at 2x2-tile scale — see docs/wordart-batch-1-depictability.md).

update public.words set has_art = true where word in (
  'sleep', 'sit'
);
