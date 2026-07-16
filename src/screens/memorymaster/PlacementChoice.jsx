import CardScreen from './CardScreen';
import { BookIcon } from './icons';
import { colors, fonts, touchTarget } from './mmTokens';

// MEMORY_MASTER_R1 Phase 4 -- R1/R2 placement choice screen. R1: if the
// child has a reading level in the app, Memory Master starts one level
// below it (min 1), silently -- no test. R2: otherwise (or if the grown-up
// chooses to), run the Skills Assessment instead.
export default function PlacementChoice({ readingUnit, proposedLevel, onAutoPlace, onRunAssessment }) {
  return (
    <div>
      <CardScreen
        icon={<BookIcon color={colors.ink} />}
        iconBg={colors.mint}
        title="Finding this child's level"
        buttonLabel={`Start at Level ${proposedLevel}`}
        onButton={onAutoPlace}
      >
        This child is on Unit {readingUnit} of their Word Journey, so Memory Master starts them at <b>Level {proposedLevel}</b> &mdash; one level below their reading level, exactly as the method says. No test needed.
      </CardScreen>
      <button
        type="button"
        onClick={onRunAssessment}
        style={{
          width: '100%', minHeight: touchTarget, marginTop: 10, background: 'rgba(255,255,255,.14)', color: colors.cloud,
          border: '2px solid rgba(255,255,255,.3)', borderRadius: 18, fontFamily: fonts.display, fontWeight: 800, fontSize: '.95rem', padding: 12, cursor: 'pointer',
        }}
      >
        Run the Skills Assessment instead
      </button>
    </div>
  );
}
