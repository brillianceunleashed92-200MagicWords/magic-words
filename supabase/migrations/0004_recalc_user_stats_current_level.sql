-- Candy Galaxy v2 — recalculate user_stats.current_level under the 24-tier
-- level table (src/lib/levels.js), closing the migration blocker flagged in
-- docs/mlc-engine-audit.md section 2 / CLAUDE.md's "Phase 5b progress" item 1:
-- current_level was written under the OLD 8-tier table for any account that
-- earned XP before the 24-tier remap shipped (confirmed live: the
-- brillianceunleashed92@gmail.com account has total_xp=185, current_level=2
-- under the old table, which recalculates to level 3 under the new one).
--
-- Low blast radius: current_level is a write-mostly denormalized cache — the
-- app always recomputes level fresh from total_xp via getLevelInfo() for
-- display (src/lib/useCandyGalaxyData.js, src/App.jsx), never reads the
-- stored column back for the UI. This UPDATE makes the stored value match
-- what the app already shows on screen, rather than changing what any user
-- sees.
--
-- Idempotent / re-runnable: recomputes from total_xp every time, doesn't
-- depend on the row's current state.

with levels(level, min_xp) as (
  values
    (1,  0),    (2,  60),   (3,  140),  (4,  240),  (5,  360),
    (6,  500),  (7,  660),  (8,  840),  (9,  1040), (10, 1260),
    (11, 1500), (12, 1760), (13, 2040), (14, 2340), (15, 2660),
    (16, 3000), (17, 3400), (18, 3850), (19, 4350), (20, 4900),
    (21, 5500), (22, 6150), (23, 6850), (24, 7600)
)
update public.user_stats us
set current_level = (
  select max(l.level)
  from levels l
  where l.min_xp <= us.total_xp
),
    updated_at = now()
where current_level <> (
  select max(l.level)
  from levels l
  where l.min_xp <= us.total_xp
);
