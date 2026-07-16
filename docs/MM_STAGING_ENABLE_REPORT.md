# MM_STAGING_ENABLE_R1 — Run Report

Live-updated per phase. Branch `feat/mm-staging-enable`, worktree
`.claude/worktrees/mm-staging-enable-r1`, branched from `origin/main` @ `6870ad3`.

## Step 0 — Worktree, report

- `git worktree list` confirmed: main's checkout is the `fix-story-quality` worktree
  (`6870ad3 [main]`), NOT the primary directory (`/Users/f00517z/magic-words`, which sits on
  `feat/quick-wins`). Consistent with the prior DIAGNOSE_PROD_STATE_REPORT finding.
- `git fetch origin && git rev-parse origin/main` → `6870ad3f6ca74a2c3f9247098465551b956097cf`
  — matches expectation ("6870ad3 or later").
- Branch `feat/mm-staging-enable` created from `origin/main` in new worktree
  `.claude/worktrees/mm-staging-enable-r1`, following this repo's one-worktree-per-branch
  convention.

**Status: DONE**

## Phase 1 — Recon: how the flag and route actually work

1. **Flag mechanics** — `src/screens/memorymaster/MemoryMasterDevRoute.jsx:42`:
   ```js
   const FLAG_ENABLED = import.meta.env.VITE_MEMORY_MASTER_ENABLED === 'true';
   ```
   This is **build-time**, not runtime — `import.meta.env` is inlined by Vite at build time.
   Confirms the project's own documented trap (comment at lines 33–35): toggling this flag
   requires a rebuild/redeploy, not a live server-side toggle. A Vercel env-var change alone
   does nothing until the next build picks it up.

2. **Route mount + off-state behavior** — `src/main.jsx:69`:
   ```jsx
   <Route path="/memory-master-dev" element={<MemoryMasterDevRoute />} />
   ```
   Mounted as a sibling of `/app` (not nested inside `CandyGalaxyShell`'s `AuthGuard`/bottom-nav
   — same reasoning as `/update-password`, per the comment at main.jsx:40-45). Confirmed in
   `MemoryMasterDevRoute.jsx:45-52`: when `FLAG_ENABLED` is false, it renders the real
   `NotFound` component (`../../pages/NotFound.jsx`), not a stub — R1's claim confirmed.

3. **No customer-visible entry point** — `grep -rln "memory-master\|MemoryMaster" src/` outside
   the module's own files and `main.jsx` returned **zero matches**. No home tile, no nav item,
   no link anywhere else in the app references it. R1's claim confirmed: reachable by direct
   URL only.

4. **Auth context** — `src/lib/useSpeak.js` → `src/games/gameAudio.js:66-74`'s `fetchAudio`
   calls `supabase.auth.getSession()` and attaches `Authorization: Bearer <access_token>` if a
   session exists, then POSTs to `/api/speak`. `api/speak.mjs:22-26`:
   ```js
   const user = await getVerifiedUser(req);
   if (!user) {
     logSecurityEvent('auth_verification_failed', { endpoint: 'speak' });
     return res.status(401).json({ error: 'Unauthorized' });
   }
   ```
   This is **real, enforced auth** (comment at line 19-21: added specifically because this
   endpoint costs real money per uncached call and previously had no auth check) — not the
   mockup's bare-file "Failed to login" artifact. **For audio to work, a tester must be signed
   in with a real Supabase session** before reaching `/memory-master-dev`; an anonymous/logged-
   out visitor who finds the URL will see the module render (no route-level auth guard) but
   `api/speak` calls will 401 and produce silent no-audio (per `useSpeak.js`'s existing
   `.catch(() => null)` degrade-to-silence behavior, not a crash).

**Status: DONE**

## Phase 1.5 — Persistence check (needed for Phase 2 option viability)

`MemoryMasterDevRoute.jsx` full read: all state is `useState` (progress, portionState,
assessState, log, etc.) — zero `supabase.from(...)` calls, zero writes anywhere in the file.
Confirms R1's "in-memory only, nothing persists" claim still holds; no schema/DB risk from
enabling the route.

**Status: DONE**

## Phase 2 — Decide the gating mechanism

Evaluated all three options against what actually exists in the codebase/infra, before
changing anything:

**(a) Env flag on preview/staging only — NOT VIABLE as "the live app."**
`vercel.json` (repo root) has one config, no staging-specific settings; there is no separate
staging *domain* — only Vercel's standard per-branch/per-PR Preview Deployments, which are
ephemeral (a new URL per push, tied to a branch) and not `200magicwordsapp.com`. Vercel does
let env vars be scoped to its "Preview" environment distinct from "Production," which is a
real platform feature and not something to build — but scoping the flag there would only make
the module reachable on a rotating preview URL, not on the live production domain. The
runbook's own framing is "Sal wants to SEE the module **in the live app**" — a preview link
doesn't satisfy that. Ruled out for this run's actual goal, not because the mechanism doesn't
exist, but because it doesn't produce the requested outcome.

**(c) Gated by tester allowlist — NOT VIABLE, no existing mechanism.**
`grep -rln "tester\|is_admin\|isAdmin\|role.*admin\|allowlist" src/` found exactly two hits,
both unrelated (a server-side event-type allowlist in `PlayScreen.jsx`, and a paywall-surface
allowlist comment in `UpgradeBanner.jsx` — neither is a user/tester role system). No
internal/admin/tester role exists anywhere in the codebase. Per the runbook's own constraint
("use only if the mechanism already exists; do NOT build a new auth system for this"), this
is ruled out.

**(b) Flag on in production, route reachable only by direct URL — RECOMMENDED.**
This is architecturally already true today, confirmed in Phase 1: zero entry points exist
(no home tile, no nav link, nothing references `/memory-master-dev` anywhere else in the app).
Turning `VITE_MEMORY_MASTER_ENABLED` on in production doesn't add an entry point — it only
stops that one already-unlinked URL from rendering `NotFound`. Per the runbook, this is
"Acceptable ONLY because nothing writes to the DB and no child data is involved" — confirmed
in Phase 1.5 (zero persistence, all in-memory state). Since the flag is build-time
(`import.meta.env`, inlined at build — Phase 1 finding), enabling it requires a Vercel
**Production** environment-variable change + a redeploy, not a code change alone. That env-var
step is an account action for Sal to perform by hand (per the runbook's own instruction not to
do this directly) — exact steps below.

**Decision: (b).** No code change is needed to the gating mechanism itself (it already
satisfies "no customer entry point"); the only code change in Phase 3 is the one UI addition
the runbook allows — the "Preview — not saved" banner — so a tester is never misled about
persistence.

**Exact steps for Sal (Vercel account action, not performed by this run):**
1. Vercel dashboard → this project → Settings → Environment Variables.
2. Add/edit `VITE_MEMORY_MASTER_ENABLED` = `true`, scoped to **Production** only (leave
   Preview/Development as-is, or set the same if useful — irrelevant to this run's goal).
3. Trigger a new Production deployment (redeploy the current `main` HEAD, or push/merge this
   branch — a fresh build is required since the flag is inlined at build time).
4. After the new deployment completes, `/memory-master-dev` on `200magicwordsapp.com` renders
   the module for anyone who knows the URL; everyone else still sees no reference to it
   anywhere in the app.

**Status: DONE**

## Phase 3 — Apply the chosen gating

IN PROGRESS

## Phase 4 — Verify logged-in behavior

IN PROGRESS

## Phase 5 — Gates

IN PROGRESS

## APPROVAL STOP

IN PROGRESS
