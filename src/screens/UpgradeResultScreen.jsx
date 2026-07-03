import { colors, fonts, skyGradient } from '../theme/tokens';
import NovaPortrait from '../components/candy/NovaPortrait';

// Stripe Checkout success_url/cancel_url land here (Phase 2 Step 6).
// Pure confirmation UI — the actual subscriptions row is written
// server-side by api/stripe-webhook.js, not by this screen; TanStack
// Query's own refetch-on-focus/staleness will pick up the new plan the
// next time the parent portal's subscription query runs.
export default function UpgradeResultScreen({ outcome, onDone }) {
  const success = outcome === 'success';
  return (
    <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <NovaPortrait pose={success ? 'celebrate' : 'wave'} size={120} />
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', color: colors.cloud, marginTop: '1rem' }}>
        {success ? 'Welcome to Family!' : 'No worries!'}
      </div>
      <div style={{ color: 'rgba(255,255,255,.85)', marginTop: 8, maxWidth: 300 }}>
        {success
          ? "Units 6-18 and every game type are unlocking now — it may take a few seconds to show up."
          : "Checkout was canceled — nothing was charged. You can upgrade any time from the Grown-Ups tab."}
      </div>
      <button onClick={onDone} style={{
        marginTop: '1.5rem', background: colors.cloud, border: 'none', borderRadius: 100,
        padding: '0.75rem 1.75rem', fontFamily: fonts.display, fontWeight: 700, cursor: 'pointer',
      }}>
        Back Home
      </button>
    </div>
  );
}
