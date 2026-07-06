import { colors, fonts, skyGradient } from '../theme/tokens';
import ChunkyButton from '../components/candy/ChunkyButton';
import { IconStar, IconPlay } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';

// Shown once, right after Star Learner onboarding (Prompt 8, Placement
// Adventure). Per the mission: true beginners — most 4-5-year-olds —
// never see a single probe, so "start at the beginning" is the visually
// default path (styled as the primary action), not an equal-weight
// choice. Child-facing copy never appears here at all; this screen is
// parent-facing, same register as the rest of onboarding.
export default function PlacementChoiceScreen({ childId, onChooseBeginner, onChoosePlacement }) {
  const { user } = useAuth();

  // "Start at the beginning" never touches the placement endpoint at all
  // (true beginners see zero probes) — logged as placement_skipped
  // client-side since the server has no other visibility into this
  // choice (no API call happens on this path otherwise). Fire-and-forget,
  // matching every other analytics-event call in this codebase.
  async function chooseBeginner() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      fetch('/api/session-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ childId, placementMode: true, skip: true }),
      }).catch(() => {});
    } catch {
      // Best-effort logging only -- never blocks the beginner path.
    }
    onChooseBeginner();
  }

  return (
    <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, padding: '2rem 1.25rem', fontFamily: fonts.body, display: 'flex', alignItems: 'center' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.cloud, textAlign: 'center', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          One more thing <IconStar size={20} color={colors.sun} />
        </div>
        <div style={{ color: 'rgba(255,255,255,.85)', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
          Would you like Nova to find their starting star, or begin from the very first word?
        </div>

        <ChunkyButton onClick={chooseBeginner} variant="mint" style={{ width: '100%', marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Brand-new reader — start at the beginning <IconPlay size={16} />
          </span>
        </ChunkyButton>

        <button
          onClick={onChoosePlacement}
          style={{
            width: '100%', minHeight: 44, background: 'rgba(255,255,255,.12)', border: 'none', borderRadius: 100,
            color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, fontSize: '.95rem', cursor: 'pointer',
            padding: '13px 28px',
          }}
        >
          Let Nova find their level
        </button>
        <div style={{ color: 'rgba(255,255,255,.6)', textAlign: 'center', fontSize: '.8rem', marginTop: 10 }}>
          A few quick questions, about 3-5 minutes.
        </div>
      </div>
    </div>
  );
}
