import { colors, fonts } from '../../theme/tokens';
import { useCandyGalaxyData } from '../../lib/useCandyGalaxyData';
import { isRealMastery } from '../../lib/masteryCalibration';

// Mastery Map (blueprint 4.3) — all 200 words heat-mapped, now per active
// child (was already effectively per-child via useCandyGalaxyData's
// active-child resolution; this is Phase 1's heatmap, unchanged, just
// relocated into the new tabbed portal).
export default function MasteryMapTab() {
  const { words, masteredCount } = useCandyGalaxyData();

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
        Mastery Map — {masteredCount}/{words.length} words
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))', gap: 4 }}>
        {words.map((w) => {
          // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 3 — only the top ("mastered",
          // mint) bucket requires isRealMastery. The two intermediate
          // buckets are continuous raw-mastery signals ("in progress, X%
          // correct so far"), not a claim of mastery, so they stay honest
          // at any attempt count.
          const bucket = isRealMastery(w.mastery, w.attemptCount) ? colors.mint : w.mastery >= 40 ? colors.sun : w.mastery > 0 ? colors.tang : 'rgba(0,0,0,.08)';
          return (
            <div
              key={w.word}
              title={`${w.word} — ${w.mastery}%`}
              style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: bucket }}
            />
          );
        })}
      </div>
    </div>
  );
}
