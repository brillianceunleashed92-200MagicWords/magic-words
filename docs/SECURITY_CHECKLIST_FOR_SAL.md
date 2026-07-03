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
