# FEAT AUTH R1 — PASSWORD RESET + GOOGLE SIGN-IN + PKCE
**Written:** July 6, 2026 · **Execute from:** `~/magic-words` · **Branch:** `feat/auth-r1`
Password reset ships live (it's a missing table-stakes feature). Google sign-in ships **inert** behind `VITE_GOOGLE_AUTH_ENABLED`; its provider flip is a gated phase, mirroring the captcha pattern.

## SAL PREREQ FOR PHASE 8 ONLY (~10 min, can happen anytime — Phases 0–7 need nothing)
Google Cloud Console → new project → **OAuth consent screen**: External, app name "200 Magic Words", your support email, authorized domain `200magicwordsapp.com`, scopes: only openid/email/profile (non-sensitive — no Google verification review needed), Publish app → **Credentials → Create OAuth client ID (Web application)** → Authorized redirect URI EXACTLY `https://ozhqsaysltiamadpcruz.supabase.co/auth/v1/callback` → put the client ID and secret into `.env.local` as `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.

## GATING
- **Phases 0–7: run now, unconditionally.**
- **Phase 8 (Google go-live): only if kickoff contains `GOOGLE: YES`** AND both `GOOGLE_OAUTH_*` values exist in `.env.local`. Otherwise mark NOT RUN with the missing precondition — a successful outcome.
- Never echo any secret into report/logs/commits.

## STANDING RULES
Autonomous per convention. Approval stops: `git push origin main`, every Supabase Management-API PATCH (live auth config), Vercel production env changes, rollback decisions. Report `docs/AUTH_R1_REPORT.md` at step 0 with RUN TIMING + live updates. Fresh-GET after every Management-API PATCH (echo trap). Deployment check after every push (FIX R1 rule). Disposable test accounts only.

## PHASE 0 — SCAFFOLD
Report + branch. Record base SHA.

## PHASE 1 — PKCE, ISOLATED FIRST
Consult **current Supabase docs** (fetch them; do not trust memory — their recovery/OAuth flows have changed across versions) for the recommended SPA configuration and how password-recovery links behave under it. Then make exactly one change: `flowType: 'pkce'` in `supabaseClient.js`'s client options. Immediately run the FULL existing suite (35/35 current baseline) plus a manual sign-in/sign-out check before writing any feature code — if anything breaks under PKCE alone, stop and report before proceeding. Existing sessions must survive (verify with a pre-created account).

## PHASE 2 — PASSWORD RESET REQUEST (anti-abuse by design)
"Forgot password?" link on `LoginScreen.jsx` → a request form (inline mode-switch or `/reset-password` route — your choice, log it):
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/update-password })`, **captcha-wired identically to sign-in** (this endpoint is token-gated the moment the flag flips — it must be born wired; inert while the site key is unset).
- **Anti-enumeration is non-negotiable:** the UI shows the exact same success message whether or not the account exists — "If an account exists for that email, a reset link is on its way. Check spam too." Error paths that could differ by existence (including rate-limit responses) collapse to a generic "Something went wrong — try again in a minute." Never confirm or deny an account.
- **Cooldown:** disable the submit for 60 seconds after any attempt, with a visible countdown. (Supabase's own email rate limits are the server-side backstop; record the current limit from config, don't change it.)

## PHASE 3 — UPDATE-PASSWORD SCREEN
New route `/update-password` (added to `main.jsx`):
- Handles the recovery redirect per the doc-confirmed PKCE flow (code exchange / `PASSWORD_RECOVERY` event). New password + confirm fields; client-side mirror of the live policy (min 8, letters+digits) for UX, server remains truth.
- On success: keep the session, confirm visually, route to Home. Expired/invalid/reused link → friendly error + link back to the request form (recovery links are single-use and expire; surface that plainly, never a blank screen).
- Route must be covered by the CSP walk.

## PHASE 4 — SUPABASE URL ALLOW-LIST (approval-stopped)
Fresh GET of auth config (record `URI_ALLOW_LIST` and the recovery-link/OTP expiry — flag if expiry exceeds 24h but change nothing). **Approval stop**, then PATCH the allow-list to add `https://200magicwordsapp.com/update-password` and the localhost dev equivalent. Fresh GET to confirm.

## PHASE 5 — GOOGLE SIGN-IN CODE (inert) + THE COPPA INTERSTITIAL (mandatory)
- **Button:** "Continue with Google" on `LoginScreen.jsx`, rendered only when `import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'`. Uses `signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/ } })` — the **redirect flow only**. Do NOT load Google's GIS JavaScript (no new CSP directives needed; verify none are, rather than assuming).
- **The critical piece — OAuth must not bypass parental consent/clickwrap.** Email/password signups record consent via the B6 checkbox into `parental_consent` user metadata. A Google-created account skips that form entirely. Therefore: add a **consent interstitial** — after any authentication, if `user.user_metadata.parental_consent` is absent, the app blocks (before child creation/Home) on a screen carrying the exact same copy and both links as the B6 checkbox, and on agreement writes the same-shaped `parental_consent` metadata via `updateUser`. Users who already have it are never re-prompted (verify with an existing account). Without this, Google signup would create COPPA-consent-less accounts and unenforceable clickwrap — treat any gap here as launch-blocking.

## PHASE 6 — TESTS
- **Reset E2E without email** (the trick that beats the email-rate-limit trap): in a spec or helper, use the service-role `admin.generateLink({ type: 'recovery', email })` for a disposable account, drive the browser through the returned link → `/update-password` → set a new password → assert old password fails and new succeeds. Cleanup after.
- **Anti-enumeration:** submitting the request form for an existing vs. nonexistent email yields byte-identical UI copy. **Cooldown:** button disabled post-submit.
- **Interstitial:** admin-create a user WITHOUT `parental_consent` metadata → sign in → interstitial blocks until agreed, metadata written, proceeds; a user WITH it sees no interstitial.
- **Google button:** using the captcha run's separate-dev-server pattern with `VITE_GOOGLE_AUTH_ENABLED=true` — button renders, click navigates toward an `accounts.google.com` authorize URL (assert the URL, abort the navigation — never complete a Google login in automation); with the flag unset, the button is absent and zero Google requests fire.
- Full suite green (35 baseline + new). Standing traps apply.

## PHASE 7 — SHIP (reset live, Google inert)
Gates → merge `--no-ff` → approval → push → deployment check → production verify: **real reset E2E on production** via `generateLink` with a disposable account (request form shows anti-enum copy; link → update → new password signs in); `/update-password` in the CSP walk, 0 violations; Google button absent; sign-in/up regression pass. Delete test accounts.

## PHASE 8 — GOOGLE GO-LIVE (gated: `GOOGLE: YES` + creds)
1. Fresh GET auth config. **Approval stop**, then PATCH the Google external provider: enabled, client ID, secret (never echoed). Fresh GET confirm.
2. Set `VITE_GOOGLE_AUTH_ENABLED=true` in Vercel production env (**approval stop**) and trigger a redeploy; deployment check; confirm button live.
3. **Linking verification (Sal in the loop, ~4 min, guided):** (a) Sal signs in on production with a Google account whose email has NO existing 200MW account → run inspects via admin API: one user, `identities` contains google, **interstitial fired and consent metadata written**. (b) Sal signs in with a Google account whose email ALREADY has a password account (create one for his Gmail first) → confirm the SAME user id gained a google identity — no duplicate user, password still works. Document the linking behavior verbatim in the report; if duplicates or takeover-shaped behavior appear, **roll back** (PATCH provider disabled, flag off, fresh-GET confirm) and report rather than shipping it.
4. Cleanup of any test artifacts that aren't Sal's real accounts.

## COMPLETION
Report ends with: wiring inventory (reset request + update screen incl. captcha threading; interstitial; Google button), gate results, production evidence, Phase 8 status, allow-list/config before-after (values only, no secrets), deviations. Commit prompt + report → approval → docs push.
