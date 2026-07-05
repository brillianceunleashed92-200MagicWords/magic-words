# Repo Housekeeping — chore/repo-housekeeping

Pre-flight cleanup gating `docs/200MW_Prompt3_WordArt_Hybrid.md`. Restores content
stranded in two stashes, removes a stale nested scaffold copy, and reconciles two
untracked doc files sitting on main.

## STEP 0 — investigation facts (confirmed 2026-07-05, this session)
DONE. Verified before any git write:
- Both stash SHAs (`c0b32dd`, `9b6fc6b`) confirmed against their messages via `git rev-parse` + `git log`.
- `docs/200MW_Master_Project_Doc_v3.md` confirmed missing on main; its only copy lives in `c0b32dd^3` (untracked layer).
- `docs/MASTER_BUILD_PROMPT_v2.md` confirmed present on main pre-fix; `c0b32dd`'s tracked layer deletes it bundled with an `AUDIO_CONSOLIDATION_REPORT.md` edit — confirmed that edit's content is already on main via ancestor commit `2482ba7`, so only the deletion was applied.
- `scripts/verify-checkout.mjs` confirmed missing on main; its only copy lives in `9b6fc6b^3`. Read the full script before recovering — Stripe test-mode E2E checkout script, env-var driven, no secrets, standard `4242...` test card. `9b6fc6b`'s tracked-layer `.gitignore` change confirmed already present on main (redundant); other untracked files in that stash (`.Rhistory`, `vercel.json`) confirmed junk, not recovered.
- Nested `magic-words/magic-words/`: 812 git-tracked files. Listed the 13 non-cache files (prompt said 16 — off by 3, no material difference) and byte-diffed every one against its outer counterpart. All 8 that differed were pre-redesign staleness — old dark palette (`#FF6B6B`/`#4ECDC4`/`#FFE66D`), hardcoded `WORDS` array, default Vite `main.jsx`/`index.css`/`App.css`, no router/design-system, empty `ai-helper/index.ts`. No unique content anywhere — did not hit the STOP condition.
- `CLAUDE.md.backup-20260705-084009` diffed against current `CLAUDE.md`: current is a strict superset (backup content + the newer "HOW I WORK WITH YOU" block added in commit `2ac713b`). Nothing missing from current — did not hit the STOP condition.

## 1 — Restore 200MW_Master_Project_Doc_v3.md + drop MASTER_BUILD_PROMPT_v2.md
DONE (commit `8685956`). Extracted via `git show c0b32dd^3:docs/200MW_Master_Project_Doc_v3.md`, `git rm`'d `MASTER_BUILD_PROMPT_v2.md`. Verified restored doc byte-identical to the stash copy (`diff` clean) and confirmed `CLAUDE.md`'s pointer line resolves (`git cat-file -e`). Stash `c0b32dd` dropped by message, not index.

## 2 — Restore scripts/verify-checkout.mjs
DONE (commit `1920fb9`). Extracted via `git show 9b6fc6b^3:scripts/verify-checkout.mjs`, read in full before committing (no secrets), added provenance header "Recovered from 2026-07-03 stash — review before Stripe-live cutover." Stash `9b6fc6b` dropped by message, not index.

## 3 — Remove nested magic-words/ scaffold copy
DONE (commit `a4c50d8`, 812 files deleted). `git rm -r magic-words` after the byte-diff confirmed no unique content (see STEP 0). Post-removal check found leftover untracked cruft on disk (`magic-words/.DS_Store`, `magic-words/supabase/.DS_Store`, now-empty dirs) — `git rm` only removes tracked files, so these survived. Removed with `rm -rf magic-words` since they were never git content (macOS metadata + empty dirs), confirmed via `find` before deleting.

## 4 — Commit docs/200MW_Prompt3_WordArt_Hybrid.md
DONE (commit `77df76d`).

## 5 — CLAUDE.md.backup-20260705-084009 reconciliation
DONE (commit `5396208`). Deleted the backup file (untracked, so no git delete needed) and added `CLAUDE.md.backup-*` to `.gitignore` to prevent future backups from becoming stray untracked files.

## 6 — COWORK SCOPE RULE added to CLAUDE.md
DONE (commit `5396208`, same commit as #5). Added as its own "## Cowork scope rule (2026-07-05)" subsection at the end of the "HOW I WORK WITH YOU" block, verbatim per the handoff wording.

## GATES + MERGE
DONE. Re-ran all five PRE-FLIGHT checks after the above — all pass:
1. `docs/200MW_Master_Project_Doc_v3.md` exists, `CLAUDE.md` pointer resolves. OK.
2. `docs/MASTER_BUILD_PROMPT_v2.md` gone. OK.
3. `scripts/verify-checkout.mjs` committed with provenance header. OK.
4. `git stash list` empty. OK.
5. No nested `magic-words/` directory (tracked or untracked). OK.

Full gates, all green:
- `npm run build` (runs `check-wordart-sync.mjs` internally) — clean.
- `npm run check:no-emoji` — "No emoji characters found in scoped UI source."
- `node scripts/idor-proof.mjs` (env sourced from `.env.local`) — 6/6 DB-level checks PASS, 2 live-endpoint checks SKIP (no `DEPLOY_BASE_URL` set — expected, this branch touches no product/endpoint code).
- `npx playwright test` — 4/4 passed.

Merged `chore/repo-housekeeping` to `main` locally. **Not pushed to origin** — `git push origin main` requires separate manual approval per CLAUDE.md.
