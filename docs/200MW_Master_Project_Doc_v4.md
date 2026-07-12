# 200 Magic Words — Master Project Document (v4)
**Last updated:** July 7, 2026 · Production LIVE at https://200magicwordsapp.com
**SUPERSEDED by v5 (`docs/200MW_Master_Project_Doc_v5.md`, July 12, 2026) — kept here as historical record only, do not use for current state.**
**Supersedes v3.** Delete v3 and all older master docs from the Project.

**Stack:** React 19/Vite · Supabase (`ozhqsaysltiamadpcruz`) · Vercel · ElevenLabs · Claude API · Stripe (TEST mode) · Recharts 3.9.2 (parent dashboard, lazy chunk only)
**Repo:** brillianceunleashed92-200MagicWords/magic-words · SSH push · Vercel auto-deploy
**Workflow:** launch `claude` inside `~/magic-words` (never `cd` — CLAUDE.md top rule). `.claude/settings.local.json` allowlist + PreToolUse auto-approve hook; approval stops: `git push origin main`, `supabase db push`, Management-API PATCHes, Vercel prod env changes, destructive ops, live payment mode. Helpers: `scripts/db-query.mjs` (reads), `scripts/admin-user.mjs` (test accounts — **must include `parental_consent` metadata or fixtures hang on the COPPA interstitial**), `scripts/idor-proof.mjs`.
**Conventions (codified over the sprint):** every run writes its report file at STEP 0 with RUN TIMING and updates it live; **FINAL STATUS's last line self-certifies the post-production-walk docs push**; gated phases stop before key-dependent steps until the kickoff carries the token (`FLIP: YES`, `GOOGLE: YES`); deployment check after every push (Vercel status AND a deployment for the exact SHA within ~3 min, never poll silently past 5); diagnose-then-fix (no fix until a reproduction demonstrates the layer — a no-fix run with evidence is a successful run); content edits use pre-approved tables with fallbacks (UNRESOLVED + proposal on double failure); production content changes get string-level bundle verification.

## WHAT THIS APP IS
AI-powered early literacy app (ages 4–8) built on **Dr. Marion Blank's methodology**. 200 foundational words across 18 units, adaptive games, ElevenLabs audio, Candy Galaxy theme, Nova the Comet Spark. Freemium: Units 1–5 free, 6–18 on Family Plan ($9.99/mo / $79/yr — Stripe checkout built + verified, still TEST mode).

### CORE METHODOLOGY RULE (non-negotiable, every prompt)
Dr. Blank is **anti-phonics**. NEVER sound-blend / sound out anywhere ("cuh-a-tuh" confuses early readers). Words are whole units tied to meaning: Find the Word, cloze-in-context, repeated meaningful exposure, whole-word recognition. Struggle is met by scaffolding DOWN the demand, never by drilling phonemes.

## CURRENT STATE — MERGED & LIVE
1. **Candy Galaxy v2 architecture** — componentized, lazy routes, legacy monolith parked at `/app-legacy` (zero live links; deletion is its own backlog pass).
2. **Guided Path** — vertical journey per focus word, activities valid for the word type, pedagogical order via the difficulty governor.
3. **Phase 2 Parent Loop** — multi-child profiles, Story Engine, 4-tab Parent Portal, time limits, all-200-word ElevenLabs audio.
4. **Security hardening (8 phases)** — RLS audit/fixes, JWT + per-user rate limits on all AI/TTS endpoints, TTS caching, CSP (Report-Only), COPPA baseline (`COPPA_DATA_INVENTORY.md`, cascade deletion, consent checkbox).
5. **Word-list unification** — server-authoritative session-generator off the real 200-word `words` table; free-tier Units 1–5 cap server-side; `word_type` column.
6. **WordArt system** — `words.has_art` + manifest + build-gated sync; no letterforms in art; Batches 1–2 (Units 1–10); Nova verb set for all 9 standalone verbs.
7. **Completion/celebration pipeline** — per-question `onProgress` → `learning_events` writes → `onSessionEnd` awaits settled promises → completion check. `isRealMastery` (≥80 AND ≥3 attempts) gates tier-2 celebration.
8. **Activity roster (post-repair, canonical 10)** — `word_match` (Tap & Hear), `word_hunt`, `rhyme_time` (Match & Sort), `find_the_word`, `flash_cards` (Quiz Boss), `story_time`, `story_builder` (Fill the Story), `word_builder`, `say_it`, `draw_it` (letter tracing). `magic_video` cut; historical rows read fine (no reader allowlists). `SCORELESS_GAME_TYPES` = `draw_it`, `word_builder`. Full repair-sequence detail: `docs/` reports (Group B, audio consolidation, WordArt hybrid, Fill the Story, Draw It tracing, activity roster, polish pass).
9. **Placement Adventure** — optional adventure-framed placement at child creation; signed stateless ladder token; `placement_unit` floor (column-level REVOKE); free plan floor capped at min(measured, 5), true level surfaces only in Parent Portal; sanctioned errorless carve-out (DESIGN_BRIEF §5a); `product_events` table (service-role-only).
10. **Auth/security sprint (July 6–7)** — PKCE; password reset LIVE (anti-enumeration, verifyOtp token_hash); signup clickwrap (ToS+Privacy); COPPA consent interstitial (closes OAuth-bypass hole); hCaptcha fully wired INERT (flip gated on `FLIP: YES` + keys); Google sign-in built INERT (gated on `GOOGLE: YES` + OAuth creds); plan cache child-scoped (`mw_session_plan_v4:${childId}`); `product_events` purged on account deletion. Legal pages rendered + wired on `chore/legal-pages`, NOT shipped — blocked on business mailing address + phone.
11. **CONTENT_R1** — Find-the-Word manifest cleaned (4 dupes, 19 distractor swaps), string-verified in the prod bundle.
12. **Quest-fix disposition (July 7)** — Sal's "frog / 0 of 10" report did NOT reproduce across three controlled attempts incl. the review-tap shape matching his account state; all 5 hypotheses ruled out with evidence; no behavioral change shipped (correctly). Shipped instead: `check-activitydefs-sync.mjs` build gate + `tests/quest-progression.spec.js`. Full account: `docs/QUEST_FIX_REPORT.md`. Residual curiosity (non-blocking): was the screenshot pre- or post-FIX_R1's deploy / a stale long-lived tab.
13. **Package A — Parent metrics dashboard (July 7, SHA 2afd849)** — 6 Progress charts in the Dashboard tab: weekly mastery crossings, practice heatmap (answer-count, NOT minutes), accuracy by activity (excludes scoreless + retired ids, hides <5 attempts), weekly-median answer speed (correct-only, >30s excluded), review-due forecast (reads stored `next_review_at` — Star Keeper writes it, server never recomputes), unit progress (all 18, isRealMastery). Key modules: `src/lib/masteryCalibration.js` (extracted isRealMastery + SCORELESS + startOfLocalDay — THE calibration seam), `src/lib/masteryReplay.js` (purity proven against real production gameplay), `src/lib/parentMetricsDerivations.js`, `useParentMetricsHistoryQuery` (84-day paginated `.range()` read — the one learning_events fetch point to extend, never duplicate). Recharts lazy-chunked (`ProgressCharts-*.js`); shared shell chunk unchanged. `docs/PARENT_METRICS_REPORT.md`.

## KEY REFERENCE
- **Tables:** words (200), word_progress (incl. `next_review_at` — Star Keeper 1/3/7/14/30 ladder, `src/lib/starKeeper.js`), learning_events (incl. `response_time_ms`; `attempt_number` unwired until Package B), user_streaks/stats/sparks, child_profiles (placement columns REVOKE-protected), parent_settings, subscriptions, api_rate_limits, webhook_failures, security_events, product_events. Migrations ~0031+. ON DELETE CASCADE verified.
- **Mastery formula (write path, pure):** `useSaveWordProgressMutation` — cumulative `correct_count`/`attempt_count`, `mastery = round(ratio*100)`. Sole writer. Replay-pure (proven). Changing it invalidates `masteryReplay.js`'s proof — product decision, not a patch.
- **Stripe (TEST):** prod_UoN8JYjYwDK7lw; monthly price_1TokOI1HwJlEooq4y3crPkgC; yearly price_1TokOI1HwJlEooq4n13cOA46. Identity from verified JWT.
- **AI endpoints (JWT + rate-limited):** speak 60/min (cached by text hash), session-generator 10/min (+ `reviewOnly` mode), ai-helper 30/min, story-engine 4/day, parent-digest 4/day.
- **Audio:** module-level singleton, one sound at a time; CSP media-src allows blob:.
- **Gates:** `npm run build` (5 checks: no-emoji, wordart-sync, stroke-coverage, activitydefs-sync, findtheword-sync) · Playwright at `workers:1` — **baseline 60 specs** (any shrink is an alarm) · `idor-proof.mjs` (incl. placement-ladder forgery, child_profiles column-write, track endpoint) — re-run whenever queries touching progress/words/subscriptions change.
- **Design law:** `DESIGN_BRIEF.md` — Candy tokens, Baloo 2 + Quicksand, chunk shadows + press-down, errorless (no red/X), 44px+ targets, NO emoji in shipped UI, placement carve-out §5a.

## OPEN ITEMS / NEEDS SAL (gate real-money launch)
- **Key rotation (MANDATORY before Stripe live):** exposed Stripe + ElevenLabs + Supabase service-role keys; rotation unconfirmed. Test keys live, so no charge risk today.
- **Counsel email** — drafts ready, send unconfirmed. Longest external clock.
- **Virtual mailbox + business phone** (~$15/mo) → unblocks legal-pages ship + completes counsel package; entity as filed LLC before pages publish.
- **Gate tokens:** hCaptcha keys → `FLIP: YES`; Google OAuth creds → `GOOGLE: YES`.
- **Spend alerts** (Anthropic/ElevenLabs/Vercel) · **Supabase dashboard** (pw min 8, HIBP, CAPTCHA) · **CSP** stays Report-Only until a zero-violation walkthrough.
- **Phone/device session** — `DEVICE_TEST_CHECKLIST.md`; iOS Say-It auto-listen is the #1 open product question.
- **Prompt 11 — Stripe-live cutover:** write the moment rotation + counsel are green. Runbook in `LEGACY_RETIREMENT_REPORT.md`; include deployment-check rule + one small real refundable charge with explicit sign-off.

## BACKLOG (post-launch order: B → C → E → D → later)
- **B — Pedagogy calibration** — prompt WRITTEN (`docs/FEAT_PEDAGOGY_CALIBRATION_R1.md`): isRealMastery everywhere (readers, not the stored formula), weeklyStats same-screen fix first, scaffold-down v1, attempt_number wiring, chart-1 84-day truncation guard.
- **C — Placement report + Star Check-In** — reuse `masteryReplay.js` and extend `useParentMetricsHistoryQuery` (don't fork a second fetch).
- **E — Quick wins** — unit-relative Session Complete framing, sleeping stars, "Minutes this week" honest label (`SECONDS_PER_EVENT` proxy), streak mercy, **+ Grown-Ups tab-bar "Settings" label clips at 375px** (pre-existing, found in Package A's pass).
- **D — Admin panel v1** — separate private Vercel project, read-only first.
- **Later:** Sparks spend path, Session Complete redesign (A2), WordArt Batch 3, referral/gift/digest/certificates, Educator Loop, PWA/offline, accessibility, staging Supabase, delete `/app-legacy`, `story_time` chrome migration, test-suite provisioning-contention chore (shared fixture/serialized provisioning — flake category is growing as more specs self-provision).

## COMPLETION ESTIMATE
Child Loop ~85% · Parent Loop ~85% (dashboard shipped) · Educator ~10% · Institution 0%. **Launchable paid product: engineering ~95% — remaining gap is Sal-gated (rotation, counsel, mailbox, tokens) + Prompt 11.**

## HARD-WON SESSION RULES
- Reproduce live BEFORE fixing; triage verdicts before code; a no-fix run with evidence is a successful run.
- Branch → commit per unit → gates per commit → full gates → preview verify with fresh test account → merge → approval → push → deployment check → production verify → cleanup → docs push (self-certified in FINAL STATUS).
- Verify the WHOLE rendered screen, not just the changed element.
- Re-run idor-proof on any progress/words/subscriptions query change.
- No phonics, ever. Never touch Sal's real accounts; disposables only, one prefix: `nextgenprecisiondrones+*`.
- **Supabase selects cap at 1000 rows — page with `.range()` or truncate silently** (bites the most active kids first).
- Modules importing `supabaseClient.js` can't load under Playwright's Node loader — extract pure logic to `src/lib/`.
- `import.meta.env` inlines at dev-server start — env-gated UI needs its own Vite instance.
- `admin.generateLink` → implicit-flow links PKCE rejects; use `verifyOtp({token_hash})`. Admin fixtures need `parental_consent` metadata.
- The browser extension's `read_network_requests` silently evicts earlier requests under load (audio prefetch) — verify surprising captures against the DB.
- Local fallback session plan sorts ascending-by-mastery and caps at 6 — seeded partial-mastery words can be silently excluded from their own test.
- Tile accessible names combine image alt + label ("horse horse") — anchored regex, and wait for enabled state, never fixed sleeps.
- **Grown-Ups hold-gate needs real Playwright mouse events** (`page.mouse.down()` / `up()` around a wait) — its rAF timer doesn't advance under synthetic `dispatchEvent`.
- Vercel MCP is authed to the wrong account — deployment confirmation via GitHub commit-status API + curl.
- Update this doc at the end of major sessions.
