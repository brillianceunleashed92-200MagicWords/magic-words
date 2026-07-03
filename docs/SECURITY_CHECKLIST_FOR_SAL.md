# Security Checklist for Sal

Dashboard-side settings, key rotations, and other items code cannot fix — compiled
during the `security-hardening` branch work, phase by phase. Each item has the exact
click-path and, where determinable, the **current live value** (pulled directly via
the Supabase Management API / Vercel API, not assumed) next to the **recommended**
value.

---

## 🔴 Phase 0 — Key rotation (do this first, before anything else)

**Status: UNCONFIRMED.** During Phase 2 development, live Stripe keys (`sk_live_...`,
`pk_live_...`) and a live ElevenLabs key were pasted into a plaintext chat. Rotation
was recommended at the time; whether it happened is unknown, and could not be
confirmed with the tooling available in this session (no Stripe CLI authentication,
no ElevenLabs dashboard access).

What *could* be confirmed: the Stripe keys currently deployed to Vercel
(`STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`) are `sk_test_.../pk_test_...` —
**test mode**, not live. So the app itself cannot currently process a real charge
even if the leaked live key is still valid. That does **not** resolve the underlying
exposure: anyone holding a live `sk_live_...` key can call Stripe's API directly
(create real charges against stored payment methods, issue refunds, read customer
PII) with zero relationship to this codebase. Treat as still-live risk until
confirmed otherwise.

- [ ] **Stripe**: Dashboard → Developers → API keys → find the live secret key →
      "Roll key" → update `STRIPE_SECRET_KEY` in Vercel (Production **and** Preview
      environments) → redeploy.
- [ ] **ElevenLabs**: Profile/Settings → API Keys → regenerate → update
      `ELEVENLABS_API_KEY` in Vercel (Production **and** Preview) → redeploy.
- [ ] After rotating, confirm the *old* key is actually rejected (a quick `curl` with
      the old key should 401) — rolling a key in the dashboard sometimes has a short
      grace period.

---

## 🟡 Phase 1 — Auth dashboard settings

Pulled live via `GET /v1/projects/ozhqsaysltiamadpcruz/config/auth` (Supabase
Management API) on 2026-07-03 — these are the **actual current values**, not
assumptions.

| Setting | Current | Recommended | Dashboard path |
|---|---|---|---|
| Email confirmation required | `mailer_autoconfirm: false` → **ON already** ✅ | ON | Authentication → Providers → Email → "Confirm email" |
| Password minimum length | **6** | ≥ 8 | Authentication → Policies → Password → Minimum password length |
| Password strength (HIBP breach check) | OFF | ON (blocks known-breached passwords, free) | Authentication → Policies → Password → "Check against HaveIBeenPwned" |
| OTP / recovery link expiry | `mailer_otp_exp: 3600` (1 hr) → **already compliant** ✅ | ≤ 1 hr | Authentication → Providers → Email → OTP expiry |
| Refresh token rotation | `true` → **already ON** ✅ | ON | Authentication → Sessions → Refresh token rotation |
| Refresh token reuse interval | 10s (grace window) | fine as-is | Authentication → Sessions |
| Redirect URI allow-list | **empty** (`uri_allow_list: ""`) — means only the exact `site_url` works | Add `https://*.vercel.app/**` if preview-deployment auth flows (password reset, email confirm) need to work; otherwise leave empty — it's the *more* restrictive/secure option, not a gap | Authentication → URL Configuration → Redirect URLs |
| Site URL | `https://200magicwordsapp.com` — correct | no change | Authentication → URL Configuration |
| CAPTCHA on signup/signin | OFF | ON (hCaptcha or Turnstile — Supabase supports both natively) — kills scripted signup abuse, see Phase 5 | Authentication → Attack Protection → CAPTCHA |
| Rate limit — email sent | 2/hour | fine for a low-signup-volume app; revisit if signup volume grows | Authentication → Rate Limits |
| Rate limit — OTP/verify/token-refresh | 30–150/hour range | Supabase defaults are reasonable; no change recommended | Authentication → Rate Limits |
| Session inactivity timeout | 0 (disabled) | Consider 30 days for a kids' app on shared family devices — balances convenience against a lost/stolen device sitting logged in forever | Authentication → Sessions → Inactivity timeout |

**Code-side finding, already fixed** (see commit `e79cd3b`): the live app had no
sign-out button at all. Added to Parent Portal → Settings. No dashboard action needed
for this one.

---

## 🔴 Phase 2 — IDOR (fixed in code, no dashboard action needed)

Found and fixed: `word_progress` had Row Level Security **completely disabled** —
any signed-in user could read/write any child's progress data. Also found and fixed
gaps on `learning_plans`, `profiles`, `class_members`, `parent_child_links`,
`teacher_classes`, `achievements`, plus an unbounded-amount bug in the `earn_sparks()`
database function, and two Stripe endpoints (`create-checkout-session`,
`create-portal-session`) that trusted a client-supplied user ID with zero
verification — letting anyone open another user's Stripe billing portal. Full detail
in the commit message (`0ca2590`) and `scripts/idor-proof.mjs` (a real cross-account
attack simulation against the live database — all attempts now correctly fail).
No dashboard action needed; this was all fixed in migrations/code.

---

## 🟡 Phase 3 — Secrets

- [ ] **See Phase 0 above** — the live Stripe/ElevenLabs key rotation is the
      actionable item here too; not duplicating it.
- Frontend bundle audit: clean. Built the app and grepped `dist/` for every secret
  pattern (`sk_`, `whsec_`, `service_role`, `ANTHROPIC`, `ELEVENLABS`) — none found.
  Only the intentionally-public Supabase anon key and Stripe publishable key appear,
  exactly as expected.
- `.env`/`.env.local` confirmed gitignored and never committed (`git log --all
  --full-history -- .env .env.local` returns nothing).
- The `src/supabaseClient.js` hardcoded-production-fallback issue named in this
  session's brief was **already fixed in an earlier phase** (commit `35248cc`,
  already on `main`) — it now throws a hard startup error if env vars are missing,
  rather than silently defaulting to production. No action needed here.
- Full-history secret scan: manual grep pass found 7 hits, all confirmed false
  positives (this session's own report text mentioning key *prefixes* as
  documentation, a `.env.example` placeholder literally named
  `whsec_YOUR_STRIPE_TEST_WEBHOOK_SECRET`, and the intentionally-public Supabase
  anon key). Followed up with `gitleaks detect` across the full history (108
  commits, ~149MB scanned, ~4 minutes): **2 findings, both confirmed false
  positives** — a cache-key-prefix string (`mw_parent_digest_v1_`) that just
  happens to look high-entropy to a generic pattern matcher, and the same
  intentionally-public Supabase anon key found manually. **No real secret found
  anywhere in git history.** This doesn't contradict the Phase 0 live-key-in-chat
  incident — that key was pasted into a chat conversation, never into this repo, so
  it wouldn't show up in a repo scan regardless of rotation status. Rotation is
  still the open item, tracked in Phase 0 above.

---

## 🟢 Phase 4 — Input validation

All fixed in code, no dashboard action needed. See commit `3c5e53d`: hardened
api/speak.mjs, api/story-engine.js (including a real prompt-injection gap in the
child-name field), api/session-generator.js, and a client-side name-length limit.

---

## 🟠 Phase 5 — Abuse & rate limiting

Code-side (auth requirement + per-user rate limits on all 4 AI/TTS endpoints, TTS
response caching) all fixed — see commit `01fc135`. Two items need Sal:

- [ ] **CAPTCHA on signup/signin** (also listed in Phase 1 above — same item,
      cross-referenced here since it's specifically the anti-abuse control for
      unauthenticated signup spam): Authentication → Attack Protection → CAPTCHA →
      enable hCaptcha or Turnstile. Currently OFF.
- [ ] **Set spend alerts/limits** — this app now has real per-user rate limits, but
      those cap *abuse from one account*, not total spend if the app succeeds
      wildly or if per-user limits turn out to be too generous in practice:
  - [ ] **Anthropic Console** → Settings → Billing → set a monthly spend limit
        and an alert threshold below it.
  - [ ] **ElevenLabs** → Subscription/Usage → set a usage alert (character quota
        warnings).
  - [ ] **Vercel** → Project Settings → set a spend/usage alert if on a plan that
        supports it (function invocation count, bandwidth).

---

## 🟢 Phase 6 — Deployment, headers & monitoring

All code-side (security headers + CSP in Report-Only mode, restored the SPA rewrite
that had been silently deleted since March, fixed the health-check info leak, webhook
failure logging, security event logging, `npm audit fix` for 9 of 10 vulnerabilities)
— see commit for this phase. Two items need Sal:

- [ ] **Switch the CSP from Report-Only to enforcing.** `vercel.json` currently ships
      `Content-Security-Policy-Report-Only` — it logs violations to the browser
      console without blocking anything, deliberately, so a misconfigured policy
      can't break the live app silently. Verified during this session's own testing
      that the policy as written doesn't fire any violations for the real app flows
      exercised (sign-in, play a session, audio, Parent Portal, Stripe checkout
      redirect) — see the session's closing report for exactly what was checked. If
      nothing new turns up after a few days of real traffic, flip the header key from
      `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in
      `vercel.json` to actually start blocking violations, not just logging them.
- [ ] **Database network restrictions** (if your Supabase plan supports it) —
      Dashboard → Settings → Database → Network Restrictions → restrict direct
      Postgres connections to known IPs. Confirmed no direct Postgres connection
      string is ever referenced client-side (grepped), so this is defense-in-depth
      on top of that, not a fix for an active leak.
---

## 🟢 Phase 7 — COPPA baseline

All code-side work done: `docs/COPPA_DATA_INVENTORY.md` (full data inventory —
please route to counsel, it's the starting point for review, not a legal
document), a real account-deletion flow (Settings → "Delete account & all data",
verified end-to-end against a live test account with 7 tables of seeded data —
every row and every Storage object confirmed actually gone afterward, not just
assumed from the code), a parental-consent checkbox at signup (recorded with a
timestamp in the user's own auth metadata), and `/privacy` + `/terms` pages —
**both explicitly marked DRAFT** in their own banner, not real policy language.

- [ ] **Legal review of `docs/COPPA_DATA_INVENTORY.md`** and the draft
      `/privacy` + `/terms` pages before this product takes real payments in
      live Stripe mode. The inventory doc has specific open items flagged at
      the bottom (verifiable-parental-consent mechanism, the unused
      `child_profiles.age` column, whether the self-service delete alone
      satisfies COPPA's deletion-on-request timing requirements) — start there.
- Found and fixed in passing while building the deletion flow: several tables
  (`achievements`, `learning_events`, `learning_plans`, `session_plans`,
  `user_streaks`, `word_progress`) were missing `ON DELETE CASCADE` on their
  `child_id`/`user_id` foreign keys — meaning a parent trying to delete their
  account today would likely have hit a database error partway through, the
  same bug class migration 0013 found and fixed for `child_profiles.parent_id`
  back in June. Fixed in migration 0018.

---

- **Not fixed, flagged for manual review**: `npm audit` still reports 1 moderate
  vulnerability (`@anthropic-ai/sdk`, a path-validation issue in its local-filesystem
  "memory tool" feature — this app only uses `messages.create()`, never that
  feature). Fixing it requires `npm audit fix --force`, a 30-version jump
  (0.80.0 → 0.110.0) that very likely has breaking API changes — outside this
  session's "non-breaking only" scope. Worth a deliberate upgrade + test pass later,
  not an urgent risk given the unused feature surface.
