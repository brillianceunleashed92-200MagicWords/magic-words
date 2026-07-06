import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// feat/auth-r1 Phase 3 — the redirect target for resetPasswordForEmail
// (LoginScreen.jsx's reset-request form). Deliberately a fully separate
// top-level route (see main.jsx), never nested inside CandyGalaxyShell's
// AuthGuard tree: useAuth.js's global onAuthStateChange listener treats
// any event carrying a session (including PASSWORD_RECOVERY, which does
// carry one) as "signed in," so landing this screen inside that tree
// risks being swept straight into the normal authenticated Home flow
// instead of showing the password form. This component manages its own
// local auth-state subscription instead.
//
// Client-side mirror of the live Supabase policy (min 8, letters+digits)
// for immediate UX feedback only — the server remains the actual source
// of truth (see docs/HARDENING_OPS_REPORT.md's password-policy PATCH).
const MIN_LENGTH = 8;
function clientSidePolicyError(password) {
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`;
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Password must include both letters and digits.";
  return null;
}

export default function UpdatePassword() {
  const navigate = useNavigate();
  // ready: recovery session confirmed, form usable | checking: still
  // waiting on the auth-state listener | invalid: link expired/reused/
  // malformed — Supabase appends error/error_description to the redirect
  // URL in that case, checked directly rather than waiting on a timeout.
  const [status, setStatus] = useState('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
    if (params.get('error') || params.get('error_description')) {
      setStatus('invalid');
      return;
    }

    // Recovery links are single-use and expire — this app has no backend
    // route, so detection is entirely client-side: either the recovery
    // session was already established by the time this mounts (Supabase
    // client init runs before React, detectSessionInUrl is on by default),
    // caught via INITIAL_SESSION with a session present, or the
    // PASSWORD_RECOVERY event fires shortly after.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready');
      } else if (event === 'INITIAL_SESSION') {
        setStatus(session ? 'ready' : 'invalid');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (password !== confirmPassword) { setFormError("Passwords don't match."); return; }
    const policyError = clientSidePolicyError(password);
    if (policyError) { setFormError(policyError); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setFormError(error.message); return; }
      setDone(true);
      setTimeout(() => navigate('/app'), 2000);
    } finally {
      setBusy(false);
    }
  }

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

  return (
    <div style={{
      fontFamily: "'Nunito', system-ui, sans-serif",
      background: "#0F0A1E", minHeight: "100vh", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, color: "#FFE66D", textShadow: "0 0 20px #FFE66D55" }}>
          {status === 'invalid' ? 'Link expired' : 'Set a new password'}
        </div>

        {status === 'checking' && (
          <div style={{ opacity: 0.75, marginTop: 12, fontSize: 13 }}>Checking your link…</div>
        )}

        {status === 'invalid' && (
          <>
            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
              This reset link has expired, was already used, or isn't valid. Reset links are single-use and time-limited.
            </div>
            <a
              href="/app"
              style={{
                display: "block", marginTop: 16, width: "100%", padding: "12px 14px", borderRadius: 16,
                background: "linear-gradient(135deg, #FFE66D, #FFB347)", color: "#0F0A1E",
                fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box",
              }}
            >
              Request a new link
            </a>
          </>
        )}

        {status === 'ready' && done && (
          <div style={{ opacity: 0.85, marginTop: 12, fontSize: 14, color: "#4ECDC4", fontWeight: 700 }}>
            Password updated! Taking you home…
          </div>
        )}

        {status === 'ready' && !done && (
          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 11, opacity: 0.7, marginBottom: 6 }}>New password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              style={inputStyle}
            />
            <label style={{ display: "block", fontSize: 11, opacity: 0.7, marginBottom: 6, marginTop: 12 }}>Confirm new password</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              style={inputStyle}
            />

            {formError && (
              <div style={{
                marginTop: 12, background: "rgba(255,107,107,0.14)",
                border: "1px solid rgba(255,107,107,0.35)", borderRadius: 14,
                padding: "10px 12px", fontSize: 12, color: "#FF8B94", fontWeight: 800,
              }}>
                {formError}
              </div>
            )}

            <button disabled={busy} type="submit" style={{
              marginTop: 14, width: "100%", padding: "12px 14px", borderRadius: 16, border: "none",
              background: "linear-gradient(135deg, #FFE66D, #FFB347)", color: "#0F0A1E",
              fontWeight: 900,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
