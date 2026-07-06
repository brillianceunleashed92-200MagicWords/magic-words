import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import HCaptcha from '@hcaptcha/react-hcaptcha';

// chore/captcha Phase 2 — inert by default: when this env var is unset
// (all of Phase A ships with it unset in production), HCAPTCHA_SITE_KEY
// is '', the widget below never renders, execute() is never called, and
// no captchaToken is ever attached — byte-for-byte the pre-existing
// signUp/signInWithPassword calls. Only becomes live once Phase 6 (the
// separately gated Supabase-side flip) sets both this var AND the
// server-side security_captcha_enabled flag together.
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '';

// feat/auth-r1 Phase 2 — resetPasswordForEmail is captcha-token-gated the
// moment the flag flips, same as signUp/signInWithPassword, so it must be
// born wired rather than bolted on later.
const RESET_COOLDOWN_SECONDS = 60;
const RESET_GENERIC_SUCCESS = "If an account exists for that email, a reset link is on its way. Check spam too.";
const RESET_GENERIC_ERROR = "Something went wrong — try again in a minute.";

// feat/auth-r1 Phase 5 — inert by default, same pattern as the hCaptcha
// flag above: unset in production for all of Phase A, so this button
// never renders. Only becomes live once Phase 8 (separately gated) sets
// this AND the Supabase-side Google provider together.
const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true';

async function handleGoogleSignIn() {
  // Redirect flow only — no Google GIS JavaScript is ever loaded, so this
  // needs no CSP allowance (confirmed against the client library's own
  // source: signInWithOAuth does a plain window.location.assign to
  // Supabase's /authorize endpoint, never a script load or iframe).
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
}

// LEGAL_PAGES_R1 Phase 2 — persistent links to the three published
// policies, required on "the auth screens at minimum" per the doc.
// Rendered under every LoginScreen mode (sign_in, sign_up, reset_request).
function AuthFooterLinks() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16, fontSize: 11, opacity: 0.55 }}>
      <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "#fff" }}>Privacy Policy</a>
      <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "#fff" }}>Terms of Service</a>
      <a href="/refunds" target="_blank" rel="noreferrer" style={{ color: "#fff" }}>Refund Policy</a>
    </div>
  );
}

// Extracted verbatim from the legacy App.jsx (was a nested component with
// no logic changes) so the new componentized shell can reuse it without
// touching auth behavior — restyling the auth surface itself is out of
// Phase 1 scope (see docs/mlc-engine-audit.md section 8 / CLAUDE.md's
// "Auth flow" note), so it deliberately still looks like the legacy
// dark/starfield theme rather than Candy Galaxy tokens. A seam, not a bug.
export default function LoginScreen({ authError }) {
  const [authMode, setAuthMode] = useState("sign_in"); // sign_in | sign_up | reset_request
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetCooldown, setResetCooldown] = useState(0);
  const hcaptchaRef = useRef(null);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const id = setTimeout(() => setResetCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resetCooldown]);

  // Shared by every captcha-token-gated auth call (signUp,
  // signInWithPassword, resetPasswordForEmail). Executed fresh per
  // attempt, never cached — hCaptcha tokens expire in ~2 minutes, so a
  // retried submit must fetch a new one, not reuse a stale/expired one
  // from an earlier attempt. Returns `{ token }` on success, or `{ error }`
  // with the exact user-facing message to show (or `{}` — no site key,
  // fully inert, nothing to attach). Never throws.
  async function getCaptchaToken() {
    if (!HCAPTCHA_SITE_KEY) return {};
    try {
      const result = await hcaptchaRef.current?.execute({ async: true });
      const token = result?.response;
      if (!token) return { error: "Please complete the check and try again." };
      return { token };
    } catch {
      return { error: "Please complete the check and try again." };
    } finally {
      hcaptchaRef.current?.resetCaptcha();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    setBusy(true);
    try {
      const email = authEmail.trim();
      const password = authPassword;
      if (!email || !password) { setLocalError("Please enter an email and password."); return; }
      if (authMode === "sign_up" && !consentChecked) {
        setLocalError("Please confirm you're the parent/guardian to continue.");
        return;
      }

      const { token: captchaToken, error: captchaError } = await getCaptchaToken();
      if (captchaError) { setLocalError(captchaError); return; }

      const res = authMode === "sign_up"
        ? await supabase.auth.signUp({
            email, password,
            // Records that a parental-consent checkbox was checked and when —
            // a code-level starting point, not a substitute for whatever
            // specific verifiable-parental-consent mechanism COPPA requires
            // for this product (see docs/COPPA_DATA_INVENTORY.md's open
            // items). user_metadata is the simplest durable place for this;
            // no new table needed for a single boolean + timestamp.
            options: {
              data: { parental_consent: true, parental_consent_at: new Date().toISOString() },
              ...(captchaToken ? { captchaToken } : {}),
            },
          })
        : await supabase.auth.signInWithPassword({
            email, password,
            ...(captchaToken ? { options: { captchaToken } } : {}),
          });
      if (res.error) setLocalError(res.error.message);
      else if (authMode === "sign_up") setSignedUpEmail(email);
    } finally {
      setBusy(false);
    }
  }

  // Phase 2 — anti-enumeration is non-negotiable: byte-identical UI
  // regardless of whether the account exists. Supabase's own
  // resetPasswordForEmail already never reveals existence via its
  // response shape (data/error), but EVERY error path here (including
  // rate-limit responses, which could otherwise leak existence via
  // differing frequency) collapses to the same generic message — never
  // res.error.message, which could differ by cause.
  async function handleResetRequest(e) {
    e.preventDefault();
    setResetMessage("");
    setBusy(true);
    try {
      const email = authEmail.trim();
      if (!email) { setResetMessage(RESET_GENERIC_ERROR); return; }

      const { token: captchaToken, error: captchaError } = await getCaptchaToken();
      if (captchaError) { setResetMessage(captchaError); return; }

      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
        ...(captchaToken ? { captchaToken } : {}),
      });
      // Found live in Phase 6 testing, not theoretical: GoTrue's own
      // mailer rate limit only triggers for accounts that actually exist
      // (a nonexistent email needs no send attempt, so it never hits the
      // limit) — an *existing* account's request errors under load while
      // a *nonexistent* one silently "succeeds," and that divergence is
      // itself an enumeration channel even though each individual message
      // is generic. So `res.error` is deliberately never inspected here —
      // the single generic message shows regardless of the actual
      // resetPasswordForEmail outcome (success, rate-limited, or any
      // other server-side failure). RESET_GENERIC_ERROR now reserved
      // for the two client-side pre-flight checks above (empty email,
      // captcha failure), which happen before any server-side,
      // existence-correlated check runs.
      setResetMessage(RESET_GENERIC_SUCCESS);
      setResetCooldown(RESET_COOLDOWN_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  if (signedUpEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dawn-indigo px-5">
        <div className="w-full max-w-md bg-cloud rounded-3xl p-8 text-center">
          <h2 className="font-display text-dawn-indigo text-2xl font-semibold mb-3">
            Check your email
          </h2>
          <p className="font-body text-dawn-indigo/80">We sent a confirmation link to</p>
          <p className="font-body text-dawn-indigo font-bold mb-6 break-all">{signedUpEmail}</p>
          <p className="font-body text-dawn-indigo/70 text-sm mb-8">
            Click the link to verify your account, then come back here to sign in.
          </p>
          <button
            type="button"
            onClick={() => { setSignedUpEmail(""); setAuthMode("sign_in"); setAuthPassword(""); }}
            className="font-body font-bold px-6 py-3 rounded-2xl bg-sunrise-coral text-dawn-indigo hover:brightness-105 transition-all"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  const err = localError || authError;
  const cardStyle = {
    width: "100%", maxWidth: 420,
    background: "linear-gradient(135deg, rgba(78,205,196,0.12), rgba(255,230,109,0.08))",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: 22,
    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
  };
  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15,10,30,0.7)",
    color: "#fff", outline: "none", boxSizing: "border-box",
  };
  const hcaptchaWidget = HCAPTCHA_SITE_KEY && (
    <HCaptcha
      ref={hcaptchaRef}
      sitekey={HCAPTCHA_SITE_KEY}
      size="invisible"
      onError={() => (authMode === "reset_request" ? setResetMessage : setLocalError)("Please complete the check and try again.")}
      onChalExpired={() => (authMode === "reset_request" ? setResetMessage : setLocalError)("Please complete the check and try again.")}
    />
  );

  if (authMode === "reset_request") {
    return (
      <div style={{
        fontFamily: "'Nunito', system-ui, sans-serif",
        background: "#0F0A1E", minHeight: "100vh", color: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <div style={cardStyle}>
          <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, color: "#FFE66D", textShadow: "0 0 20px #FFE66D55" }}>
            Reset your password
          </div>
          <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
            Enter your account email and we'll send you a reset link.
          </div>

          <form onSubmit={handleResetRequest} style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 11, opacity: 0.7, marginBottom: 6 }}>Email</label>
            <input
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />

            {resetMessage && (
              <div style={{
                marginTop: 12,
                background: resetMessage === RESET_GENERIC_SUCCESS ? "rgba(78,205,196,0.14)" : "rgba(255,107,107,0.14)",
                border: `1px solid ${resetMessage === RESET_GENERIC_SUCCESS ? "rgba(78,205,196,0.35)" : "rgba(255,107,107,0.35)"}`,
                borderRadius: 14, padding: "10px 12px", fontSize: 12,
                color: resetMessage === RESET_GENERIC_SUCCESS ? "#4ECDC4" : "#FF8B94", fontWeight: 800,
              }}>
                {resetMessage}
              </div>
            )}

            <button disabled={busy || resetCooldown > 0} type="submit" style={{
              marginTop: 14, width: "100%", padding: "12px 14px", borderRadius: 16, border: "none",
              background: "linear-gradient(135deg, #FFE66D, #FFB347)", color: "#0F0A1E",
              fontWeight: 900,
              cursor: (busy || resetCooldown > 0) ? "not-allowed" : "pointer",
              opacity: (busy || resetCooldown > 0) ? 0.7 : 1,
            }}>
              {busy ? "Sending…" : resetCooldown > 0 ? `Send reset link (${resetCooldown}s)` : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode("sign_in"); setResetMessage(""); }}
              style={{
                marginTop: 12, width: "100%", background: "none", border: "none",
                color: "#4ECDC4", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center",
              }}
            >
              Back to sign in
            </button>

            {hcaptchaWidget}
          </form>
        </div>
        <AuthFooterLinks />
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Nunito', system-ui, sans-serif",
      background: "#0F0A1E", minHeight: "100vh", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, color: "#FFE66D", textShadow: "0 0 20px #FFE66D55" }}>
          Magic Words
        </div>
        <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>Sign in to save and sync word mastery.</div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {["sign_in", "sign_up"].map(mode => (
            <button key={mode} type="button" onClick={() => setAuthMode(mode)} style={{
              flex: 1, padding: "10px 12px", borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.16)",
              background: authMode === mode
                ? (mode === "sign_in" ? "rgba(255,230,109,0.25)" : "rgba(78,205,196,0.22)")
                : "rgba(255,255,255,0.06)",
              color: "#fff", fontWeight: 900, cursor: "pointer",
            }}>
              {mode === "sign_in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          {[
            { label: "Email", value: authEmail, setter: setAuthEmail, type: "email", auto: "email", ph: "you@example.com" },
            { label: "Password", value: authPassword, setter: setAuthPassword, type: "password", auto: authMode === "sign_up" ? "new-password" : "current-password", ph: "••••••••" },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: "block", fontSize: 11, opacity: 0.7, marginBottom: 6, marginTop: f.label === "Password" ? 12 : 0 }}>
                {f.label}
              </label>
              <input
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                type={f.type}
                autoComplete={f.auto}
                placeholder={f.ph}
                style={inputStyle}
              />
            </div>
          ))}

          {authMode === "sign_in" && (
            <button
              type="button"
              onClick={() => { setAuthMode("reset_request"); setLocalError(""); setResetMessage(""); }}
              style={{
                marginTop: 8, background: "none", border: "none",
                color: "#4ECDC4", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0,
              }}
            >
              Forgot password?
            </button>
          )}

          {authMode === "sign_up" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, fontSize: 12, opacity: 0.85, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span>
                I am the parent or guardian of the child who will use this app, I
                consent to the data collection described in our{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "#4ECDC4" }}>Privacy Policy</a>,
                {" "}and I agree to the{" "}
                <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "#4ECDC4" }}>Terms of Service</a>.
              </span>
            </label>
          )}

          {err && (
            <div style={{
              marginTop: 12, background: "rgba(255,107,107,0.14)",
              border: "1px solid rgba(255,107,107,0.35)", borderRadius: 14,
              padding: "10px 12px", fontSize: 12, color: "#FF8B94", fontWeight: 800,
            }}>
              {err}
            </div>
          )}

          <button disabled={busy || (authMode === "sign_up" && !consentChecked)} type="submit" style={{
            marginTop: 14, width: "100%", padding: "12px 14px", borderRadius: 16, border: "none",
            background: "linear-gradient(135deg, #FFE66D, #FFB347)", color: "#0F0A1E",
            fontWeight: 900,
            cursor: (busy || (authMode === "sign_up" && !consentChecked)) ? "not-allowed" : "pointer",
            opacity: (busy || (authMode === "sign_up" && !consentChecked)) ? 0.7 : 1,
          }}>
            {busy ? "Working…" : authMode === "sign_up" ? "Create account" : "Sign in"}
          </button>

          {GOOGLE_AUTH_ENABLED && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", opacity: 0.5, fontSize: 11 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.16)" }} />
                or
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.16)" }} />
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)",
                  color: "#fff", fontWeight: 700, cursor: "pointer",
                }}
              >
                Continue with Google
              </button>
            </>
          )}

          {hcaptchaWidget}
        </form>
      </div>
      {/* Not rendered in sign_up mode — the B6 consent checkbox already
          links Privacy Policy + Terms of Service inline there; a second,
          redundant copy directly below would duplicate those exact links
          on the same screen. */}
      {authMode !== "sign_up" && <AuthFooterLinks />}
    </div>
  );
}
