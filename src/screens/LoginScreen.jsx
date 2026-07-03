import { useState } from 'react';
import { supabase } from '../supabaseClient';

// Extracted verbatim from the legacy App.jsx (was a nested component with
// no logic changes) so the new componentized shell can reuse it without
// touching auth behavior — restyling the auth surface itself is out of
// Phase 1 scope (see docs/mlc-engine-audit.md section 8 / CLAUDE.md's
// "Auth flow" note), so it deliberately still looks like the legacy
// dark/starfield theme rather than Candy Galaxy tokens. A seam, not a bug.
export default function LoginScreen({ authError }) {
  const [authMode, setAuthMode] = useState("sign_in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

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
      const res = authMode === "sign_up"
        ? await supabase.auth.signUp({
            email, password,
            // Records that a parental-consent checkbox was checked and when —
            // a code-level starting point, not a substitute for whatever
            // specific verifiable-parental-consent mechanism COPPA requires
            // for this product (see docs/COPPA_DATA_INVENTORY.md's open
            // items). user_metadata is the simplest durable place for this;
            // no new table needed for a single boolean + timestamp.
            options: { data: { parental_consent: true, parental_consent_at: new Date().toISOString() } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (res.error) setLocalError(res.error.message);
      else if (authMode === "sign_up") setSignedUpEmail(email);
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

  return (
    <div style={{
      fontFamily: "'Nunito', system-ui, sans-serif",
      background: "#0F0A1E", minHeight: "100vh", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "linear-gradient(135deg, rgba(78,205,196,0.12), rgba(255,230,109,0.08))",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: 22,
        boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
      }}>
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
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15,10,30,0.7)",
                  color: "#fff", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}

          {authMode === "sign_up" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, fontSize: 12, opacity: 0.85, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span>
                I am the parent or guardian of the child who will use this app, and I
                consent to the data collection described in our{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "#4ECDC4" }}>Privacy Policy</a>.
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
        </form>
      </div>
    </div>
  );
}
