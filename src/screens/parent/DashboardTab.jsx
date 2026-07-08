import { lazy, Suspense } from 'react';
import { colors, fonts, shadows } from '../../theme/tokens';
import { useCandyGalaxyData } from '../../lib/useCandyGalaxyData';
import { useWeeklyStatsQuery } from '../../lib/queries/weeklyStats';
import { useParentDigest } from '../../lib/queries/parentDigest';
import { FREE_TIER_MAX_UNIT } from '../../lib/queries/subscription';
import UpgradeBanner from './UpgradeBanner';
import PlacementReportCard from './PlacementReportCard';
import StarCheckInCard, { isCheckinEligible } from './StarCheckInCard';

// Lazy so recharts (Progress section's only reason to exist) never ships
// in the shared CandyGalaxyShell chunk a child playing Home/Play/Galaxy
// also downloads — see docs/PARENT_METRICS_REPORT.md Phase 0's
// chunk-boundary finding.
const ProgressCharts = lazy(() => import('./ProgressCharts'));

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

      {/* FEAT_PLACEMENT_CHECKIN_R1: formalizes the placement banner into a
          real report card (mission item 1) — the true-level upgrade
          banner now renders INSIDE PlacementReportCard, part of the
          report rather than a floating element. This condition still
          decides the FALLBACK (mastered-count) banner below, preserving
          the original "only one upsell banner at a time" precedence from
          Prompt 9 exactly — a placed-above-5 child still never sees two
          competing upgrade pitches. */}
      {activeChild && <PlacementReportCard activeChild={activeChild} plan={plan} />}
      {activeChild && <StarCheckInCard activeChild={activeChild} />}

      {activeChild && (
        <Suspense fallback={<div style={{ fontFamily: fonts.body, color: colors.mutedInk, padding: '12px 0' }}>Loading progress…</div>}>
          <ProgressCharts childId={activeChild.id} words={words} />
        </Suspense>
      )}

      {plan !== 'family' && (activeChild?.measured_unit ?? activeChild?.placement_unit) > FREE_TIER_MAX_UNIT ? null : (
        plan !== 'family' && masteredCount >= UPGRADE_PROMPT_THRESHOLD ? (
          <UpgradeBanner variant="prominent" surface="dashboard_mastered" />
        ) : null
      )}

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
