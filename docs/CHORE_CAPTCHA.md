# CHORE/CAPTCHA — hCAPTCHA WIRING, CODE FIRST, FLIP GATED
**Written:** July 6, 2026 · **Execute from:** `~/magic-words` · **Branch:** `chore/captcha`
**Standing sequencing rule (HARDENING_OPS_REPORT.md):** the Supabase flag `security_captcha_enabled` gates EVERY auth endpoint the moment it flips — flag-first breaks all signups. Therefore: code ships first and inert; the flip is a separate, gated, reversible step.

## GATING
- **Phases 0–5 (code + inert ship): run now, unconditionally.** They require no hCaptcha account and change no live auth behavior.
- **Phase 6 (the flip): execute ONLY if the kickoff message contains `FLIP: YES`** AND both keys exist (`VITE_HCAPTCHA_SITE_KEY` present in Vercel production env AND `HCAPTCHA_SECRET` present in the local gitignored `.env.local`). If either condition fails, stop after Phase 5, mark Phase 6 NOT RUN with the exact missing precondition, and finish the report — that is a successful run, not a failure.
- **Never echo `HCAPTCHA_SECRET`** (or any secret) into the report, logs, commit messages, or chat-visible output. Reference it only by name.

## STANDING RULES
Autonomous per convention. Approval stops: `git push origin main`, the Phase 6 Management-API PATCH itself (a live auth-config change), and any rollback decision. Report file at step 0 with RUN TIMING, live updates, full gates before merge.

## STEP 0 — SCAFFOLD
Create `docs/CAPTCHA_REPORT.md` (RUN TIMING start, branch, base SHA). Branch `chore/captcha`.

## PHASE 1 — AUTH-CALL INVENTORY (the completeness requirement)
When the flag flips, GoTrue requires a `captchaToken` on **every** auth endpoint — any call missed here is a flow that breaks on flip day. Grep the entire app for `supabase.auth.` and enumerate in the report every call that hits a token-gated endpoint: `signUp`, `signInWithPassword`, `resetPasswordForEmail`, `resend`, `signInWithOtp`/`verifyOtp` if present — with file:line for each. This inventory is the checklist Phases 2–3 must fully cover. (Admin-API paths — `scripts/admin-user.mjs`, `api/delete-account.js` — are exempt by design; note them as such rather than wiring them.)

## PHASE 2 — CLIENT WIRING (inert by default)
- Install `@hcaptcha/react-hcaptcha`.
- In `src/screens/LoginScreen.jsx` (and any other screen the Phase 1 inventory surfaces, e.g. a forgot-password flow): mount the hCaptcha component in **invisible mode**, `execute()` on submit, and thread the resulting token into the corresponding auth call via `options: { captchaToken }`. Execute per attempt (tokens expire in ~2 minutes — never cache one across retries).
- **Inert behavior is the contract:** when `import.meta.env.VITE_HCAPTCHA_SITE_KEY` is absent/empty, render no widget, execute nothing, and pass no token — byte-for-byte current behavior. All of Phase A ships with the variable unset in production.
- UX guards: if `execute()` errors or the challenge is dismissed, surface the existing error style ("Please complete the check and try again") and re-enable submit — never a dead button. The B6 consent-checkbox gating from FIX R1 must be preserved untouched.

## PHASE 3 — CSP (the silent killer — do not skip)
Production CSP in `vercel.json` is enforcing; without these, the widget fails silently on prod while working on local dev. Add exactly what hCaptcha's official docs require (verify against the docs rather than assuming — expected shape: `script-src`/`frame-src`/`connect-src`/`style-src` entries for `https://hcaptcha.com` and `https://*.hcaptcha.com`). These directives are harmless while inert, so they ship in Phase A. Re-run the CSP walk after adding them (known artifact: the Vercel preview-toolbar violations, filtered as documented in Prompt 10).

## PHASE 4 — TESTS
- Consult hCaptcha's documentation for its **official integration-test site key/secret pair** (published for exactly this purpose — do not invent values; fetch them from docs.hcaptcha.com). Use the test site key via env in dev/preview to exercise the real widget-execute-token path in a new Playwright spec: submit sign-in with the test key present, assert a token was produced and attached (network-request inspection or a thin instrumentation hook), and assert the inert path (no key) still renders and submits exactly as today.
- Full existing suite must stay green (31/31 baseline + new specs). Remember the standing traps: no real `signUp` calls (email rate limit); rAF/hidden-tab; provisioning flakes re-run in isolation.
- Confirm `scripts/admin-user.mjs` create/delete still functions (admin API is captcha-exempt; verify, don't assume).

## PHASE 5 — SHIP PHASE A (inert)
Gates → merge `--no-ff` → **approval stop** → push → **deployment check per the FIX R1 webhook incident:** within ~3 minutes of push, confirm via `gh api .../commits/<sha>/status` that a Vercel status registered AND `vercel ls` shows a new deployment for that exact SHA; if not, flag to Sal and request approval for a manual `vercel --prod` of the approved commit — never poll silently past 5 minutes. Then production verify: bundle hash changed; signup and sign-in on production still work **without** any captcha (inert confirmed, disposable account, deleted after); no hCaptcha network requests fire (site key unset).

## PHASE 6 — THE FLIP (gated: `FLIP: YES` + both keys present)
1. Fresh GET of the project's auth config via the Supabase Management API — record current `security_captcha_enabled` state.
2. **Approval stop**, then PATCH: `security_captcha_enabled: true`, `security_captcha_provider: "hcaptcha"`, `security_captcha_secret: <from .env.local, never echoed>`.
3. **Fresh GET to confirm** — standing trap: PATCH echoes are unreliable for omitted fields; the GET is truth.
4. Live verification on production with a disposable account: one full signup and one sign-in **with the real widget** completing; confirm the token path (auth succeeds) and that a submission with a deliberately missing token is rejected by GoTrue (proves the flag is genuinely live, not just configured).
5. **Rollback, pre-authorized in principle but approval-stopped in the moment:** if ANY inventoried auth flow breaks, immediately PATCH `security_captcha_enabled: false`, fresh-GET confirm, re-verify signup works, and report — a rolled-back flip with a diagnosis is a successful run.
6. Delete the disposable account.

## COMPLETION
Finalize RUN TIMING; report ends with: the Phase 1 inventory table (each call → wired ✓), gate results, Phase A production-verify evidence, Phase 6 status (RUN + outcome, or NOT RUN + missing precondition), and any deviations. Commit prompt doc + report → approval → docs push.
