import { colors, fonts } from '../../theme/tokens';
import { useCandyGalaxyData } from '../../lib/useCandyGalaxyData';

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
          const bucket = w.mastery >= 80 ? colors.mint : w.mastery >= 40 ? colors.sun : w.mastery > 0 ? colors.tang : 'rgba(0,0,0,.08)';
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
