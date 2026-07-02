# MLC Engine Audit — `redesign/zentry-landing` (as of 45b92c1)

Written per MASTER_BUILD_PROMPT_v2.md pre-flight step 3. Purpose: inventory the
MLC lesson-engine logic that v2 ("Candy Galaxy") must **keep and re-skin, not
rewrite**. File/line references are to `redesign/zentry-landing` at the time
of this audit.

---

## 1. The 200-word data model (`src/App.jsx` ~17–245)

- `UNIT_NAMES` (17–23): 18 named vocabulary-topic units (Animals, Actions,
  Family, …) — an orthogonal axis to level/grammar-complexity.
- `WORDS` (25–245): **all 200 words already exist in-repo**, not just the 18
  demo words the master prompt worried about. Shape: `{ id, word, type:
  "content"|"function", unit, mastery, emoji }`. No `sort_order`, `definition`,
  `audio_url`, or `image_url` fields yet — those are new columns the `words`
  Supabase table needs to add.
- Word ids run 1–200 contiguously and already imply a stable sort order
  (insertion order === `sort_order`).
- **Verdict**: this is the authoritative content source for seeding
  Supabase's new `words` table. No placeholder rows needed — flag this as
  better than expected vs. the master prompt's contingency plan.

## 2. The 24-level progression (`src/App.jsx` 267–310)

- `LEVELS` array: 24 entries, each `{ level, minXP, title, emoji, stage }`.
  `title` = kid-facing celebratory name (Nova/space motif, e.g. "Two-Word
  Voyager"). `stage` = real MLC grammar milestone (e.g. "Two-word phrases",
  "Introducing 'I'", "Past tense", "Questions: yes/no", "Summarizing
  events") — confirmed 2026-06-19 as the real Blank arc, not an arbitrary
  point scale.
- `MAX_LEVEL = LEVELS.length` (301) — never hardcode `24`, read this.
- `getLevelInfo(xp)` (303+): linear scan for current bracket by `minXP`
  threshold; also returns `next` level for progress-bar math.
- **Known limitation carried forward**: level is still purely XP-gated. There
  is no curriculum-content-sequencing engine that changes *which* question
  templates appear per level — the 24 brackets are a display/progress-motif
  layer over the same XP total. Phase 1 of Candy Galaxy should preserve this
  same limitation (don't silently promise more than the engine does).
- **Confirmed live migration blocker** (see CLAUDE.md "Phase 5b progress"
  item 1 and `4f0a7c3`): a real production account
  (`brillianceunleashed92@gmail.com`) has `total_xp = 185` written under the
  old 8-tier table, which recalculates to a different level under the new
  24-tier table. **This is still unresolved** as of this audit — no migration
  SQL exists yet for `user_stats` rows with `total_xp > 0`. Carrying the same
  `LEVELS`/`getLevelInfo` logic into v2 does not fix or worsen this; it's an
  existing data problem independent of the UI rebuild. Flagging again here so
  it isn't lost a second time.

## 3. XP calculation & persistence (`src/games/GameEngine.jsx` ~1660–1745, `src/App.jsx` ~598–641)

- Per-question XP: 10 base + 5 first-try + 5 speed bonus, capped 20/question
  (exact formula lives inside the `GameEngine` component's answer handler,
  accumulated in `sessionXPRef`).
- Session-end bonus: `+20` flat + `+50` if perfect session (`GameEngine.jsx`
  ~1729).
- `onXP(totalSessionXP)` callback fires once per completed session →
  `App.jsx`'s `handleXP` (626–641): updates local `totalXP` state, computes
  old vs. new `getLevelInfo`, fires the level-up celebration if the level
  number increased, then persists via `saveXP` → `user_stats` upsert
  (`total_xp`, `current_level`, `updated_at`).
- **Sparks economy does not exist yet.** There is no `user_sparks` table, no
  spark-earning logic anywhere in this codebase — Sparks is entirely new
  ground for Phase 1, not a re-skin of an existing currency. XP and Sparks
  are two different, currently-unrelated systems; Phase 1 must decide how
  (or whether) Sparks earning ties to the same per-question answer event
  that currently drives XP (recommended default: yes, same event, separate
  ledger — see Phase 1 build report for the decision actually made).

## 4. Word mastery persistence (`src/App.jsx` ~643–720)

- `saveWordProgress(word, correct)`: reads existing `correct_count`/
  `attempt_count` from `word_progress`, increments, computes
  `mastery_score = round(correct_count/attempt_count * 100)`, upserts both
  `mastery_score` (new column) and `mastery` (legacy column, kept in sync
  for back-compat) plus `last_seen`.
- `handleProgress` in `App.jsx` (703+): optimistic local mastery update
  (+5 correct / -2 wrong) for instant UI feedback, then reconciles with the
  server-computed `mastery_score` once the upsert resolves.
- `word_progress` table (from `supabase/add_word_progress_counts.sql`)
  currently has: `mastery`, `correct_count`, `attempt_count`, `last_seen`,
  `mastery_score`. **No `next_review_at` or `review_interval_days` columns
  yet** — these are the new additive columns Star Keeper v1 needs (per
  master prompt SUPABASE section). Star Keeper is entirely new logic, same
  as Sparks — nothing to re-skin here, only a schema extension point.

## 5. MLC four-interaction-type bindings (`src/games/GameEngine.jsx` 1452–1465)

```
MLC_TYPES = {
  word_match:    'Following Commands',
  sound_match:   'Following Commands',
  word_hunt:     'Answering Questions',
  rhyme_time:    'Answering Questions',
  flash_cards:   'Verbal Imitation',      // no speech capture — "hear, self-rate" scaffold, not verified imitation
  story_builder: 'Sentence Completion',
  spell_it_out:  null,                    // doesn't cleanly fit, left unbound
}
```

This mapping is display-only (a small uppercase tag on `GameTypeSelector`
tiles) — it does not change game *mechanics* per type, only labels them.
Candy Galaxy's 5 named activities (Tap & Hear, Word Hunt, Fill the Story,
Match & Sort, Quiz Boss) need an explicit new mapping onto these existing
7 game components — recommended defaults, confirmed at build time:

| Candy Galaxy activity | Existing component | MLC type (unchanged) |
|---|---|---|
| Tap & Hear | `WordMatch` | Following Commands |
| Word Hunt | `WordHunt` | Answering Questions |
| Fill the Story | `StoryBuilder` | Sentence Completion |
| Match & Sort | `RhymeTime` (closest existing "discrimination" mechanic) | Answering Questions |
| Quiz Boss | `FlashCardChallenge` (unit mastery gate framing) | Verbal Imitation |

`SoundMatch` and `spell_it_out` are not in Phase 1's 5 named activities —
kept in the codebase, not deleted, just not surfaced in the new Play flow
yet (same "don't delete working games" caution as the rest of this audit).

## 6. Errorless-learning scaffold (`src/games/GameEngine.jsx` 443–653, `WordMatch` only)

- First wrong tap: does **not** complete the error. Wrong tile shakes
  (450ms) via `shaking`/`wrongTileIdx` state, then the correct tile gets a
  **persistent** highlight (`revealCorrect`, stays lit until answered — not
  a timed pulse) and the child can retry immediately. No overlay, no
  `onAnswer` call, no XP/mastery write on this first miss.
- Only a **second** miss on the same question lets the error complete
  (`FeedbackOverlay` shown, `onAnswer({correct:false, ...})` fires, session
  advances).
- Session-level hint: `showHint` prop (driven by `consecutiveWrong >= 1` in
  the parent `GameEngine`, `~1810`) pulses the correct tile on a *new*
  question before any tap happens.
- `onAnswer` contract, unchanged regardless of retry path: exactly one call
  per question, `{ correct, responseTimeMs, firstTry: true }` — the
  `firstTry: true` is a deliberate constant (see CLAUDE.md), not derived
  from whether a retry happened. **Do not change this shape** when
  re-skinning; XP/mastery math on the receiving end depends on it.
- **Scope limitation carried forward**: only `WordMatch` has this scaffold.
  `SoundMatch`, `WordHunt`, `RhymeTime`, `StoryBuilder` still use immediate
  right/wrong overlays with no retry step. `FlashCardChallenge` is
  self-rated (no right/wrong state to scaffold). If Candy Galaxy's brief
  calls for "errorless feedback" across all 5 activities (master prompt
  step 3 says "no red X, gentle redirect + correct answer glows" for *all*
  activity types), this scaffold needs to be **extended** to the other 4
  components during the Play-flow rebuild — it is not already universal.

## 7. Session plan generation (`src/hooks/useSessionPlan.js`)

- AI is called once per session (not per question) via `/api/session-generator`,
  cached in `sessionStorage` for 60 minutes (`PLAN_CACHE_KEY =
  'mw_session_plan_v2'`).
- Plan shape: `{ isFallback, difficultyLevel, wordSequence, quizzes[],
  encouragements[], sessionGoal }`. Each quiz: `{ word, emoji, question,
  sentence, options[], correctIndex }`. The `sentence` field exists
  specifically for `StoryBuilder`'s fill-in-the-blank UI (added as a bug fix,
  see CLAUDE.md Phase 5b item 2).
- Offline/error fallback (`buildFallbackPlan`, no AI call): hardcoded
  10-word list independent of the real 200-word `WORDS` array, prioritizes
  lowest-mastery words, generates simple question text.
  called on any AI failure — **this is the sandbox's default state** per
  CLAUDE.md (no ANTHROPIC key configured in most dev runs), so Candy Galaxy
  must keep this fallback working, not assume AI always succeeds.
- **No Difficulty Governor exists yet.** `difficultyLevel` is a field in the
  plan shape but nothing currently reads/branches on a 75–85% rolling
  success-rate target — this is new logic for Phase 1's AI hookup step, not
  a re-skin.

## 8. Auth / session infrastructure (kept as-is, out of scope for this rebuild)

- `useAuth.js`: `onAuthStateChange` + `INITIAL_SESSION` with a 5s hard
  timeout fallback (known minor issue, not blocking).
- `src/supabaseClient.js`: falls back to hardcoded production project
  credentials if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset —
  confirmed still true, no `.env.local` exists in this checkout (only
  `.env.example`). Every local run without env vars writes to the real
  production Supabase project (`ozhqsaysltiamadpcruz`). Unchanged risk,
  documented already in CLAUDE.md — Candy Galaxy inherits this as-is.
- `AuthGuard.jsx` / `GalaxyLoader`: existing loading-state wrapper, themed
  in the seam-closure pass (Phase 5a) — will need a Candy Galaxy retheme
  pass but no logic changes.

## 9. Design-system precedent (`src/design-system/`, superseded by v2 tokens)

The `redesign/zentry-landing` branch already built one token/primitive
system (`tokens.js`, `motion.js`, `useTilt.js`, `primitives/*`) for the
**dawn-gradient** brand direction. Candy Galaxy is a *different, newer*
approved direction (Mockup D) with its own palette/type — the master
prompt's `src/theme/tokens.js` is a **new, separate file**, not an edit to
`src/design-system/tokens.js`. Useful carryover: `useTilt.js`'s
pointer-relative rotate/parallax math and `motion.js`'s spring presets are
techniques (not brand values) that can likely be reused or adapted for the
Candy Galaxy tilt/parallax and Nova-path physics, since the underlying
`motion` library and CSS-3D-only scope constraint are unchanged.

## 10. What is genuinely new ground for Phase 1 (not a re-skin)

- Sparks economy (`user_sparks` table, earn logic) — does not exist.
- Star Keeper (spaced-repetition dimming, `next_review_at`) — does not exist.
- Difficulty Governor (75–85% rolling success rate) — does not exist.
- Scroll-driven SVG path + Nova travel (Mockup D's signature mechanic) —
  does not exist in the current codebase in any form (the dawn-gradient
  design system has a *different* hero animation, the WordRise moment,
  which is unrelated).
- Errorless-learning scaffold on 4 of the 5 target activities (only
  `WordMatch` has it today).
- Grown-Ups gate (hold-3s + math) — does not exist; current app has no
  child/parent surface separation at the auth layer beyond screen routing.

## 11. What must be kept and only re-skinned

- `WORDS` (200-word list + content/function typing + unit grouping) → seed
  source for `words` table.
- `LEVELS` / `getLevelInfo` / `MAX_LEVEL` (24-level progression + XP
  thresholds).
- XP formula (10 base + bonuses, capped 20/question, +20/+50 session bonus).
- `word_progress` mastery calculation (`correct_count`/`attempt_count` →
  `mastery_score`).
- `MLC_TYPES` binding table and the four-interaction-type framing.
- `WordMatch`'s errorless-learning retry mechanic (extend, don't replace).
- `useSessionPlan`'s cache-once-per-session AI pattern and offline fallback
  shape.
- The existing `/api/ai-helper` + `/api/session-generator` serverless proxy
  pattern (extend for encouragement/Difficulty Governor, don't replace).
