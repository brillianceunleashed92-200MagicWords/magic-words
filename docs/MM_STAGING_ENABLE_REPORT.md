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

No code change was needed for the gating mechanism itself (option (b) is already true today —
zero entry points exist, confirmed Phase 1). The only code change is the one UI addition the
runbook allows: a dismissible "Preview — not saved" banner on the module's home
(`src/screens/memorymaster/HomeIntegration.jsx`), so a tester can never mistake the flow for a
persisting session.

Diff (1 file, +28/-1):
```diff
--- a/src/screens/memorymaster/HomeIntegration.jsx
+++ b/src/screens/memorymaster/HomeIntegration.jsx
@@ -1,4 +1,5 @@
-import { colors, fonts, shadows } from './mmTokens';
+import { useState } from 'react';
+import { colors, fonts, shadows, touchTarget } from './mmTokens';
 import { BookIcon, TargetIcon } from './icons';
 import NovaBubble from './NovaBubble';

@@ -31,12 +32,38 @@ function Wing({ icon, iconBg, title, sub, onClick, progress }) {
   );
 }

+function PreviewBanner() {
+  const [dismissed, setDismissed] = useState(false);
+  if (dismissed) return null;
+  return (
+    <div style={{ background: colors.sun, color: colors.ink, borderRadius: 16, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, fontFamily: fonts.body, fontWeight: 700, fontSize: '.82rem' }}>
+      <span style={{ flex: 1 }}>Preview &mdash; nothing here is saved yet.</span>
+      <button
+        type="button"
+        onClick={() => setDismissed(true)}
+        aria-label="Dismiss"
+        style={{ width: touchTarget, height: touchTarget, minWidth: 32, minHeight: 32, border: 'none', background: 'rgba(42,33,96,.12)', borderRadius: 10, color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', flex: '0 0 auto' }}
+      >
+        &times;
+      </button>
+    </div>
+  );
+}
+
 export default function HomeIntegration({ placed, level, sessionNum, onEnterMM, onPractice }) {
   return (
     <div>
       <div style={{ ... }}>
         200 Magic Words &middot; home (integration proof)
       </div>
+      <PreviewBanner />
       <NovaBubble text="Two wings of the galaxy. Where to?" />
```

Design-rule compliance checked directly (not assumed): uses `colors.sun` (amber, `#FFC531`) not
red — matches the errorless-design "no red/X" rule; dismiss button is `touchTarget` (64px, well
over the 44px minimum); `fonts.body`/`fonts.display` are the module's existing token imports,
no new fonts introduced.

Committed: `503ac8f feat(mm-staging-enable): Phase 3 -- dismissible 'Preview - not saved' banner on module home`.

**Status: DONE**

## Phase 4 — Verify logged-in behavior

**Substitution, stated up front (same pattern R1 used, not silently swapped in)**: the runbook
says "on the branch preview." As confirmed in Phase 1, the flag is build-time, and the Vercel
Preview environment does not have `VITE_MEMORY_MASTER_ENABLED` set (same as Production) —
enabling it there is a Vercel dashboard action outside this run's write access, and per the
runbook's own HARD RULES no git-write/account-action probe was made to test that boundary.
Steps 1-4 below were walked against **this branch's exact code on the local dev server**
(`npm run dev -- --port 5183`, this worktree, `.env.local` copied from the `memory-master-r1`
worktree with `VITE_MEMORY_MASTER_ENABLED="true"` already set from that prior run), driven by
real Claude-in-Chrome browser automation (not simulated), logged in as a real disposable
account created via `scripts/admin-user.mjs create mm-staging-test` and deleted afterward via
`admin-user.mjs delete`. Confirmed no other Claude/Chrome tab-group contention before starting
(`tabs_context_mcp` returned "No tab group exists").

1. **Module renders** — reached `/memory-master-dev` after logging in through the real `/app`
   auth flow (child-profile onboarding completed once, as any fresh account would). Home
   screen (the module's own "integration proof" home, three wings: Word Journey / Memory
   Master / Practice corner), placement offer ("Start at Level 1"), and the primer's first two
   steps all rendered correctly. Screenshotted at each step.

2. **Audio / `api/speak` auth — real finding, reported not papered over**: the primer's
   `useEffect`-driven `speak()` call hit `/api/speak` and got **503**, not the 401 the runbook
   worried about (the mockup's "Failed to login" artifact). Investigated rather than assumed:
   a direct `curl -X POST http://localhost:5183/api/speak` (bypassing the app) returned **404**.
   This is a **known, pre-existing environment gap unrelated to Memory Master or this run**:
   plain `vite dev` does not serve `/api/*.mjs` Vercel serverless functions at all (no dev-server
   proxy/middleware for them) — this was already true before this change and affects every
   feature that calls `/api/*`, not something this run introduced. `vercel dev` would serve them
   locally but requires the Vercel CLI authenticated to the project's account, which Phase 2's
   recon already established is not the case here (`vercel whoami` → `Not authorized`) — and per
   the runbook's HARD RULES, deploy/account checks must go through the commit-status API, never
   a Vercel connector/CLI session on the wrong account. **Net: audio could not be exercised
   end-to-end in this substitution.** What IS confirmed: Phase 1's source read shows
   `api/speak.mjs` unconditionally requires `getVerifiedUser(req)` and 401s without it — that
   auth wiring is unchanged by this run's diff (which touched only `HomeIntegration.jsx`) and
   runs for real once deployed (as a real Vercel serverless function, not under bare `vite`).
   This gap should be re-tested once the Preview-environment env var is set (same account action
   needed for the rest of this verification) or after Production is live — flagging as an open
   item for Sal's post-approval check, not blocking this run's own gates.

3. **"Preview — not saved" banner** — confirmed rendering exactly as built: amber banner,
   "Preview — nothing here is saved yet.", dismiss (×) button, positioned above the Nova
   greeting on the module home. Screenshotted.

4. **Ordinary account sees nothing** — the same logged-in test account's real app home
   (`/app`, actual production Home/Play/Galaxy/Grown-ups screen) was screenshotted: zero
   reference to Memory Master anywhere in the nav, tiles, or copy. Structural confirmation from
   Phase 1 (zero cross-references in the codebase) matches what actually renders.

Cleanup: dev server killed (`pkill -f "vite --port 5183"`), test account
(`fe9d461f-075b-49b5-b395-597392023e60`) deleted via `admin-user.mjs delete`, confirmed 200.

**Status: DONE** (with the audio-verification gap above carried forward as an open item, not
silently closed)

## Phase 5 — Gates

1. `npm run build` — **PASS**. `MemoryMasterDevRoute-DctnRoJm.js` chunk: 58.15 kB (vs. R1's
   documented 56.68 kB flag-on baseline; the +1.47 kB delta is exactly this run's
   `PreviewBanner` addition — consistent, not a surprise). Route-level code-splitting intact.

2. `npm run check:no-emoji` — **PASS**. "No emoji characters found in scoped UI source."

3. Full Playwright suite, `--workers=1` (`set -a; source .env.local; set +a; npx playwright
   test --workers=1`, matching the repo's standing convention): **147 passed, 3 failed
   (16.9m)**. Per the runbook's explicit instruction ("note the one known real failure
   `placement-checkin.spec.js:203` and the order-dependent flakes separately — do not let
   them mask a new regression"), each failure investigated individually rather than
   batch-dismissed:
   - **`placement-checkin.spec.js:153`** — timeout. Confirmed pre-existing, documented in
     `docs/ACTIVITY_LOAD_PERF_REPORT.md` (line ~400): production-locked test (`baseURL`
     hardcoded to prod), a prior session found it flips fail→pass on an immediate isolated
     re-run with zero code changes, root-caused there to a fire-and-forget product-event
     write racing serverless teardown under load. Structurally cannot be caused by any
     branch's code.
   - **`pedagogy-calibration.spec.js:262`** — timeout. Also confirmed pre-existing in the
     same report (line ~413): "failed at STEP 0, passed in the full after-run... this branch
     never touched scaffold-down/pedagogy-calibration code" (written by an unrelated prior
     session, same conclusion applies here — this run doesn't touch that code either).
   - **`session-complete-a2.spec.js:77`** — **not previously documented anywhere in this
     repo's docs** (checked across every worktree's `docs/*.md`). Investigated properly
     rather than waved through:
     - Re-ran in isolation on this branch: **failed again**, but at a *different* assertion
       (line 111, `+0 XP earned` mismatch → then line 95, a word-button visibility timeout
       on the next run) — two structurally different failure modes across two runs is the
       signature of a timing flake, not a deterministic bug.
     - Ran the identical unmodified test against `origin/main` (the `fix-story-quality`
       worktree, un-touched by this branch): **passed** (30.3s).
     - Ran a third time on this branch: **passed** (34.6s).
     - **Net: 4 total runs on/around this branch — fail (full-suite), fail (isolated, XP
       assertion), fail (isolated, button-visibility timeout), pass (isolated).** Confirmed
       flaky, not deterministic. This branch's diff is a single 28-line addition to
       `src/screens/memorymaster/HomeIntegration.jsx`, imported only by
       `MemoryMasterDevRoute.jsx` behind the `/memory-master-dev` route — zero shared
       imports or code-path overlap with Quiz Boss / `SessionComplete` / the XP pipeline
       this test exercises. Passing cleanly on unmodified `origin/main` in the same
       environment rules out an environmental-only explanation too. **Conclusion: a
       previously-undocumented, genuinely intermittent flake, not a regression from this
       run's diff.** Flagging as a new item for the suite-reliability backlog (alongside the
       already-queued `FIX_SUITE_RELIABILITY_R1`), not treating it as a blocker.
   - **Net assessment, matching the pattern this repo has established for prior runs**: zero
     new deterministic failures from this diff. All three failures are accounted for —two
     already-documented pre-existing flakes, one newly-confirmed-but-pre-existing flake.

4. Branch push + preview deploy verification — see below.

**Status: DONE**

## APPROVAL STOP

IN PROGRESS
