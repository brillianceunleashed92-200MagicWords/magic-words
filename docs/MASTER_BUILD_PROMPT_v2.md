# 200 MAGIC WORDS v2 — MASTER BUILD PROMPT (Claude Code)
## Phase 1: The Child Loop — Candy Galaxy rebuild

---

## MISSION

You are the lead engineer rebuilding 200 Magic Words (AI early-literacy app, ages 4–8) into its v2 "Candy Galaxy" architecture. Work autonomously through the phases below back-to-back with self-verification after each. Log sensible defaults instead of asking. Do NOT stop for per-phase confirmation. The ONLY things requiring explicit confirmation before acting: modifying resources outside this project's own infrastructure (other repos, other Supabase projects, other Vercel projects, DNS), destructive database operations, or anything involving payments/secrets rotation.

Stick to literal scope. Surface adjacent improvement ideas at the end as suggestions — do not bundle them into the build.

---

## REQUIRED READING (before writing any code)

1. `docs/200MW_Product_Blueprint.md` — the product architecture. Phase 1 scope is Part 10, "Phase 1 — The Child Loop." Parts 2, 3.3, 7 define the mechanics, difficulty rules, and UI system.
2. `docs/mockup-D-candy-galaxy.html` — the approved design direction. This file IS the visual spec: extract its palette, type, chunky-shadow style, scroll-driven path mechanic (golden path draws with scroll, Nova rides the path, nodes pop on arrival, parallax layers). Reproduce this feel in React with Motion.

---

## PRE-FLIGHT (do first, in order)

1. Verify accounts: `gh auth status` AND `ssh -T git@github.com` — confirm we are operating as the account with access to `brillianceunleashed92-200MagicWords/magic-words`. If wrong account, STOP and report.
2. `cd ~/magic-words`, fetch all branches.
3. Audit `redesign/zentry-landing`: inventory the MLC lesson-engine code (24-level progression, four lesson interaction types, errorless-learning scaffolding, any lesson/level data structures). Write the inventory to `docs/mlc-engine-audit.md` — this logic is KEPT and re-skinned, not rewritten.
4. Create branch `v2-candy-galaxy` from `redesign/zentry-landing`.
5. Confirm `.env` exists locally with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY; never commit it.

---

## ARCHITECTURE RULES (non-negotiable)

- **Componentized**: `/src/components`, `/src/screens`, `/src/hooks`, `/src/lib`, `/src/stores`. No file over ~300 lines. No monolithic App.jsx.
- **Design tokens**: single `src/theme/tokens.js` exporting the Candy Galaxy system (extract exact values from mockup D):
  - sky #5B4BD6, skyDeep #3D2FA8, skyNight #2B2080, sun #FFC531, mint #3EE0B8, bubble #FF6FA5, tang #FF8A4C, cloud #FFFFFF, ink #2A2160
  - fonts: Baloo 2 (display 600–800), Quicksand (body 500–700)
  - chunk shadow: `0 8px 0 rgba(0,0,0,.16)`; press-down active states on all buttons
- **Data-driven content**: ALL 200 words live in Supabase (`words` table), never hardcoded. The 18 demo words become seed rows alongside the full list from the blueprint/manuscript materials in the repo docs; if the full 200-word ordered list is not found in the repo, seed the 18 known words + placeholder rows and flag it in the completion report.
- **State**: Zustand for client state, TanStack Query for server state.
- **Animation**: `motion` (Framer Motion) for UI physics, `canvas-confetti` for celebrations. Scroll-driven path via scroll progress → SVG stroke-dashoffset + getPointAtLength (port the mockup's technique).
- **Audio**: Web Speech API wrapper (`useSpeak` hook) for v1 word audio; structure it so ElevenLabs MP3s can replace it in Phase 2 without touching call sites.
- **AI**: keep the existing Vercel serverless proxy pattern (`api/ai-helper.js`). Extend, don't replace.
- **Accessibility**: 64px min touch targets, every interactive element speaks on tap, `prefers-reduced-motion` respected, WCAG AA contrast, OpenDyslexic toggle stub.

## SUPABASE (additive only — never drop or rename existing tables/columns)

New migrations (SQL files in `supabase/migrations/`, also apply via dashboard SQL editor and note this in the report):
- `words` (id, word, type content|function, unit, sort_order, emoji, definition, audio_url, image_url)
- `user_sparks` (user_id, balance, lifetime_earned)
- `user_streaks` — EXISTS from prior work; audit and extend only if needed
- `word_progress` — EXISTS; add `next_review_at timestamptz` + `review_interval_days int default 1` for Star Keeper
- RLS on all new tables: user can only read/write own rows; `words` is public-read.

---

## PHASE 1 BUILD SCOPE (from blueprint Part 10)

Build in this order, self-verifying (lint + build + manual smoke list) after each step:

1. **Scaffold + tokens + component library**: Pill, ChunkyButton, CloudCard, WordNode, SparkCounter, QuestTile, WordBubble, TrophyCard, CelebrationOverlay, NovaSprite (CSS version now; swap-in slot for the Higgsfield PNGs in `/public/nova/` — if images are present, use them).
2. **Home screen** = mockup D reproduced in React: hero card, streak pills, Today's Magic Word card, scroll-driven Word Galaxy path with Nova travel, word bubbles, trophy shelf, bottom pill nav (Home / Play / Galaxy / Grown-Ups).
3. **Lesson flow (Play)**: 5 activity types wired to the MLC engine — Tap & Hear, Word Hunt, Fill the Story, Match & Sort, Quiz Boss. Fullscreen, chrome-free, one decision per screen, errorless feedback (no red X, gentle redirect + correct answer glows).
4. **Mechanics**: Sparks economy (earn on completions, persist to Supabase), streaks (extend existing user_streaks logic), Star Keeper v1 (fixed-interval star dimming using next_review_at; Nova "wake up the star" review session entry point on Home).
5. **Celebration architecture**: the 5 ranked moments from blueprint Part 2.7 (answer burst → star ignition → quest complete → boss trophy → streak milestone), each skippable, reduced-motion aware.
6. **Grown-Ups gate + Parent lite**: hold-3s + simple math gate → mastery map (200-word constellation heatmap) + session time-limit setting.
7. **AI hookup**: existing `/api/ai-helper` powering quiz generation + encouragement inside the new lesson flow; add the Difficulty Governor rule (target 75–85% rolling success; below → easier activity type next, above → advance).

## DEPLOY LOOP

- Commit per step with clear messages; push branch; Vercel preview deploys are the review surface. NEVER merge to main in this phase.
- End-of-run report: what shipped, defaults chosen, migration SQL applied, smoke-test results on mobile viewport (390px) and desktop, known gaps, and the adjacent-improvement suggestions list.

## DEFINITION OF DONE (Phase 1)

A new user on the preview URL can: sign up → land on Candy Galaxy home → scroll the path and watch Nova travel it → complete a 5-activity Today's Quest with AI quiz + encouragement → earn Sparks → see a star ignite in their galaxy → trigger the streak counter → parent can open the gate and see the mastery map → all state persists across refresh and re-login.
