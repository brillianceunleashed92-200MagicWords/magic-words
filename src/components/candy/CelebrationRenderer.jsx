import { colors, fonts } from '../../theme/tokens';
import CelebrationOverlay from './CelebrationOverlay';
import NovaPortrait from './NovaPortrait';
import { useUIStore } from '../../stores/useUIStore';

// Drains the celebration queue (useUIStore) one at a time so two of the 5
// ranked moments never overlap (200MW_Product_Blueprint.md 2.7). Mounted
// once in CandyGalaxyShell — any screen queues a celebration by calling
// useUIStore.getState().queueCelebration({...}).
const DURATIONS = {
  wordMastered: 2000,
  questComplete: 3000,
  unitBoss: 5000,
  streakMilestone: 4000,
};

function CelebrationContent({ celebration }) {
  const { type, payload } = celebration;

  if (type === 'wordMastered') {
    return (
      <>
        <NovaPortrait pose="celebrate" size={100} style={{ margin: '0 auto 12px' }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.6rem', color: colors.ink }}>
          "{payload.word}" star ignited! ⭐
        </div>
        <div style={{ fontFamily: fonts.body, color: colors.mutedInk, marginTop: 6 }}>
          One more word lighting up your galaxy.
        </div>
      </>
    );
  }

  if (type === 'questComplete') {
    return (
      <>
        <NovaPortrait pose="celebrate" size={110} style={{ margin: '0 auto 12px' }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.8rem', color: colors.ink }}>
          Quest Complete!
        </div>
        <div style={{ fontFamily: fonts.body, color: colors.mutedInk, marginTop: 6 }}>
          {payload.wordsCorrect}/{payload.totalWords} correct · +{payload.sparksEarned} 💎 Sparks
        </div>
      </>
    );
  }

  if (type === 'unitBoss') {
    return (
      <>
        <div style={{ fontSize: '4rem' }}>👑</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.9rem', color: colors.ink }}>
          Unit {payload.unit} Boss Defeated!
        </div>
        <div style={{ fontFamily: fonts.body, color: colors.mutedInk, marginTop: 6 }}>
          Every word in this unit is now mastered.
        </div>
      </>
    );
  }

  if (type === 'streakMilestone') {
    return (
      <>
        <div style={{ fontSize: '4rem' }}>🔥</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.9rem', color: colors.ink }}>
          {payload.streak}-Day Streak!
        </div>
        <div style={{ fontFamily: fonts.body, color: colors.mutedInk, marginTop: 6 }}>
          Nova brought some friends to celebrate. 🎉
        </div>
      </>
    );
  }

  return null;
}

export default function CelebrationRenderer() {
  const queue = useUIStore((s) => s.celebrationQueue);
  const dequeueCelebration = useUIStore((s) => s.dequeueCelebration);
  const current = queue[0];

  if (!current) return null;

  return (
    <CelebrationOverlay open durationMs={DURATIONS[current.type] ?? 3000} onDone={dequeueCelebration}>
      <CelebrationContent celebration={current} />
    </CelebrationOverlay>
  );
}
