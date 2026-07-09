import { useNavigate } from 'react-router-dom';
import { colors, fonts, skyGradient } from '../theme/tokens';
import { useAuth } from '../hooks/useAuth';
import ChunkyButton from '../components/candy/ChunkyButton';
import { IconStar, IconPlay } from '../components/icons';

// FIX_NO_BLANK_SCREENS_R1 -- catch-all for any path outside the 6 routes
// defined in main.jsx (top-level typo, stale bookmark, etc.). Previously
// these rendered nothing (<Suspense fallback={null}>, no matching
// <Route>) -- a genuinely blank page, same class of problem this run's
// ErrorBoundary mount addresses for render errors.
export default function NotFound() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading } = useAuth();

  return (
    <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, padding: '2rem 1.25rem', fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <IconStar size={48} color={colors.sun} />
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.cloud, marginBottom: 10 }}>
          This star hasn't been mapped yet
        </div>
        <div style={{ color: 'rgba(255,255,255,.85)', marginBottom: 28, lineHeight: 1.5 }}>
          We couldn't find that page. Let's get you back to the galaxy.
        </div>
        <ChunkyButton
          variant="mint"
          disabled={isLoading}
          onClick={() => navigate(isLoggedIn ? '/app' : '/', { replace: true })}
          style={{ width: '100%' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Back to the galaxy <IconPlay size={16} />
          </span>
        </ChunkyButton>
      </div>
    </div>
  );
}
