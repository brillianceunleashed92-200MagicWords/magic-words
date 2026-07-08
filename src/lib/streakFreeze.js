// Streak freeze token (FEAT_QUICK_WINS_R1 Package E, item 1). Pure,
// framework-free — zero imports, safe for direct testing and for reuse
// from src/lib/queries/streaks.js's client mutation (same reasoning as
// src/lib/masteryCalibration.js / src/lib/starKeeper.js).
//
// Locked rule v1 (Sal-ratified, docs/QUICK_WINS_REPORT.md LOCKED
// DECISIONS TABLE): hold at most 1 freeze; grant 1 at the start of each
// ISO week if the child has an active streak and holds 0; on a missed
// day, if a freeze is held, auto-consume it and preserve the streak.
// Two consecutive missed days still reset. Consumption already lived in
// useUpdateStreakMutation before this run (daysDiff===2 && freezes>0);
// this file adds the grant/accrual half.

// ISO weeks start Monday. Returns the yyyy-mm-dd of that week's Monday
// for any date input (a Date, or a date-only string like "2026-07-08").
//
// Deliberately avoids `new Date("2026-07-06")` + `.toISOString()`: the
// string constructor parses a bare date as UTC MIDNIGHT, which shifts to
// the previous calendar day the instant the local timezone offset is
// negative (US timezones included) — confirmed by a real failing test
// (tests/streak-freeze.spec.js) before this fix, not assumed. Every step
// here — parsing, the Monday-of-week arithmetic, and formatting back out
// — stays in LOCAL calendar terms throughout, so the same "2026-07-06"
// input reliably means the same local calendar day everywhere it's used
// (`user_streaks.last_activity_date`/`freeze_last_granted_at` are also
// local-calendar date strings, already timezone-derived per streaks.js's
// own `Intl.DateTimeFormat('en-CA', { timeZone: tz })`).
export function isoWeekStartString(dateInput) {
  let d;
  if (dateInput instanceof Date) {
    d = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  } else {
    const [y, m, day] = String(dateInput).split('-').map(Number);
    d = new Date(y, m - 1, day);
  }
  const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// A child is eligible for a fresh freeze grant when: they have an active
// streak (grant never manufactures streak the child didn't earn — it
// only protects a FUTURE gap), they hold zero freezes right now, and
// either they've never been granted one (freezeLastGrantedAt null) or
// the last grant happened in a strictly earlier ISO week than `today`.
export function isEligibleForFreezeGrant({ currentStreak, freezeCount, freezeLastGrantedAt, today }) {
  if (currentStreak <= 0) return false;
  if (freezeCount > 0) return false;
  if (!freezeLastGrantedAt) return true;
  return isoWeekStartString(freezeLastGrantedAt) !== isoWeekStartString(today);
}
