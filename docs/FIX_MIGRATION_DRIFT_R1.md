# 200 MAGIC WORDS — FIX_MIGRATION_DRIFT_R1: RECONCILE 0037/0038 + RESERVE 0039
**Written:** July 12, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/migration-drift` (off current `main`)
**Single focus: main's migration history must match what is actually applied to the production database.** The v5 census found migrations 0037/0038 are applied to live production but the files exist only on the parked, unmerged `feat/quick-wins` branch — and a separate TODO (story_fallback telemetry) had independently claimed "0037." Fix the drift, prevent the collision. **This run applies nothing to the database** — it makes the repo tell the truth about what's already applied.

## SUGGESTED /goal (paste into the CLI to launch)
> Execute docs/FIX_MIGRATION_DRIFT_R1.md end to end, committing the prompt doc as part of the run. Approval stops remain binding: pause and ask in chat before `git push origin main`, and `supabase db push` is FORBIDDEN this run — nothing may be applied, altered, or reverted on the live database; if any step seems to require it, STOP. Gate commands must use the env prefix verbatim: `set -a; source .env.local; set +a` before any Playwright or script run. Complete when docs/MIGRATION_DRIFT_REPORT.md is finished on `fix/migration-drift` with: a verified inventory of what production's migration state actually is vs what main's supabase/migrations/ contains vs what feat/quick-wins contains (queried, not assumed), the 0037/0038 files present on main byte-identical to what was applied, a MIGRATIONS.md note reserving 0039 for story_fallback and stating the numbering rule, the story-followup TODO comment updated from 0037 to 0039+, full suite green at its true baseline with the env prefix, gates green, FINAL STATUS self-certifying the docs push — and you've pasted FINAL STATUS into your output. Never touch the Aliya account. Do not merge feat/quick-wins or bring over any of its non-migration code. Stop after 60 turns.

## THE SITUATION (from DOCS_MASTER_V5_R1's census — verify all of it fresh)
- `supabase/migrations/` on main: 36 files, latest 0036.
- `feat/quick-wins` (parked mid-Phase-2, has committed WIP + a stash): contains 0037 and 0038 migration files. Per the QA/handoff notes, at least one relates to `streak_freeze_count`, which QA found "already exists on prod and is consumed server-side" — i.e., these were applied to production during that workstream and the branch was then parked without merging.
- `FIX_STORY_FOLLOWUP_R1` left a code TODO claiming migration 0037 for a future `story_fallback` product_events type — a numbering collision with the above.

## PHASES
0. Report at STEP 0 with RUN TIMING on `fix/migration-drift` off current `main`; fresh full-suite baseline (env prefix verbatim).
1. **Inventory, with evidence (read-only):**
   - Query production's applied-migration state (`supabase_migrations.schema_migrations` or the CLI's `supabase migration list` against the linked project — read-only) and list every applied version.
   - `git show feat/quick-wins:supabase/migrations/<0037...>.sql` (and 0038) — capture their exact content.
   - Verify the applied schema matches those files' effects (e.g., `streak_freeze_count` column exists with the expected definition — information_schema query).
   - Confirm whether anything ELSE is applied to prod that exists on no branch at all (the drift may be wider than two files). If so, STOP and report before proceeding.
2. **Reconcile the files onto main:**
   - Copy the 0037/0038 SQL files from `feat/quick-wins` onto this branch byte-identical (`git checkout feat/quick-wins -- supabase/migrations/<files>` or equivalent). Do NOT bring any other file from that branch.
   - If the applied production state and the branch files DISAGREE in content, STOP — do not "fix" the SQL to match; report the disagreement.
3. **Prevent the collision:**
   - Update the story_fallback TODO comment (in `src/lib/queries/stories.js`, from the followup run) to reference migration **0039+**, not 0037.
   - Add/extend `supabase/migrations/MIGRATIONS.md` (or a README there): current highest applied number, the rule that new migrations take the next number after what's APPLIED (not after what's on main), the 0037/0038 provenance note (applied from feat/quick-wins pre-merge, files reconciled onto main by this run), and that 0039 is next-free, earmarked for story_fallback.
4. Gates (env prefix verbatim): build, no-emoji, wordart-sync, full Playwright `workers:1`. idor-proof not expected (no code paths change — files + one comment) — state the determination. Note honestly: copying migration files that are already applied changes no runtime behavior; the suite is a no-regression formality here.
5. Merge `--no-ff` → **approval** → push → deployment check → no production walk needed beyond confirming deploy is Ready (no user-facing behavior changed — state this explicitly rather than inventing a walk) → docs push, self-certified.

## GUARDRAILS
- **`supabase db push` forbidden.** Read-only queries against the DB are fine; writes/DDL of any kind are not.
- feat/quick-wins itself stays parked and untouched — no commits to it, no merge of it, its stash left alone.
- If Phase 1 finds wider drift than 0037/0038, STOP after documenting it.
- Log-don't-fix everything else.

## REPORT (docs/MIGRATION_DRIFT_REPORT.md)
### SUMMARY · RUN TIMING + baseline · INVENTORY (applied versions queried, file contents, schema verification, any wider drift) · RECONCILIATION (what was copied, byte-identity proof) · COLLISION PREVENTION (TODO update, MIGRATIONS.md rule) · VERIFICATION (gates with env prefix, determination notes) · LOGGED FOR LATER · TRAPS
