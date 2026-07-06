import { useState } from 'react';
import { colors, fonts, skyGradient, shadows } from '../theme/tokens';
import { supabase } from '../supabaseClient';

// feat/auth-r1 Phase 5 — the mandatory COPPA gate for OAuth-created
// accounts. Email/password signup records parental consent via the B6
// checkbox (LoginScreen.jsx) into `parental_consent` user_metadata before
// an account can even be created. A Google-created account has no
// equivalent step — signInWithOAuth creates the user directly, skipping
// that form entirely. Without this screen, Google signup would produce
// COPPA-consent-less, unenforceable-clickwrap accounts. Rendered by
// CandyGalaxyShell.jsx in place of the normal authenticated tree whenever
// `user.user_metadata.parental_consent` is absent — blocks child
// creation/Home until agreed, same copy and links as the B6 checkbox,
// same metadata shape written on agreement.
// updateUser() fires a USER_UPDATED auth-state event that useAuth.js's
// listener already picks up generically, updating `user` with the new
// metadata — CandyGalaxyShell re-evaluates needsConsentInterstitial on
// that re-render and swaps to the normal app automatically. No callback
// prop needed here.
export default function ConsentInterstitial() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAgree() {
    setBusy(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { parental_consent: true, parental_consent_at: new Date().toISOString() },
      });
      if (updateError) setError('Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: skyGradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: colors.cloud, borderRadius: 24,
        padding: 28, boxShadow: shadows.chunk,
      }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', color: colors.ink, marginBottom: 12 }}>
          Before we begin
        </div>
        <div style={{ color: colors.mutedInk, fontSize: '.95rem', lineHeight: 1.5, marginBottom: 20 }}>
          I am the parent or guardian of the child who will use this app, I
          consent to the data collection described in our{' '}
          <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: colors.skyDeep, fontWeight: 700 }}>Privacy Policy</a>,
          {' '}and I agree to the{' '}
          <a href="/terms" target="_blank" rel="noreferrer" style={{ color: colors.skyDeep, fontWeight: 700 }}>Terms of Service</a>.
        </div>

        {error && (
          <div style={{
            marginBottom: 16, background: 'rgba(255,111,165,0.12)', border: `1px solid ${colors.bubble}55`,
            borderRadius: 14, padding: '10px 12px', fontSize: '.85rem', color: colors.bubble, fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleAgree}
          disabled={busy}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16, border: 'none',
            background: colors.mint, color: colors.mintDeep, fontFamily: fonts.display, fontWeight: 800,
            fontSize: '1rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
            boxShadow: shadows.chunkSm,
          }}
        >
          {busy ? 'Saving…' : 'I agree, continue'}
        </button>
      </div>
    </div>
  );
}
