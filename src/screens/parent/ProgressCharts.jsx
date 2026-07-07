import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { colors, fonts, shadows } from '../../theme/tokens';
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';
import { useParentMetricsHistoryQuery } from '../../lib/queries/parentMetrics';
import {
  computeWeeklyMasteryCrossings,
  computeHeatmapData,
  computeAccuracyByActivity,
  computeResponseTimeTrend,
  computeReviewForecast,
  computeUnitProgress,
} from '../../lib/parentMetricsDerivations';

// Lazy-loaded (React.lazy, wired from DashboardTab.jsx) specifically so
// recharts never ships in the shared CandyGalaxyShell chunk a child
// playing Home/Play/Galaxy also downloads — see docs/PARENT_METRICS_REPORT.md
// Phase 0's chunk-boundary finding.

function shortDayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
}

function shortDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChartCard({ title, caption, isEmpty, emptyMessage, children }) {
  return (
    <div style={{ background: colors.cloud, borderRadius: 20, padding: 16, boxShadow: shadows.chunkSm, marginBottom: 14 }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1rem', color: colors.ink, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: '.8rem', color: colors.mutedInk, marginBottom: 12 }}>
        {caption}
      </div>
      {isEmpty ? (
        <div style={{ fontFamily: fonts.body, fontSize: '.85rem', color: colors.mutedInk, padding: '20px 0', textAlign: 'center' }}>
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function WeeklyMasteryChart({ rows, words, now, animate }) {
  const data = computeWeeklyMasteryCrossings(rows, words, now, 8).map((w) => ({ ...w, label: shortDateLabel(w.weekStart) }));
  const isEmpty = data.every((d) => d.count === 0);
  return (
    <ChartCard
      title="Words learned per week"
      caption="Every word that clicked for good — one bar per week."
      isEmpty={isEmpty}
      emptyMessage="No words have reached real mastery yet — keep practicing and this will fill in."
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontFamily: fonts.body, fontSize: 11, fill: colors.mutedInk }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontFamily: fonts.body, fontSize: 11, fill: colors.mutedInk }} axisLine={false} tickLine={false} width={24} />
          <Tooltip contentStyle={{ fontFamily: fonts.body, borderRadius: 12, border: 'none', boxShadow: shadows.chunkSm }} />
          <Bar dataKey="count" name="Words mastered" fill={colors.mint} radius={[6, 6, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function heatCellColor(count) {
  if (count === 0) return 'rgba(0,0,0,.05)';
  if (count <= 2) return 'rgba(62,224,184,.35)'; // mint tint
  if (count <= 5) return 'rgba(62,224,184,.65)';
  return colors.mint;
}

function PracticeHeatmap({ rows, now }) {
  const days = computeHeatmapData(rows, now, 84);
  const isEmpty = days.every((d) => d.count === 0);
  // 12 columns (weeks) x 7 rows (days) — days[] is oldest-to-newest, chunk into weeks.
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <ChartCard
      title="Practice heatmap"
      caption="The last 12 weeks — darker means more practice that day."
      isEmpty={isEmpty}
      emptyMessage="No practice logged in the last 12 weeks yet."
    >
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} activities`}
                style={{ width: 10, height: 10, borderRadius: 3, background: heatCellColor(d.count) }}
              />
            ))}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function AccuracyByActivityChart({ rows, now }) {
  const data = computeAccuracyByActivity(rows, now, 30);
  const isEmpty = data.length === 0;
  return (
    <ChartCard
      title="Accuracy by activity"
      caption="Last 30 days, activities with at least 5 tries."
      isEmpty={isEmpty}
      emptyMessage="Not enough recent attempts yet — this fills in once an activity has been played 5+ times."
    >
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontFamily: fonts.body, fontSize: 11, fill: colors.mutedInk }} axisLine={false} tickLine={false} unit="%" />
          <YAxis type="category" dataKey="label" width={90} tick={{ fontFamily: fonts.body, fontSize: 11, fill: colors.ink }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontFamily: fonts.body, borderRadius: 12, border: 'none', boxShadow: shadows.chunkSm }} formatter={(v) => `${v}%`} />
          <Bar dataKey="accuracy" name="Accuracy" fill={colors.sky} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ResponseTimeChart({ rows, now, animate }) {
  const data = computeResponseTimeTrend(rows, now, 8).map((w) => ({ ...w, label: shortDateLabel(w.weekStart) }));
  const isEmpty = data.every((d) => d.medianSeconds === null);
  return (
    <ChartCard
      title="Answer-speed trend"
      caption="Median seconds to answer correctly, week by week."
      isEmpty={isEmpty}
      emptyMessage="No timed answers yet — this fills in as your Star Learner plays."
    >
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontFamily: fonts.body, fontSize: 11, fill: colors.mutedInk }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals tick={{ fontFamily: fonts.body, fontSize: 11, fill: colors.mutedInk }} axisLine={false} tickLine={false} width={28} unit="s" />
          <Tooltip contentStyle={{ fontFamily: fonts.body, borderRadius: 12, border: 'none', boxShadow: shadows.chunkSm }} formatter={(v) => (v == null ? '—' : `${v}s`)} />
          <Line type="monotone" dataKey="medianSeconds" name="Median seconds" stroke={colors.tang} strokeWidth={3} dot={{ r: 4, fill: colors.tang }} connectNulls isAnimationActive={animate} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ReviewForecastChart({ words, now, animate }) {
  const data = computeReviewForecast(words, now, 14).map((d) => ({ ...d, label: shortDayLabel(d.date) }));
  const isEmpty = data.every((d) => d.count === 0);
  return (
    <ChartCard
      title="Review-due forecast"
      caption="Words coming up for review in the next 2 weeks."
      isEmpty={isEmpty}
      emptyMessage="No words are due for review in the next 14 days."
    >
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontFamily: fonts.body, fontSize: 10, fill: colors.mutedInk }} axisLine={false} tickLine={false} interval={1} />
          <YAxis allowDecimals={false} tick={{ fontFamily: fonts.body, fontSize: 11, fill: colors.mutedInk }} axisLine={false} tickLine={false} width={24} />
          <Tooltip contentStyle={{ fontFamily: fonts.body, borderRadius: 12, border: 'none', boxShadow: shadows.chunkSm }} />
          <Bar dataKey="count" name="Words due" fill={colors.bubble} radius={[6, 6, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function UnitProgressChart({ words }) {
  const data = computeUnitProgress(words, 18).map((u) => ({ ...u, label: `Unit ${u.unit}` }));
  const isEmpty = data.every((u) => u.total === 0);
  return (
    <ChartCard
      title="Unit progress"
      caption="Real-mastery words per unit — all 18, including ones ahead."
      isEmpty={isEmpty}
      emptyMessage="No words loaded yet for this Star Learner."
    >
      <ResponsiveContainer width="100%" height={18 * 22}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontFamily: fonts.body, fontSize: 10, fill: colors.mutedInk }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={54} tick={{ fontFamily: fonts.body, fontSize: 10, fill: colors.ink }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontFamily: fonts.body, borderRadius: 12, border: 'none', boxShadow: shadows.chunkSm }} formatter={(v, n, p) => [`${v} / ${p.payload.total}`, 'Mastered']} />
          <Bar dataKey="mastered" name="Mastered" fill={colors.sun} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function ProgressCharts({ childId, words }) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = !reducedMotion;
  const historyQ = useParentMetricsHistoryQuery(childId);
  const rows = historyQ.data ?? [];
  const now = new Date();

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
        Progress
      </div>
      {historyQ.isLoading ? (
        <div style={{ fontFamily: fonts.body, color: colors.mutedInk, padding: '12px 0' }}>Loading progress…</div>
      ) : (
        <>
          <WeeklyMasteryChart rows={rows} words={words} now={now} animate={animate} />
          <PracticeHeatmap rows={rows} now={now} />
          <AccuracyByActivityChart rows={rows} now={now} />
          <ResponseTimeChart rows={rows} now={now} animate={animate} />
          <ReviewForecastChart words={words} now={now} animate={animate} />
          <UnitProgressChart words={words} />
        </>
      )}
    </div>
  );
}
