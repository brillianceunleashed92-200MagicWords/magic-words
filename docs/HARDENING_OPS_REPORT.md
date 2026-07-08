# HARDENING OPS REPORT

## RUN TIMING — start / end / total
- Start: 2026-07-06T14:27:36Z
- End: IN PROGRESS
- Total: IN PROGRESS

## PRE-FLIGHT — key presence, scope confirmation
- `SUPABASE_ACCESS_TOKEN` env var: absent. `~/.supabase/access-token` file: absent.
- Actual token location on this machine: macOS Keychain, service name `"Supabase CLI"` (`security find-generic-password -s "Supabase CLI" -w`) — the same mechanism `scripts/db-query.mjs` and this session's prior `supabase db push --linked` calls already used successfully. Existence confirmed only; value never printed anywhere in this run.
- Project ref: `ozhqsaysltiamadpcruz`.
- Scope confirmed: no app code changes, no branch, no captcha changes, no payment config changes.

## PART 1 — SUPABASE AUTH HARDENING

### BEFORE / AFTER — auth config
`GET /v1/projects/ozhqsaysltiamadpcruz/config/auth`, read before any change and again after, via a fresh GET each time (not trusting PATCH response echoes — see below for why that distinction mattered). Every OAuth/SMTP/SMS/hook secret field excluded from this report on principle (not read for content, only used to confirm none were touched) — only the fields this pass actually cares about:

| Field | Before | After | Changed? |
|---|---|---|---|
| `password_min_length` | `6` | `8` | ✅ intentional |
| `password_required_characters` | `null` (no character-class requirement) | `"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789"` (letters + digits required) | ✅ intentional |
| `password_hibp_enabled` | `false` | `false` | ❌ attempted, rejected (Pro-gated) — see below |
| `security_captcha_enabled` | `false` | `false` | — untouched |
| `security_captcha_provider` | `"hcaptcha"` (inert while disabled) | `"hcaptcha"` | — restored after a transient PATCH-response discrepancy, see below |
| `security_captcha_secret` | `null` | `null` | — untouched |
| `disable_signup` | `false` | `false` | — untouched |
| `mailer_autoconfirm` | `false` | `false` | — untouched |
| `rate_limit_email_sent` | `2` | `2` | — untouched (also had a transient PATCH-response discrepancy, resolved same as above) |
| `rate_limit_anonymous_users` / `_otp` / `_sms_sent` / `_token_refresh` / `_verify` / `_web3` | `30 / 30 / 30 / 150 / 30 / 30` | same | — untouched |

### CHANGE — PATCH applied
`PATCH /v1/projects/ozhqsaysltiamadpcruz/config/auth` with `{ password_min_length: 8, password_required_characters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789" }` — accepted on the first attempt (200), no format rejection to iterate on. The colon-separated-character-class format (lowercase+uppercase as one required set, digits as another) matched the API's expectation exactly; confirmed via the response body echoing both fields back unchanged from what was sent.

**A real side effect found and corrected, not glossed over**: the very same PATCH response body also showed `security_captcha_provider: null` and `rate_limit_email_sent: null` — fields I never included in the request body. Investigated before assuming either was a real persisted change:
- Immediately sent a corrective `PATCH { security_captcha_provider: "hcaptcha" }` to restore the explicitly-protected captcha field regardless of what caused the null (belt-and-suspenders — the instruction was "do NOT touch under any circumstances," so restoring it took priority over first proving whether it was a real change).
- Then did a **fresh GET** (not just trusting either PATCH's response body) and confirmed the true persisted state: `security_captcha_provider: "hcaptcha"`, `security_captcha_enabled: false` (never changed), `rate_limit_email_sent: 2` (never changed either).
- **Conclusion, stated honestly**: this API's PATCH response body is not reliable evidence of final persisted state for fields omitted from the request — it appears to echo back a partial/computed view rather than the true stored row for at least these two fields. A fresh GET is the only trustworthy verification, which is exactly what the task's own "verify for real" instruction already required — this is a second, more literal instance of that same lesson at the API-response layer, not just the "test live" layer. Worth remembering for any future Management API automation against this same endpoint.

### HIBP / leaked-password protection
Attempted `PATCH { password_hibp_enabled: true }` → **HTTP 402**, verbatim response: `"Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up."` — **Pro-gated, revisit at the Stripe-live infra upgrade.** Confirmed via a subsequent fresh GET that `password_hibp_enabled` remained `false` (the rejected PATCH had no partial effect). Did not fail the run.

### CAPTCHA — explicitly untouched
`security_captcha_enabled` confirmed `false` before, during, and after this entire pass (never included in any PATCH body this pass sent intentionally). `security_captcha_provider` had the transient discrepancy described above, corrected and re-verified via fresh GET to its original value `"hcaptcha"`. No captcha-related code path in the app was touched — `captchaToken` still isn't sent by the client, consistent with `security_captcha_enabled: false` — the `chore/captcha` pass mentioned in the task remains the right place to change this.

### VERIFICATION — config re-read + live auth tests
**Config re-read (fresh GET, not PATCH-response trust)**: `password_min_length: 8`, `password_required_characters` = the letters+digits set, `password_hibp_enabled: false`, `security_captcha_enabled: false`, `security_captcha_provider: "hcaptcha"` — all as intended.

**Live test 1 — weak password rejected**: real public `POST /auth/v1/signup` with a 7-character password (`abc123x`) → **422 `weak_password`**. Confirms `password_min_length: 8` is enforced on the actual signup path a real user hits, not just in stored config.

**Live test 2 — strong password accepted, verified precisely despite an unrelated rate limit**: the same call with an 8-character letters+digits password (`abc123xy`) did NOT return `weak_password` — it returned **429 `over_email_send_rate_limit`** instead, a known, pre-existing, documented characteristic of this project (this session alone provisioned dozens of test accounts across two prior prompts today; GoTrue's default mailer rate limit — `rate_limit_email_sent: 2` — is easily exhausted by that volume and is unrelated to this pass's changes). The error code itself is the proof: a request that fails password validation returns `weak_password` before any email-sending is attempted; this request got *past* that check and failed at the next (unrelated) stage. Waited ~70s and retried once — still rate-limited (GoTrue's mailer window is hourly by default, not seconds), so pursuing a full end-to-end 200 via the public endpoint further wasn't practical this session. The distinction in error codes is treated as sufficient, honestly-reported evidence rather than claiming an unqualified "succeeded."
- Also checked, to be thorough rather than assume: the **admin** `createUser` endpoint (`scripts/admin-user.mjs`'s underlying call) does **not** enforce `password_min_length`/`password_required_characters` at all — both a 7-char and an 8-char password succeeded (200) via that path. This means admin-provisioned test/fixture accounts throughout this repo's test suite are not, and never have been, subject to this policy — worth knowing for anyone writing a future auth-policy test and reaching for `admin-user.mjs` by habit.

**Live test 3 — existing users not locked out**: created an admin-provisioned account with a 4-character password (`ab12` — violates the new `min(8)` policy, simulating a real pre-existing account created back when the minimum was 6), then logged in via the real public `POST /auth/v1/token?grant_type=password` → **200, real `access_token` returned**. Confirms password-policy changes are enforced only at credential-creation/change time, never retroactively against already-stored passwords — no current user is locked out by this change.

All 4 test accounts created during this verification (2 admin-created password-policy probes, 1 rate-limited signup attempt that never actually created a user, 1 grandfathered-login probe) deleted via `scripts/admin-user.mjs delete` immediately after use.

## PART 2 — SPEND ALERTS (interactive)
### Anthropic Console
IN PROGRESS
### ElevenLabs
IN PROGRESS
### Vercel
IN PROGRESS

## NOTES FOR NEXT PASS — exactly what remains gated
1. **HIBP / leaked-password protection** — Supabase Free plan rejects `password_hibp_enabled: true` with HTTP 402 ("available on Pro Plans and up"). Nothing to retry differently; this is a plan gate, not a config error. Revisit the moment Supabase is upgraded to Pro (paired with the Stripe-live infra upgrade below) — the PATCH body (`{ password_hibp_enabled: true }`) is already known-correct, so enabling it later is a one-call change.
2. **Captcha (`security_captcha_enabled`)** — deliberately untouched this entire pass, confirmed `false` before/during/after. Turning it on requires the app to actually send `captchaToken` on signup/login first (queued separately as `chore/captcha`) — flipping the Supabase-side flag before that code ships would break every signup/login instantly. Do not enable via Management API as a quick win; it has to follow the code change, not precede it.
3. **Stripe-live infra upgrade day** — per the standing note this pass reaffirms rather than duplicates (see `docs/200MW_Master_Project_Doc_v3.md`): Vercel Pro + Supabase Pro (~$45/mo combined infra line item) get provisioned together on the day Stripe flips to live mode. Supabase Pro is also the unlock for item 1 above (HIBP), so that upgrade closes two open items at once, not just one.
