# 200 Magic Words — Master Project Document (v3)
**Last updated:** July 5, 2026 · Production LIVE at https://200magicwordsapp.com
**Supersedes v2.** Delete all older master docs from the Project (see FILE HYGIENE below).

**Stack:** React/Vite · Supabase (`ozhqsaysltiamadpcruz`) · Vercel · ElevenLabs · Claude API · Stripe (TEST mode)
**Repo:** brillianceunleashed92-200MagicWords/magic-words · SSH push · Vercel auto-deploy
**Workflow:** launch `claude` from inside `~/magic-words` (never `cd` — see CLAUDE.md top rule). Autonomous-run setup: `.claude/settings.local.json` allowlist + a PreToolUse auto-approve hook; only `git push origin main` and `supabase db push` prompt. Helper scripts: `scripts/db-query.mjs <file.sql>` (DB reads), `scripts/admin-user.mjs create|delete` (test accounts), `scripts/idor-proof.mjs` (security regression).

---

## WHAT THIS APP IS
AI-powered early literacy app (ages 4–8) built on **Dr. Marion Blank's methodology**. 200 foundational words across 18 units, taught through adaptive games with ElevenLabs audio, a Candy Galaxy theme, and Nova the Comet Spark as mascot. Freemium: Units 1–5 free, 6–18 on Family Plan ($9.99/mo / $79/yr — Stripe checkout built + verified, still TEST mode).

### ⚠️ CORE METHODOLOGY RULE (non-negotiable, applies to every prompt)
Dr. Blank is **anti-phonics**. NEVER use sound-blending / sounding-out anywhere in the app (e.g., never "cuh-a-tuh" for "cat" — that distortion confuses early readers). Words are taught as **whole units tied to meaning and language**. Blank's actual techniques: "Find the Word" (say the whole word, find it among look-alikes), cloze-in-context (fill the blank in a sentence, then read it), "circle the word" (repeated meaningful exposure), whole-word recognition. Any activity that teaches recognition must use whole-word/meaning-first, never phoneme blending.

---

## CURRENT STATE — MERGED & LIVE
1. **Candy Galaxy v2 architecture** — componentized (`src/screens/`, `src/components/candy/`, `src/lib/`, `src/stores/`, `src/theme/tokens.js`), lazy-loaded routes, legacy monolith parked at `/app-legacy`.
2. **Guided Path (Option B)** — the activity screen is a single vertical journey: one glowing "current" step, completed steps with earned stars, locked upcoming steps, a trophy reward node. Composed only of activities VALID for the focus word (picture-matching only for `has_art` words; function words → context activities). Sequence uses a pedagogical order informed by the difficulty governor.
3. **Phase 2 Parent Loop** — multi-child profiles (child_id-keyed), Story Engine (vocab-validated AI stories), 4-tab Parent Portal (Dashboard + AI Insight, Moments + share cards, Mastery Map, Settings), time limits, all-200-word ElevenLabs audio.
4. **Security hardening (8 phases)** — full RLS audit/fixes (word_progress had RLS OFF; Stripe endpoints trusted client IDs; earn_sparks unbounded — all fixed, proven via `idor-proof.mjs` 9/9). JWT auth + per-user rate limits on every AI/TTS endpoint + TTS caching. Secrets scan clean. Input validation incl. prompt-injection fix. Security headers + CSP (**Report-Only**) in vercel.json (also restored the SPA rewrite, fixed /app 404). health-check reduced to `{"status":"ok"}`. webhook_failures + security_events tables. COPPA baseline: `COPPA_DATA_INVENTORY.md`, verified cascade account-deletion, parental-consent checkbox, DRAFT /privacy + /terms.
5. **Word-list unification** — session-generator is server-authoritative from the real 200-word `words` table: verifies child ownership, reads plan + word_progress server-side, selects by current unit + spaced-repetition + confidence sample. Free-tier Units 1–5 cap enforced server-side (forged requests proven ignored). `word_type` column (noun/verb/adjective/number/function). Old 18-word ALL_WORDS + 10-word fallback deleted.
6. **WordArt system** — hand-drawn SVGs with single source of truth: `words.has_art` + `wordArtManifest.json` + `check-wordart-sync.mjs` (wired into build). Picture-matching draws only from `has_art` words. NO letterforms in art (Word Hunt answer-leak rule). Batches 1 & 2 shipped (Units 1–10); undepictable words documented and routed to non-picture activities.
7. **Completion & celebration mechanism** — shared pipeline: `GameEngine` per-question `onProgress` → `PlayScreen.handleProgress` writes `learning_events` (promises pushed to `pendingLearningEventsRef`) → `onSessionEnd` awaits `Promise.allSettled(pending)` before the completion check / query invalidation. Mastery-celebration gate: tier-2 star ignition requires mastery ≥ 80 AND `attempt_count ≥ 3` (`isRealMastery`). `useTodayWordActivityQuery` uses `refetchOnMount:'always'`.
8. **Onboarding** ("Star Learner") — required name + avatar (errorless validation), stale/dead-session handling (FK-23503 → friendly re-auth).

---

## KEY REFERENCE
- **Migrations:** ~0025+. Tables: words (200: unit, word_type, teaching_track, audio_url, has_art; definition/image_url NULL), word_progress, learning_events, user_streaks, user_stats, user_sparks, child_profiles, parent_settings, subscriptions, parent_child_links (unused by UI), teacher_classes/class_members (legacy-tree), api_rate_limits, webhook_failures, security_events, + a stories/catalog table if Story Time catalog work has landed. ON DELETE CASCADE verified across the child/user graph.
- **Stripe (TEST):** prod_UoN8JYjYwDK7lw; monthly price_1TokOI1HwJlEooq4y3crPkgC; yearly price_1TokOI1HwJlEooq4n13cOA46. Checkout/portal derive identity from verified JWT. Webhook failures → webhook_failures table.
- **AI endpoints (all JWT + rate-limited):** speak 60/min (cached by text hash), session-generator 10/min, ai-helper 30/min, story-engine 4/day, parent-digest 4/day.
- **Audio:** module-level singleton (`playAudio`/`currentAudio`), one sound at a time. CSP media-src allows `blob:`.
- **Tests/gates:** Playwright suite; `idor-proof.mjs` (9 checks); `npm run build`; `check:no-emoji`; `check-wordart-sync`. Live-test buttons via `getByRole('button',{name})`, NOT forced clicks on text nodes (motion.button components).
- **Design law:** `DESIGN_BRIEF.md` — Candy Galaxy tokens only (--sky #5B4BD6 / --sky-deep #3D2FA8 / --sky-night #2B2080 gradient, --sun #FFC531, --mint #3EE0B8, --bubble #FF6FA5, --tang #FF8A4C, --cloud #FFF, --ink #2A2160), Baloo 2 (headers/numbers) + Quicksand (body), chunk shadows + press-down, errorless (no red/X), 44px+ targets, NO emoji in shipped UI.

---

## REPAIR SEQUENCE (active work — ordered)
A round of dad-testing surfaced ~19 issues + a set of product decisions. Being worked in this order:
1. **Prompt 1 — Group B safety net.** *Status: PARTIALLY DONE (merged).* ✅ FIXED: inflated stars (Word Song/Magic Video/Draw It/Word Builder were auto-reporting correct:true → always ★★★; now a fixed honest 1★ via `SCORELESS_GAME_TYPES` in `questProgress.js`; real-quiz activities keep accuracy-based 1/2/3). ✅ FIXED: exit-doesn't-save — real cause was **Story Time's `StoryReader.jsx` full-screen portal covering the exit button** (not Word Song); now renders its own close button via `onExit` prop threaded through StoryTimeActivity/GameEngine/StoryScreen. ❌ OPEN: mid-session celebration misfires (Match & Sort every answer / Word Hunt random / Say-It after word 6) — **could not reproduce** after extensive scripted + live testing incl. the mastery-threshold-crossing scenario; the mid-session "word mastered" celebrations that DO fire are by-design. These remain open and need an EXACT real-device repro (browser, muted?, precise tap sequence) to pin down. Note: `StoryReader.jsx` `onExit` is now the ONLY way to reach an exit control while its portal is open — future callers must pass it.
2. **Audio consolidation.** *Status: DONE (merged).* One voice throughout: gameplay uses ElevenLabs but UI/nav buttons (Home) use a different voice (likely browser `speechSynthesis`) — consolidate all to the single ElevenLabs voice. PLUS: correct answer plays SOUND ONLY (no spoken word); read-along highlight re-synced to narration; and add a missing **account affordance** — a "logged in" indicator (avatar circle w/ child's first initial) + a logout path placed BEHIND the Grown-Ups gate (a child must not be able to log themselves out).
3. **WordArt legibility pass.** *Status: DONE (merged).* ✅ Nova verb set shipped for all 9 standalone verbs (eat/swim/dance/sing/sleep/sit/fly/jump/run), replacing the old flat "Buddy" blob that made them read as near-identical — fixed run/jump/sit specifically (audit verdict WRONG), plus duck/shark noun art. ✅ Draw It now shows a WordArt reference image (had none before). ❌ Composed noun+verb scenes ("The dog can run" showing a dog running) were **descoped this pass** — the sentence-generation templates have no noun+verb pairing mechanism at all today (confirmed by reading the code), so building composed scenes first requires a sentence-content decision, not just art. See `docs/WORDART_HYBRID_REPORT.md` for the full assessment; flagged as a prerequisite for Fill the Story's Prompt 4 rebuild if composed scenes are still wanted.
4. **Activity rebuilds:**
   - **Fill the Story** → sensible cloze (one clearly-correct answer, distractors disambiguated by the composed picture) + single-tap-to-place-with-confirm OR drag-drop (kill double-tap).
   - **Draw It** → LETTER TRACING (not freeform): trace the word's letters with animated stroke-order (green start dot, direction arrow); Nova says the whole word. Ties motor formation to the 200 words.
   - **Quiz Boss** → repurpose from learner self-rating ("I know it / need practice" — unreliable for this age) to an APP-MEASURED review battle.
   - **Word Song** → replace with **"Find the Word"** (Blank's own technique): Nova says the whole word, child finds it among similar-looking words (ran/rug/runs). NO phonics.
   - **Magic Video** → **CUT** (non-functional stub; remove from rotation).
5. **Say It with Nova overhaul + polish pass:** mic broken on phone (fix mobile Web Speech), auto-enable mic after Nova asks, center the mic, add pronunciation help (play the whole word), 5s no-speech timeout, fix random celebration after word 6. PLUS: app-wide hints (progressive; e.g., Word Builder first-letter hint), make XP toast linger (currently vanishes too fast), sticky/consistent back button on scroll, "what's next / come back tomorrow" end-of-play guidance, fix galaxy-map lock state (dance shows locked despite being used/passed), Grown-Ups hold-to-unlock timing (>3s currently).

---

## OPEN ITEMS / NEEDS SAL (carry forward — all gate real-money launch)
- **Key rotation (STILL OPEN, mandatory before Stripe live):** live Stripe + ElevenLabs keys were exposed in chat during Phase 2; rotation unconfirmed. App on test keys so no charge risk today. See `SECURITY_CHECKLIST_FOR_SAL.md`.
- **Supabase dashboard:** password min length 6→8, enable HIBP + CAPTCHA.
- **Spend alerts:** Anthropic, ElevenLabs, Vercel.
- **CSP:** do NOT flip Report-Only → enforcing until a walkthrough confirms zero violations (audio blob: fix already landed).
- **Legal review:** COPPA inventory + draft /privacy + /terms before Stripe live.
- **Reports discipline:** require every Claude Code run to create its report file as step 0 and update it live (a recent run produced none).

## BACKLOG (post-repair)
Placement Adventure onboarding + analytics (biggest pre-launch retention sprint) · Sparks spend path + Nova Growth Mirror · Session Complete screen redesign (A2: Nova glow + XP/Sparks + words-learned progress + growth-mindset copy + real child name + WordArt chips) · SM-2 Star Keeper · WordArt Batch 3 (Units 11–18, mostly SKIP/function) · referral/gift/email digest/certificates · parent access codes · Educator Loop (teacher portal v2, Live Classroom, SSO) · PWA/offline · accessibility · staging Supabase project.

## COMPLETION ESTIMATE (vs. Product Blueprint)
Child Loop ~85% · Parent Loop ~75% · Educator Loop ~10% · Institution 0%. **Launchable paid consumer product: ~80%.** Gap to launch: finish the repair sequence, Stripe live + legal + key rotation, Placement Adventure onboarding, analytics.

## HARD-WON SESSION RULES
- Reproduce live BEFORE fixing; triage verdicts before code (a prior triage found 6/9 "bugs" were ghosts in the legacy tree).
- Branch → commit per unit → build/check:no-emoji per commit → full gates → preview verify with fresh test account → merge → production verify → clean up test accounts (`nextgenprecisiondrones+*@gmail.com`).
- Re-run idor-proof whenever queries touching progress/words/subscriptions change.
- Verify the WHOLE rendered screen, not just the changed element (the distractor-emoji bug slipped through a too-narrow check).
- Every run writes its report file as step 0.
- No phonics, ever (see Core Methodology Rule).
- Update this doc at the end of major sessions.
