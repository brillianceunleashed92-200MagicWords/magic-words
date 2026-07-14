# FIX_EVENTS_PURGE_R1 — Run Report

**Start (UTC):** 2026-07-14T04:07:26Z
**Branch:** `fix/events-purge-r1` (from `origin/main`)
**Worktree:** `.claude/worktrees/events-purge-r1`
**origin/main SHA:** `253ea0ab45803a3c02de3bacfd8d684e7d2dfd4f`

## Step 0 — Preconditions

- `git worktree list` — `main` checked out at `.claude/worktrees/fix-story-quality`, confirmed at `origin/main`'s SHA `253ea0a`. Recent history confirmed to include the STAR_CHECK_R1 merge (`42c2493`) and its docs commits (`6675544`, `253ea0a`).
- Run worktree created at `.claude/worktrees/events-purge-r1` (first attempt accidentally nested it inside `fix-story-quality`'s own tree due to a stale shell cwd — caught before any commit, removed via `git worktree remove` + `git branch -D`, redone correctly with an absolute path from the true repo root).
- `.env.local` copied in; `SUPABASE_SERVICE_ROLE_KEY` present (13 vars total, name only confirmed).

## Phase 1 — Recon + live reproduction

STATUS: DONE

### Migration numbering (fresh, not assumed)
`supabase link --project-ref ozhqsaysltiamadpcruz` then `supabase migration list --linked`: **Local == Remote through `0038`**, zero drift. `MIGRATIONS.md`'s `0039` reservation for `story_fallback` confirmed still in place (untouched, unclaimed by any other migration). **This run takes `0040`.**

### Schema truth (`information_schema.columns` + `pg_constraint`, service-role, read-only)
`product_events` columns: `id (uuid, NOT NULL, PK)`, `event_type (text, NOT NULL)`, `user_id (uuid, NULLABLE)`, `child_id (uuid, NULLABLE)`, `payload (jsonb, NOT NULL)`, `created_at (timestamptz, NOT NULL)`. Constraints on the table: **exactly two** — `product_events_pkey` (PRIMARY KEY on `id`) and `product_events_event_type_check` (the CHECK constraint gating the 11 allowed event types). **Zero foreign keys of any kind.** Both `user_id` and `child_id` are plain, unconstrained `uuid` columns — confirms the master doc's claim precisely: nothing at the database level ties a row to its owner.

### Orphan census (exact queries, before any reproduction)
```
orphan_by_user_id (user_id set, no matching auth.users row):      736
orphan_by_child_id (child_id set, no matching child_profiles row): 605
null_owner_rows (both user_id AND child_id null):                    0
total_rows:                                                        767
```
Further breakdown: `orphan_user_only_no_child` (user_id orphaned, child_id null) = 131; `orphan_user_but_child_still_exists` = 0; `orphan_child_only_no_user` = 0; `user_id_still_valid` (belongs to a currently-existing account) = **31**. The two non-zero-cross-check counts being zero confirms `child_profiles.parent_id`'s own existing cascade is working correctly (a user is never deleted while its children remain) — the leak is `product_events`-specific, not a wider `child_profiles` regression. **96% of all rows in this table (736 of 767) are pure leftover garbage from deleted accounts**; only 31 rows belong to currently-live users.

### Root cause (one paragraph, then the live-reproduced nuance)
`product_events` has zero FK/cascade, so it cannot be cleaned up by Postgres automatically — but the app is **not** blind to this: `api/delete-account.js` (the real, JWT-authenticated, user-facing "Delete account & all data" endpoint wired from `SettingsTab.jsx`) already contains explicit purge code, added by a prior workstream (`FIX R1` per its own header comment, citing `docs/FORENSICS_R1_REPORT.md`'s finding "B4") that deletes `product_events` by both `user_id` and `child_id` **before** calling `admin.auth.admin.deleteUser()`. Live-testing this exact endpoint (below) confirms it works correctly under normal and even adversarially-fast timing. **The dominant, confirmed source of the 736 orphans is a different, more fundamental gap**: this app-level purge lives in exactly one code path, and it is not the path this project's own testing/ops convention actually uses. `scripts/admin-user.mjs`'s `delete` command — the standard test-account cleanup used throughout this entire codebase's history (every Playwright spec that self-provisions, `idor-proof.mjs`, every prior workstream's disposable-account walk, including this session's own `STAR_CHECK_R1`) — calls Supabase's Admin API (`DELETE /auth/v1/admin/users/{id}`) **directly**, which has no knowledge of `product_events` and cannot invoke any application code. Every account ever deleted this way (which is nearly every disposable test account this whole project has ever created) leaves its events behind, unconditionally. This is the same failure mode a real support engineer using the Supabase dashboard directly, or any future script/automation, would also hit — no application-level fix can close this for paths that never run the application's code.

### Live reproduction (real signup-equivalent + the REAL user-facing deletion path, not service role)
Three disposable accounts, each: service-role-created (standard convention, matches every existing test in this codebase — the variable under test is the *deletion* path, not account creation), one child profile, signed in for a real JWT via `supabase.auth.signInWithPassword`, drove a real Star Check to a two-miss floor via the real `/api/session-generator` (`starCheckMode`) to generate `placement_started`/`placement_completed` with real `per_word` detail, one `/api/track` `scaffold_down` call, then deleted via **`POST /api/delete-account` with the real JWT** (never service role):
1. **First account, 2s wait before checking, then delete**: `placement_started`/`scaffold_down` had landed and were correctly purged; `placement_completed` had **not yet landed** at delete-time (fire-and-forget insert still in flight) — it arrived in the database later, after the account (and its child) no longer existed. **This row is a real, currently-existing orphan in production right now, created by this run's own reproduction** — confirmed via a follow-up query: `{user_id: '6ed979ef...', event_type: 'placement_completed', created_at: '2026-07-14 04:13:02...'}`, for a `user_id` that no longer exists in `auth.users`. This is the authoritative "surviving row IS the bug" reproduction, via the real path, not a bypass.
2. **Second account, 8s wait before checking/deleting**: both `placement_started` and `placement_completed` had landed by then; `/api/delete-account` purged both correctly; zero surviving rows.
3. **Third account, zero wait, delete immediately, then polled for 9s**: zero surviving rows appeared at any point — the race did **not** reproduce under this adversarial timing on this run, meaning the window is narrow/inconsistent, not reliably triggerable, but demonstrably real (account 1 hit it).
- **Conclusion**: the real endpoint's explicit-delete-then-delete-user approach is *mostly* effective but has a genuine, confirmed (if narrow) fire-and-forget race window that can never be fully closed at the application level, on top of the much larger, deterministic gap that every test/admin-script deletion bypasses this code entirely. Both failure modes are eliminated by the same fix: a database-level `ON DELETE CASCADE`, which fires atomically with the row deletion itself regardless of which code path (or no code path at all) triggered it, and regardless of in-flight write timing (a write arriving after the user is gone would simply fail the new FK constraint rather than silently creating an orphan).
- **Re-census after reproduction**: `orphan_by_user_id: 737, orphan_by_child_id: 606, total_rows: 768` (each +1 from the account-1 reproduction row, as expected — nothing else was cleaned up yet, per instructions, so this becomes part of the migration's own purge-and-verify evidence in Phase 5).

### Belt check (report-only, per scope — `product_events` is the only fix this run)
Every `public` table with a `user_id`/`child_id`/`parent_id`-style column, via `information_schema.columns` joined to `pg_constraint`:
- **Correctly FK+cascaded already** (confirms `delete-account.js`'s own header claim about migration 0018): `child_profiles.parent_id`, `learning_events.{user_id,child_id}`, `learning_plans.child_id`, `achievements.child_id`, `magic_moments.child_id`, `parent_child_links.{parent_id,child_id}`, `parent_settings.user_id`, `session_plans.user_id`, `stories.child_id`, `subscriptions.user_id`, `user_sparks.{user_id,child_id}`, `user_stats.{user_id,child_id}`, `user_streaks.{user_id,child_id}`, `word_progress.{user_id,child_id}`.
- **Not real gaps**: `hardest_words`, `mastery_summary`, `weekly_activity` all have a `user_id` column with no FK — but `information_schema.tables` confirms all three are **VIEWS**, not base tables (presumably aggregating already-cascaded tables), so no FK is applicable or needed.
- **Additional real gaps found, deferred (out of scope for this run per the non-negotiables)**: `api_rate_limits.user_id` and `security_events.user_id` — both genuine BASE TABLEs, both missing any FK. Not investigated further (report-only, per scope); added to the deferred list.

Cleanup note: none of the 3 reproduction accounts' auth users or child_profiles rows remain (each was deleted via the real endpoint as part of the test); the one orphaned `product_events` row from account 1 is deliberately left in place — it is now part of the "before" state the migration itself will purge and re-verify as zero, per the non-negotiables ("deleting the historical orphans is in scope and intended").

## Phase 2 — The migration

STATUS: DONE

`supabase/migrations/0040_product_events_deletion_integrity.sql` (number confirmed fresh via Phase 1's `supabase migration list`, `0039` left untouched for `story_fallback`):
1. Purges existing orphans first (`delete ... where (user_id set, orphaned) or (child_id set, orphaned)`) — required before the FK constraints can be added, since a FK addition fails if any existing row would violate it. NULL-owner rows (none currently exist) are untouched by construction.
2. Adds `product_events_user_id_fkey` (`user_id -> auth.users(id) ON DELETE CASCADE`) and `product_events_child_id_fkey` (`child_id -> child_profiles(id) ON DELETE CASCADE`), same idempotent `drop constraint if exists` + `add constraint` style as the existing `0018_coppa_deletion_cascades.sql`.
3. `MIGRATIONS.md` updated: highest applied bumped to `0040`, new provenance section added, `0039`'s `story_fallback` reservation explicitly confirmed untouched.

**`api/delete-account.js` deliberately left untouched**: Phase 1 found its existing app-level purge code is not broken (it works correctly for its own single path) — the FK is the load-bearing fix per the non-negotiables, and this file's own explicit purge becomes a harmless, no-op-once-redundant belt-and-suspenders once the cascade exists (deleting rows a moment before they'd be cascade-deleted anyway is not a bug). No other file touched.

## Phase 3 — Tests

STATUS: DONE

### `tests/events-deletion-cascade.spec.js` (new, 3 tests)
1. **Positive-landing regression**: drives a real Star Check to a two-miss floor + one `api/track` `scaffold_down` call, polls up to 15s, asserts `placement_started`/`placement_completed`/`scaffold_down` all land with `placement_completed`'s `per_word` array populated. **This test already passes pre-migration** — confirms `api/delete-account.js`'s existing app-level purge (Phase 1) doesn't interfere with normal writes, and gives the real regression coverage the non-negotiables require, but by itself cannot prove the fix (see below).
2. **Real-path cascade**: same event generation, then deletes via the real `POST /api/delete-account` with a real JWT, polls up to 10s, asserts zero rows by both `user_id` and `child_id`. **Also already passes pre-migration** — Phase 1 established this endpoint's own explicit purge already works correctly in the non-adversarial case, so this test alone would not have distinguished pre/post-migration behavior either. Kept because it's real, valuable coverage of the actual user-facing deletion flow, not because it proves the fix.
3. **The deterministic proof** (`deletion that bypasses application code entirely...`): generates the same real events, then deletes via the **raw Supabase Admin API directly** (`DELETE /auth/v1/admin/users/{id}`) — the exact bypass every test/admin-script deletion in this codebase's history uses, confirmed in Phase 1 as the dominant orphan source. **Run against the un-migrated DB, this test FAILS** (see Phase 4 below) — the only one of the three that actually distinguishes pre/post-migration behavior, since it's the only one that doesn't rely on any application code running at all.

### `scripts/idor-proof.mjs` — new check 11 (deletion integrity)
Added a fourth test identity (`D`), signed in under its own JWT (not reusing A/B/C, same reasoning as C's own provisioning comment — fresh rate/resource budget, and a real per-user event trail rather than one attributed to a different identity), writes one real `scaffold_down` event via `api/track`, polls up to 10s for a positive-landing check (not vacuous), then deletes via the raw Admin API (bypassing `api/delete-account.js` entirely, same as this script's own existing `cleanup()` helper does for every identity) and asserts zero `product_events` rows remain by either `user_id` or `child_id`. **Check count: 37 → 39** (`grep -c "check(" scripts/idor-proof.mjs`).

### Pre-migration sanity runs (both confirm expected behavior before touching production schema)
- `tests/events-deletion-cascade.spec.js` standalone: all 3 tests pass individually when run alone; the bypass test specifically shown failing when isolated (`-g "bypasses application code"`) — full diff of surviving rows printed (`placement_started`, `placement_completed` with real `per_word`, `scaffold_down`), confirming the exact orphan shape Phase 1 predicted.
- `scripts/idor-proof.mjs` full run: new check 11's second half (`deletion that bypasses application code entirely...`) fails as expected; the only other failures are the two pre-existing, already-documented flaky fire-and-forget positive-twin checks from `STAR_CHECK_R1` (`checkin_completed`, Star Check `placement_completed`) — unrelated to this change, not touched by this diff.

## Phase 4 — Pre-push gates + documented failure

STATUS: IN PROGRESS

## APPROVAL STOP 1 — supabase db push

STATUS: NOT STARTED

## Phase 5 — Apply + verify

STATUS: NOT STARTED (post-approval)

## APPROVAL STOP 2 — git push origin main

STATUS: NOT STARTED

## Phase 6 — After approval

STATUS: NOT STARTED

## FINAL STATUS

STATUS: NOT STARTED
