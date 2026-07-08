import { colors, fonts, shadows } from '../../theme/tokens';
import { FREE_TIER_MAX_UNIT } from '../../lib/queries/subscription';
import UpgradeBanner from './UpgradeBanner';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// FEAT_PLACEMENT_CHECKIN_R1 — mission item 1: "formalizes what placement
// already measured... the existing sanctioned upsell surface, now a real
// report instead of a buried banner." Moves the true-level upgrade banner
// (previously a standalone conditional in DashboardTab, Prompt 9) INSIDE
// this card, since it's now part of the report rather than a floating
// element with no report to belong to. DashboardTab still computes the
// same condition itself to decide its OWN fallback (mastered-count)
// banner, preserving the existing "only one upsell banner at a time"
// precedence exactly.
export default function PlacementReportCard({ activeChild, plan }) {
  if (!activeChild) return null;

  const { placement_unit: placementUnit, measured_unit: measuredUnit, placement_completed_at: completedAt } = activeChild;
  const trueLevel = measuredUnit ?? placementUnit;
  const showTrueLevelUpsell = plan !== 'family' && trueLevel > FREE_TIER_MAX_UNIT;

  return (
    <div style={{ background: colors.cloud, borderRadius: 20, padding: 16, boxShadow: shadows.chunkSm, marginBottom: 14 }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1rem', color: colors.ink, marginBottom: 8 }}>
        Placement Report
      </div>

      {!completedAt ? (
        <div style={{ fontFamily: fonts.body, color: colors.mutedInk, fontSize: '.9rem', lineHeight: 1.5 }}>
          {activeChild.name} started at the very beginning, Unit 1 — no placement measurement on file. A Star Check-In becomes available once they've had a chance to measure their level.
        </div>
      ) : (
        <div style={{ fontFamily: fonts.body, color: colors.mutedInk, fontSize: '.9rem', lineHeight: 1.5 }}>
          Placed on {formatDate(completedAt)} at <strong style={{ color: colors.ink }}>Unit {placementUnit}</strong>.
          {trueLevel != null && trueLevel !== placementUnit && (
            <> Measured level: <strong style={{ color: colors.ink }}>Unit {trueLevel}</strong>.</>
          )}
        </div>
      )}

      {showTrueLevelUpsell && (
        <div style={{ marginTop: 12 }}>
          <UpgradeBanner
            variant="prominent"
            title="Nova found their level!"
            message={`Your Star Learner measured at Unit ${trueLevel} — unlock Units 6-18 with the Family Plan.`}
            surface="dashboard_true_level"
          />
        </div>
      )}
    </div>
  );
}
