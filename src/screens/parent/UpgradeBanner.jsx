import { colors, fonts, shadows } from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import { useCreateCheckoutSession } from '../../lib/queries/checkout';

// Shared upgrade CTA — used by DashboardTab (prominent variant, only
// shown once a child crosses 20 mastered words) and SettingsTab (subtle
// variant, always available). Per the gating spec: upgrade prompts only
// ever render in the parent portal, never in the child-facing app.
export default function UpgradeBanner({ variant = 'subtle', title, message }) {
  const { user } = useAuth();
  const checkout = useCreateCheckoutSession();

  function upgrade(interval) {
    if (!user) return;
    checkout.mutate({ email: user.email, interval });
  }

  const prominent = variant === 'prominent';

  return (
    <div style={{
      background: prominent ? `linear-gradient(135deg, ${colors.sun}, ${colors.tang})` : 'rgba(0,0,0,.03)',
      borderRadius: 20,
      padding: prominent ? 20 : 16,
      marginBottom: 24,
      boxShadow: prominent ? shadows.chunkSm : undefined,
    }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: prominent ? '1.1rem' : '.95rem', color: prominent ? colors.starText : colors.ink, marginBottom: 6 }}>
        {title ?? (prominent ? 'Unlock everything with Family' : 'Upgrade to Family')}
      </div>
      <div style={{ color: prominent ? colors.starText : colors.mutedInk, fontSize: '.85rem', marginBottom: 14, opacity: prominent ? 0.9 : 1 }}>
        {message ?? (prominent
          ? "Your Star Learner has mastered 20+ words! Unlock Units 6-18 and every game type for the whole family."
          : 'Unlocks Units 6-18 and every game type for all your children.')}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => upgrade('month')}
          disabled={checkout.isPending}
          style={{
            padding: '10px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
            background: prominent ? colors.cloud : colors.sky, color: prominent ? colors.ink : '#fff',
            fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
          }}
        >
          $9.99/mo
        </button>
        <button
          onClick={() => upgrade('year')}
          disabled={checkout.isPending}
          style={{
            padding: '10px 18px', borderRadius: 100, cursor: 'pointer',
            background: 'transparent', color: prominent ? colors.starText : colors.sky,
            border: `1px solid ${prominent ? colors.starText : colors.sky}`,
            fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
          }}
        >
          $79/yr — save 34%
        </button>
      </div>
      {checkout.isError && (
        <div style={{ marginTop: 10, fontSize: '.8rem', color: prominent ? colors.starText : colors.tang }}>
          Couldn't start checkout: {checkout.error.message}
        </div>
      )}
    </div>
  );
}
