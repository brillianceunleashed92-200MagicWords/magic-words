import { useMemo } from 'react';
import { colors, fonts, skyGradient } from '../theme/tokens';
import GalaxyPath from '../components/candy/GalaxyPath';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';
import { useWordSpeak } from '../lib/useWordSpeak';
import { isRealMastery } from '../lib/masteryCalibration';
import { IconGalaxy, IconStar, IconSpark } from '../components/icons';

// The full 200-word constellation — the "trophy room" (200MW_Product_
// Blueprint.md 7.1). Same GalaxyPath component as Home's short preview,
// just fed every word instead of a ~7-node slice around the current one.
export default function GalaxyScreen({ onOpenWord }) {
  const { words, currentWord, masteredCount, isLoading } = useCandyGalaxyData();
  const { speakWord } = useWordSpeak(words);

  const pathWords = useMemo(() => {
    return words.map((w) => {
      // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 3 — isRealMastery, not raw
      // mastery>=80: a 1-tap word must not show as `done` here, same
      // reasoning as useCandyGalaxyData's currentWord/masteredCount.
      const done = isRealMastery(w.mastery, w.attemptCount);
      const isCurrent = !done && currentWord && w.word === currentWord.word;
      // Bug (Prompt 7, Part 1): the adaptive engine only ever names ONE
      // word `currentWord` at a time. Before this fix, every other
      // unmastered word rendered as a flat `locked` node regardless of
      // its own real mastery/attempt history — a child who played
      // "dance" several times (real mastery > 0, just not yet 80%, and
      // not this moment's single adaptive recommendation) saw it as an
      // indistinguishable, non-tappable lock icon, identical to a word
      // never touched at all. Reproduced directly: seeded a word with
      // mastery 45/attempt_count 4 that wasn't `currentWord` and it
      // rendered `locked` with no percent shown. `inProgress` is a new,
      // fourth, tappable status for exactly that shape — real progress
      // that isn't (right now) the single spotlighted recommendation —
      // so "touched but not mastered" is visually and functionally
      // distinct from "never reached."
      const inProgress = !done && !isCurrent && w.mastery > 0;
      // FEAT_QUICK_WINS_R1 — sleeping stars. `w.sleepy` is already
      // computed by useCandyGalaxyData (isStarSleepy against
      // next_review_at, Star Keeper's own ladder — untouched by this
      // run). Only a genuinely-mastered word can be "asleep" (a word
      // that's merely `inProgress` was never on the review ladder to
      // begin with); checked ahead of `done` so a due-for-review word
      // doesn't render as an indistinguishable plain gold `done` star.
      const sleepy = done && w.sleepy;
      return {
        ...w,
        status: w.premiumLocked ? 'premium' : sleepy ? 'sleepy' : done ? 'done' : isCurrent ? 'current' : inProgress ? 'inProgress' : 'locked',
        percent: w.mastery,
      };
    });
  }, [words, currentWord]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.cloud, fontFamily: fonts.display, display: 'flex', alignItems: 'center', gap: 8 }}>
          Loading your galaxy… <IconSpark size={18} color={colors.sun} />
        </div>
      </div>
    );
  }

  return (
    <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, paddingBottom: 140 }}>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '52px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.cloud, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconGalaxy size={22} color={colors.cloud} /> Your Galaxy
          </div>
          <div style={{ background: colors.cloud, color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '.8rem', padding: '8px 16px', borderRadius: 100, boxShadow: '0 5px 0 rgba(0,0,0,.15)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <b style={{ color: colors.sky }}>{masteredCount}</b> / {words.length} <IconStar size={13} color={colors.sun} />
          </div>
        </div>
        <GalaxyPath words={pathWords} onNodeTap={onOpenWord} speak={speakWord} />
      </div>
    </div>
  );
}
