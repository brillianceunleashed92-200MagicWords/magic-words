import { colors, fonts, shadows } from '../../theme/tokens';
import { useCandyGalaxyData } from '../../lib/useCandyGalaxyData';
import { useWeeklyStatsQuery } from '../../lib/queries/weeklyStats';
import { useParentDigest } from '../../lib/queries/parentDigest';
import { FREE_TIER_MAX_UNIT } from '../../lib/queries/subscription';
import UpgradeBanner from './UpgradeBanner';

const UPGRADE_PROMPT_THRESHOLD = 20;

// Dashboard (blueprint 4.1) — "the parent visit is 30 seconds, weekly."
// This Week hero (3 huge numbers) + AI Insight paragraph + Dinner Table
// Cards, print-friendly.
export default function DashboardTab() {
  const { activeChild, words, streak, masteredCount, plan } = useCandyGalaxyData();
  const { minutesThisWeek, wordsThisWeek, weakWords } = useWeeklyStatsQuery(activeChild?.id, words);

  const summary = activeChild ? {
    childName: activeChild.name,
    wordsThisWeek,
    weakWords,
    streak: streak.current_streak,
    minutesThisWeek,
  } : null;

  const { digest, dinnerCards, loading, error, regenerate } = useParentDigest(activeChild?.id, summary);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Words this week', value: wordsThisWeek.length },
          { label: 'Day streak', value: streak.current_streak },
          { label: 'Minutes', value: minutesThisWeek },
        ].map((stat) => (
          <div key={stat.label} style={{ background: colors.cloud, borderRadius: 20, padding: '16px 12px', textAlign: 'center', boxShadow: shadows.chunkSm }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.8rem', color: colors.ink }}>{stat.value}</div>
            <div style={{ fontSize: '.7rem', color: colors.mutedInk, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Placement Adventure (Prompt 8) + true-level fix (Prompt 9): a free
          child's floor is already capped to min(measured, 5) before it's
          ever written server-side — this is purely the upgrade hook
          surfacing the TRUE measured level (never shown to the child, per
          the mission — child-facing copy never mentions a paywall).
          Reads measured_unit (the true value) with a fallback to the
          older placement_unit so a placement completed before this
          column existed doesn't render a broken banner (it'll just show
          the already-floored number until the child retakes placement).
          Takes priority over the mastered-words banner below when both
          would apply, so a placed-above-5 child doesn't see two
          competing upgrade pitches. */}
      {plan !== 'family' && (activeChild?.measured_unit ?? activeChild?.placement_unit) > FREE_TIER_MAX_UNIT ? (
        <UpgradeBanner
          variant="prominent"
          title="Nova found their level!"
          message={`Your Star Learner measured at Unit ${activeChild.measured_unit ?? activeChild.placement_unit} — unlock Units 6-18 with the Family Plan.`}
          surface="dashboard_true_level"
        />
      ) : plan !== 'family' && masteredCount >= UPGRADE_PROMPT_THRESHOLD ? (
        <UpgradeBanner variant="prominent" surface="dashboard_mastered" />
      ) : null}

      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
        AI Insight
      </div>
      <div style={{ background: 'rgba(0,0,0,.03)', borderRadius: 20, padding: 16, marginBottom: 24 }}>
        {loading && <div style={{ color: colors.mutedInk }}>Thinking…</div>}
        {error && <div style={{ color: colors.tang }}>Couldn't load this week's insight. <button onClick={regenerate} style={{ background: 'none', border: 'none', color: colors.sky, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button></div>}
        {digest && <div style={{ color: colors.ink, lineHeight: 1.5 }}>{digest}</div>}
      </div>

      {dinnerCards && (
        <div className="dinner-cards-print">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink }}>
              Dinner Table Cards
            </div>
            <button onClick={() => window.print()} style={{ background: 'none', border: `1px solid ${colors.mutedInk}`, borderRadius: 100, padding: '4px 12px', fontSize: '.75rem', cursor: 'pointer', color: colors.mutedInk }}>
              Print
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {dinnerCards.map((card, i) => (
              <div key={i} style={{ background: colors.sun, color: colors.starText, borderRadius: 16, padding: 14, fontFamily: fonts.body, fontWeight: 600 }}>
                {card}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
