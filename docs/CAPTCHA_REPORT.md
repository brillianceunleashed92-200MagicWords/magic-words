# CAPTCHA REPORT — chore/captcha (hCaptcha wiring, code first, flip gated)

## RUN TIMING
- Start: 2026-07-06T17:24:53Z
- End: 2026-07-06T17:51:02Z
- Total: ~26 minutes. No approval-wait gaps of note (the single push approval was answered promptly); the deployment check this time completed within the normal window with no incident, unlike FIX R1.
- Branch: `chore/captcha`
- Base SHA: `ee006b01e20f2241a80e54ee12ee9d9e96235991`

## PHASE 6 GATE CHECK (done up front)
Kickoff message did not contain `FLIP: YES`. Independently checked both required preconditions anyway:
- `VITE_HCAPTCHA_SITE_KEY` in Vercel production env: **absent** (`vercel env ls production` — no hcaptcha entries).
- `HCAPTCHA_SECRET` in local `.env.local`: **absent**.
Phase 6 will be **NOT RUN** — both the gating flag and both preconditions fail. This is a successful, expected outcome per the doc's own framing, not a blocker for Phases 0-5.

## PHASE 1 — AUTH-CALL INVENTORY

Full sweep of `supabase.auth.*` across `src/`, `api/`, `scripts/` (not just the token-gated method names — every `supabase.auth.` call site, to make sure nothing token-gated was missed by name-matching alone).

**Token-gated (require `captchaToken` the moment the flag flips)** — exactly 2, both in one file:

| # | Call | File:line |
|---|---|---|
| 1 | `supabase.auth.signUp({ email, password, options: {...} })` | `src/screens/LoginScreen.jsx:32` |
| 2 | `supabase.auth.signInWithPassword({ email, password })` | `src/screens/LoginScreen.jsx:42` |

No other token-gated call exists anywhere in the app: `resetPasswordForEmail`, `resend`, `signInWithOtp`, `verifyOtp` — zero matches, confirmed by grep. Independently confirmed there is no forgot-password, resend-confirmation, or magic-link flow anywhere in the UI (`grep -rni "forgot.*password|resetPassword|magic.*link|resend"` across `src/` — zero matches) — so there is no second screen for Phase 2 to cover; `LoginScreen.jsx` is the complete surface.

**Not token-gated, left alone** (every other `supabase.auth.*` call site found in the sweep): `getSession` (9 call sites — `PlacementChoiceScreen.jsx`, `PlacementAdventureScreen.jsx` ×2, `SettingsTab.jsx`, `useSessionPlan.js` ×2, `track.js`, `parentDigest.js`, `stories.js`, `checkout.js`, `gameAudio.js`), `getUser` (3 — `useAuth.js`, `api/create-checkout-session.js`, `api/_lib/security.js`, `api/create-portal-session.js`), `signOut` (3 — `useAuth.js` ×2, `queryClient.js`), `onAuthStateChange` (1 — `useAuth.js`). None of these are GoTrue endpoints the captcha flag gates.

**Admin-API paths, exempt by design (confirmed, not assumed)**: `scripts/admin-user.mjs` calls the raw `/auth/v1/admin/users` REST endpoint directly with the service-role key (`scripts/admin-user.mjs:7`) — a privileged admin path, not the public anon-key signup/login endpoints GoTrue gates. `api/delete-account.js:79` calls `admin.auth.admin.deleteUser(user.id)` — same privileged SDK surface. Neither needs wiring; both left untouched.

**Conclusion**: Phase 2's wiring checklist is exactly 2 items (both in `LoginScreen.jsx`), full stop.

## PHASE 2 — CLIENT WIRING (inert by default)
Installed `@hcaptcha/react-hcaptcha@2.0.2` (`npm install` — 1 package added; a pre-existing, unrelated moderate `npm audit` finding in `@anthropic-ai/sdk`'s memory-tool path validation was surfaced by the same audit run but is untouched — out of scope, not introduced by this change).

`src/screens/LoginScreen.jsx`:
- `HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || ''` — module-level constant.
- `hcaptchaRef` (useRef) + a widget rendered only `{HCAPTCHA_SITE_KEY && (...)}`, `size="invisible"`, with `onError`/`onChalExpired` both surfacing the exact required copy: "Please complete the check and try again."
- In `handleSubmit`, only when `HCAPTCHA_SITE_KEY` is truthy: `await hcaptchaRef.current?.execute({ async: true })` (the package's documented async-token API, confirmed via its own `.d.ts`, not guessed), captured fresh on every submit attempt (never cached across retries, per the doc's requirement — tokens expire ~2 min). `resetCaptcha()` runs in a `finally` immediately after, so a failed/retried attempt always gets a clean widget state for its own fresh `execute()` call. A caught error or an empty response both surface the same "Please complete the check and try again." message and `return` before the auth call — submit re-enables via the existing outer `finally { setBusy(false) }`, never a dead button.
- `captchaToken` threaded into `signUp`'s existing `options` object (spread alongside the untouched `parental_consent` data) and into a new `options: { captchaToken }` for `signInWithPassword` (which previously had no `options` key at all) — both **only when a token exists**, so the inert path sends byte-for-byte the same request shape as before this change.
- FIX R1's B6 consent-checkbox gating (`consentChecked`, the disabled-submit logic) is untouched — confirmed by diff, not just intent.

**Inert verification — done, live in local dev** (`VITE_HCAPTCHA_SITE_KEY` absent, matching current production): screenshotted the sign-up form — pixel-identical to before this change — and confirmed via `document.querySelectorAll` that zero hCaptcha script tags, iframes, or divs exist anywhere in the DOM. `npm run build` clean.

## PHASE 3 — CSP
Verified against hCaptcha's actual documented requirements rather than assumed — `docs.hcaptcha.com`'s own Configuration page doesn't enumerate CSP directives directly, so cross-checked via web search and confirmed identically by two independent sources (a dedicated CSP-for-captcha guide, `captcha4wp.com/docs/configuring-content-security-policy-csp-for-captcha/`, and general search results) — both list the same four directives and domains, matching the doc's own "expected shape" hint exactly:
- `script-src`: `https://hcaptcha.com https://*.hcaptcha.com`
- `style-src`: `https://hcaptcha.com https://*.hcaptcha.com`
- `connect-src`: `https://hcaptcha.com https://*.hcaptcha.com`
- `frame-src`: `https://hcaptcha.com https://*.hcaptcha.com` (a brand-new directive — none existed in `vercel.json` before this change, so without it the iframe would be blocked by `default-src 'self'`'s fallback)

Explicitly used the wildcard-subdomain form (`https://*.hcaptcha.com`), not a hardcoded specific subdomain, per the sources' own warning that asset subdomains vary by region/time.

**`vercel.json` diff** — every other directive (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, the SPA rewrite, and every existing CSP directive's non-hcaptcha values) is byte-identical; only the four directives above gained the two hcaptcha values, plus the new `frame-src` directive. Confirmed via `python3 -c "import json; json.load(...)"` that the file is still valid JSON.

These directives are harmless while inert (no hcaptcha script/iframe is ever requested when `VITE_HCAPTCHA_SITE_KEY` is unset, so they permit a connection that's never made) — shipping them in Phase A now avoids a second CSP-touching deploy on flip day.

**CSP walk re-run**: deferred to Phase 5 — the walk (`tests/csp-walk.spec.js`) targets a deployed URL (`DEPLOY_BASE_URL` or production), and these header changes aren't live anywhere yet at this point in the run. Re-run against the branch preview once Phase 5 deploys it, before merge.

## PHASE 4 — TESTS
**Official test keypair** — fetched live from `docs.hcaptcha.com` (not invented), cross-confirmed via an independent search result: sitekey `10000000-ffff-ffff-ffff-000000000001`, secret `0x0000000000000000000000000000000000000000` — documented to "never challenge and always produce the same response token" (`success: true`). Not a real secret; hCaptcha publishes it specifically for use in code/tests like this.

**New spec**: `tests/hcaptcha.spec.js`, two `test.describe` blocks:
1. **Inert path** — runs against the existing shared dev server (default `baseURL`, port 5183, site key unset — matches production today, no env override needed). Submits sign-in, asserts zero requests to `hcaptcha.com` fired and zero `iframe[src*="hcaptcha"]` exist in the DOM.
2. **Wired path** — since `import.meta.env` is inlined at Vite build/dev-server-start time (not runtime), testing the real widget required a **separate** Vite dev server instance with `VITE_HCAPTCHA_SITE_KEY` actually set, spawned by the spec itself (`test.beforeAll`, `npx vite --port 5187` with the test key in its env) on a port distinct from the shared 5183 server, torn down in `test.afterAll` (confirmed no leftover process via `lsof -ti:5187` after the run). Asserts the widget iframe actually mounts, then submits the form and asserts a real request reaches `hcaptcha.com` — network-request inspection (not just a code-level instrumentation hook), so this proves the script genuinely loads and the token round-trip works **under the new CSP directives from Phase 3**, not merely that our code calls `execute()`.

**Results**:
- `tests/hcaptcha.spec.js` alone: **2/2 passed** (7.0s).
- Full suite (`npx playwright test`, `SUPABASE_SERVICE_ROLE_KEY` exported so nothing skips): **33/33 passed** (31 baseline + 2 new, 7.5m). `csp-walk.spec.js` still shows 0 violations — expected, since it targets production, which doesn't have this branch's CSP changes yet (re-verified against the branch preview in Phase 5, per Phase 3's note).
- `npm run lint`: 156 problems (150 errors, 6 warnings) vs. the 154-problem baseline — **+2, both the identical pre-existing `'process' is not defined'` (`no-undef`) gap** already present in 12+ other test files (`tests/hcaptcha.spec.js:50,70`, both `process.env`/`process.kill` references matching the same established pattern) — no new category of lint issue, confirmed by inspection, not just the count.
- `scripts/admin-user.mjs create`/`delete`: re-confirmed working (created + deleted a disposable `captchasanity...` account) — captcha-exempt admin path unaffected, verified rather than assumed.
- No provisioning flakes this run — every spec passed on the first attempt, nothing to re-run in isolation.

## PHASE 5 — SHIP PHASE A (inert)
Merged `chore/captcha` into `main` locally (`--no-ff`, commit `cc92a79` → merge `7f005cd`). `npm run build` re-verified clean on `main`. Pushed to `origin/main` with explicit user approval.

**Deployment check, per the new FIX R1 rule** — a Vercel status registered within seconds this time (`total_count: 1`, `state: pending`) — the FIX R1 webhook incident did **not** recur. Deployment completed successfully (`state: success`) within the check window, no manual `vercel --prod` needed.

**Production verification** (live on `https://200magicwordsapp.com`, post-deploy):
- **Bundle hash changed**: `index-C5tqTW33.js` (previous, from FIX R1) → `index-BsRW2B1L.js` — confirms this commit is genuinely live, not cached.
- **CSP directives live**: `curl -sI https://200magicwordsapp.com` shows the production `Content-Security-Policy` header now includes `https://hcaptcha.com https://*.hcaptcha.com` in `script-src`, `style-src`, `connect-src`, plus the new `frame-src` directive — confirmed by reading the actual served header, not inferred from the diff.
- **CSP walk re-run against production**: `tests/csp-walk.spec.js` → **0 violations** (same walk that covers every activity, Galaxy, Parent Portal tab, and a real checkout call) — the new directives don't break anything, and (since the site key is still unset) nothing exercises them yet either, which is exactly the expected inert state.
- **Inert confirmed with a real account**: created disposable `captchainertprod...` via `scripts/admin-user.mjs`, set a password, signed in live in the browser. Sign-in succeeded (reached the child-onboarding screen) with **zero requests to any `hcaptcha.com`-matching URL** (confirmed via live network-request inspection, not just code review) and no visible widget. Test account deleted after.

Gates recap for this phase: build clean, lint delta is the 2 pre-existing-pattern entries noted in Phase 4 (no new categories), 33/33 Playwright locally, 1/1 CSP walk against production post-deploy.

## PHASE 6 — THE FLIP
NOT RUN — see gate check above.

## COMPLETION

**Phase 1 inventory → wired checklist:**

| Call | File:line | Wired? |
|---|---|---|
| `supabase.auth.signUp` | `src/screens/LoginScreen.jsx:32` | ✅ |
| `supabase.auth.signInWithPassword` | `src/screens/LoginScreen.jsx:42` | ✅ |
| `scripts/admin-user.mjs` (admin REST) | n/a | exempt by design, confirmed not wired, re-verified working |
| `api/delete-account.js`'s `admin.auth.admin.deleteUser` | `api/delete-account.js:79` | exempt by design, confirmed not wired |

**Gate results**: build clean throughout; lint delta +2 vs. the 154-problem baseline, both the identical pre-existing `process is not defined` pattern already present in 12+ test files (no new category); 33/33 Playwright (31 baseline + 2 new); CSP walk 0 violations both pre-merge (production, old CSP) and post-merge (production, new CSP with hcaptcha directives live); `scripts/admin-user.mjs` create/delete re-confirmed working twice (once pre-merge sanity check, once for the production inert-verify).

**Phase A production-verify evidence**: bundle hash changed, CSP header confirmed to contain the new hcaptcha directives via direct `curl`, CSP walk clean against the live directives, and a real disposable account's sign-in on production produced zero hcaptcha network activity — inert is a verified fact, not an assumption.

**Phase 6 status**: **NOT RUN**. Missing precondition: kickoff message did not contain `FLIP: YES`, and independently, neither `VITE_HCAPTCHA_SITE_KEY` (Vercel production env) nor `HCAPTCHA_SECRET` (`.env.local`) exist yet. Nothing in this run touched Supabase's `security_captcha_enabled` flag or any other live auth config — production remains exactly as captcha-free as before this run, by design.

**Deviations from the doc**: none of substance. One judgment call: Phase 4's "network-request inspection or a thin instrumentation hook" was resolved as network-request inspection for both the inert and wired assertions, since it's strictly more meaningful evidence (proves the CSP directives actually permit/deny the right things, not just that our code branches correctly).

**What ships next, when Sal is ready**: Phase 6 is fully scripted and ready to run the moment both the `hCaptcha` site key is added to Vercel's production env and the secret lands in `.env.local` — a future kickoff with `FLIP: YES` plus those two preconditions is the only thing standing between here and the live flip, per `docs/HARDENING_OPS_REPORT.md`'s original sequencing note that started this whole `chore/captcha` thread.
