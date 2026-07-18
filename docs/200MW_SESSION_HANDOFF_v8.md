# 200MW SESSION HANDOFF v8
Written: 2026-07-17 · Supersedes v7. Curriculum-replacement session.

---

## 1. STATUS — what shipped this session

**Production `main` HEAD: `6a46990`** (deployed, verified healthy).

| Landed | What it did |
|---|---|
| Walkthrough proposal (docs) | `docs/design/curriculum/…` + `docs/design/WALKTHROUGH_PROPOSAL.html/.md` — an interactive end-to-end prototype of the Blank redesign in the real Galaxy-Map home (v3, faithful home + Nova hop + Memory Master wing). PROPOSAL, not canon. Committed docs-only. |
| Consolidated word list | `docs/design/curriculum/200MW_word_list_100_100.xlsx/.md` — Dr. Blank's two source docs consolidated to **100 content + 100 non-content headwords**, each with all forms (got/had added; `before` forms cleared as a sequencing note). Also in project knowledge. |
| `CURRICULUM_RECON_R1.md` | Reconciled her list vs the live `words` table: **only 86/200 overlap** → this is a **total replacement**, ratified by Sal. |
| Migration **0040** (applied to prod) | Non-destructive, additive, **zero new rows**: `words.forms jsonb`, `words.curriculum_version` (existing rows → `v1-legacy`), `words.notes`, `app_config` table + public-read RLS + one flag row `active_curriculum_version = 'v1-legacy'`, `word_progress.curriculum_version`, widened both unique constraints to include `curriculum_version`, two indexes. Verified 200 v1 rows byte-identical. |
| Read-path gating (`6a46990`) | `src/lib/queries/words.js`, 3 sites in `api/session-generator.js`, `src/hooks/useSessionPlan.js` (5th call site), `word_progress` writes — all now filter by `active_curriculum_version` resolved from `app_config` (server + client resolvers). Flag still `v1-legacy` → genuine no-op today. |
| Prod incident (found + fixed same pass) | 0040's `word_progress` constraint widen broke the deployed upsert's 2-column `onConflict`; every progress save was failing in prod. Fixed to 3-column target, deployed, live upsert probe confirmed working. **Test accounts only — no real children affected, nothing lost.** |
| Memory Master flag | `VITE_MEMORY_MASTER_ENABLED=true` set in Vercel Production earlier this session. Reachable at `200magicwordsapp.com/memory-master-dev` — a **public, unauthenticated, unlinked** URL (no home tile / nav). Word Journey tile wiring was drafted but not run. |

**Current curriculum state:** v1-legacy is active and served. v2 schema is in place. **v2 is NOT seeded** — the 200-row seed sits dormant at `supabase/seed/words_seed_v2.sql`. Flag is dark. Nothing customer-facing changed.

---

## 2. THE BIG DECISIONS (locked this session)

- **Dr. Blank APPROVED the approach** and **shared her word list** (design sign-off + list; licensing still separate).
- **Total curriculum replacement** — her 100/100 replaces the current ~200-word set entirely (only 86 overlap). Done as versioned, flag-gated, non-destructive; old set preserved, new set dark until the flag is flipped.
- **Teach-all-forms is a hard rule** — every word carries its forms (plural, tense, conjugation, irregulars). Schema: `words.forms jsonb` array of `{form, type, irregular}`, base first.
- **Licensing (B1) is now the whole-launch critical path** — the entire curriculum is hers, so counsel clearing her license gates launch itself, not just Memory Master.

---

## 3. OPEN BLOCKERS

| # | Blocker | Owner | Blocks |
|---|---|---|---|
| B1 | **Licensing** — her word list + sequence + the "Reading Kingdom's Memory Master Program" footer. | Sal + counsel | Flipping the curriculum flag live; Memory Master go-live; **launch itself**. Draft email ready (`email_counsel.md`). |
| B2 | **Dr. Blank's 5 answers** — trial count 40–50 (recount), plurals at L1, tile-build-as-writing, stories→chunks, Memory Master E1 (L5 S14 duplicate). | Dr. Blank | Design-brief ratification + final seed. Draft email ready (`email_dr_blank.md`). |
| B3 | **Two pending unit placements** — `before` ("teach earlier") and the `somebody/anybody/nobody` family (seeded with a `999` sentinel). | Dr. Blank | Final seed order. In the same email. |
| B4 | **Seed provisional tags** — `teaching_track`/`word_type` hand-classified for the 58 genuinely-new content words (flagged provisional in the seed header). | Sal review | Seed finalization. |
| B5 | **Launch criticals (unchanged)** — counsel email, key rotation (Stripe/ElevenLabs/Supabase service-role), virtual mailbox + business phone, device test session, Stripe live cutover, hCaptcha flip, Google OAuth gate tokens. | Sal | Launch. |

---

## 4. NEXT STEPS (in order, most gated on B2/B1)

1. **Send both emails** (`email_dr_blank.md`, `email_counsel.md`).
2. **On Dr. Blank's reply:** ratify her answers into `DESIGN_BRIEF_V2` (docs-only) — this is the design-brief amendment that unlocks the build chain.
3. **Seed v2 once, with ratified data** (task #13). Now safe/dark because the read path filters by the flag — but hold until her answers land so we seed the final order/classification once, not twice. Apply the seed to prod behind the flag; verify v2 rows exist but the app still serves v1.
4. **R1 CONTENT_LADDER_DATA** — generate per-word ladder content for her curriculum: Meet/Spot/Know/Almost/Build/Use, look-alike foils, form-vs-form discrimination, carrier sentences from owned words only. Behind the vocab gate; Sal ratifies via edit tables.
5. **R2–R8 engine** — silent-tile + form-discrimination primitives, interwoven 40–50-item Word Journey shell, session inversion, guided completion, pretest/mastery/migration, review + story, QA + device pass. All behind flags, CLI + approval stops.
6. **Flag-flip to `v2-blank-100-100`** — the go-live switch. **Gated on B1 (counsel).** One `UPDATE app_config` row; reversible.

---

## 5. STANDING RULES (carry over — earned the hard way)

- **Worktree trap:** the primary checkout `~/magic-words` is on `feat/quick-wins`. `main` lives in the worktree `.claude/worktrees/fix-story-quality`. Trust `git branch --show-current`, never directory names.
- **Approval stops:** explicit stop before `git push origin main` AND a separate one before `supabase db push`. (This session used "approved" for push, "go" for db push.)
- **Deploy verification:** GitHub commit-status API + curl. **Never the Vercel MCP connector** — it's authed to the wrong account (`nextgenprecisiondrones`, not `brillianceunleashed92`).
- **Migration numbering:** read `supabase/migrations/MIGRATIONS.md` fresh; next number follows what is **applied to production** (`schema_migrations`), not what's merged. Last applied = 0040. (0039 reserved for `story_fallback`.)
- **Before every Playwright/DB command:** `set -a; source .env.local; set +a`.
- **NEW LESSON (this session):** a schema/constraint change the live app **writes** against is NOT invisible — a "schema-only, zero-rows" migration broke prod because the code that matched the old constraint shipped a task later. **Ship constraint changes with their matching code in the same deploy**, or the app breaks in the window between.
- Census discipline; no emoji; no red; `prefers-reduced-motion` honored.
- Anti-phonics fidelity: silent letter tiles, whole word spoken only on completion, letter names/sounds never spoken.
- Data proposes, Sal ratifies. Sal's style: short, step-by-step, direct, no emoji.

---

## 6. KEY FACTS / ACCOUNTS

- **Repo:** `git@github.com:brillianceunleashed92-200MagicWords/magic-words.git`. Git identity `brillianceunleashed92@gmail.com`.
- **Prod site:** `200magicwordsapp.com` (Vercel team `brillianceunleashed92`). **Supabase project ref `ozhqsaysltiamadpcruz`.**
- **Gmail connected in Cowork:** the `drmarionsformula` / `brillianceunleashed92` mailbox — confirm the right send-from account for the two emails before sending.
- **Flags in prod:** `app_config.active_curriculum_version = 'v1-legacy'` (dark). `VITE_MEMORY_MASTER_ENABLED = true` (Memory Master reachable at the unlisted dev URL).
- Deliverables from this session live in `docs/design/curriculum/` on `main`, and the walkthrough prototype is persisted as a desktop artifact ("200mw-end-to-end-walkthrough").
