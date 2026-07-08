import { colors, fonts, shadows } from '../../theme/tokens';
import { useUIStore } from '../../stores/useUIStore';
import { IconStar } from '../../components/icons';
import { isCheckinEligible } from '../../lib/checkinEligibility';

// FEAT_PLACEMENT_CHECKIN_R1 — mission item 2: recurring re-probe, parent-
// initiated, eligibility-gated (src/lib/checkinEligibility.js) on data
// useChildProfilesQuery already fetches — no extra round-trip just to
// decide whether to show this card.
export default function StarCheckInCard({ activeChild }) {
  const startCheckinFlow = useUIStore((s) => s.startCheckinFlow);
  if (!isCheckinEligible(activeChild)) return null;

  return (
    <div style={{ background: colors.cloud, borderRadius: 20, padding: 16, boxShadow: shadows.chunkSm, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 14, background: 'rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconStar size={22} color={colors.sun} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.95rem', color: colors.ink }}>
          Time for a Star Check-In
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: '.82rem', color: colors.mutedInk }}>
          A quick recurring re-probe, playful for {activeChild.name} — see how their level has grown.
        </div>
      </div>
      <button
        onClick={() => startCheckinFlow(activeChild.id)}
        style={{
          minHeight: 44, padding: '10px 18px', borderRadius: 100, border: 'none', background: colors.mint,
          color: colors.ink, fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem', cursor: 'pointer', flexShrink: 0,
        }}
      >
        Start
      </button>
    </div>
  );
}
