#!/usr/bin/env node
// Prompt 9 — the launch metrics dashboard. Service-role, local, READ-ONLY:
// every query below is a `select`, nothing else. Enforced by construction,
// not just convention — runQuery() refuses to execute anything whose
// trimmed-lowercased text doesn't start with `select` or `with` (CTEs).
//
// Reuses the same Management-API SQL path as scripts/db-query.mjs (a
// macOS-keychain-held token, not SUPABASE_SERVICE_ROLE_KEY) because several
// of these metrics need auth.users, which PostgREST/supabase-js never
// exposes (it's not part of the `public` schema the anon/service-role
// PostgREST endpoint serves) — the Management API talks to the database
// directly, so it can.
//
// Usage: node scripts/analytics-report.mjs [--days N]   (default 14; every
// metric is printed for both the last N days AND all-time)
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const daysFlagIdx = args.indexOf('--days');
const DAYS = daysFlagIdx !== -1 ? Number(args[daysFlagIdx + 1]) : 14;
if (!Number.isFinite(DAYS) || DAYS <= 0) { console.error('--days must be a positive number'); process.exit(1); }

const PROJECT_ID = 'ozhqsaysltiamadpcruz';

async function runQuery(sql) {
  const trimmed = sql.trim().toLowerCase();
  if (!trimmed.startsWith('select') && !trimmed.startsWith('with')) {
    throw new Error(`Refusing to run a non-SELECT statement: ${sql.slice(0, 60)}...`);
  }
  const token = execSync('security find-generic-password -s "Supabase CLI" -w', { encoding: 'utf8' }).trim();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text}`); }
  if (!res.ok) throw new Error(`Query failed: ${JSON.stringify(json)}`);
  return json;
}

function section(title) {
  console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`);
}

function table(rows) {
  if (!rows.length) { console.log('  (no rows)'); return; }
  console.log(rows.map((r) => '  ' + JSON.stringify(r)).join('\n'));
}

async function main() {
  console.log(`LAUNCH ANALYTICS REPORT — generated ${new Date().toISOString()}`);
  console.log(`Date-range window: last ${DAYS} days (plus all-time totals for every metric)`);
  console.log('READ-ONLY: every query below is a SELECT — see runQuery()\'s guard. Zero writes.');

  section('1. SIGNUPS BY DAY (auth.users.created_at)');
  table(await runQuery(`
    select date_trunc('day', created_at)::date as day, count(*) as signups
    from auth.users
    where created_at >= now() - interval '${DAYS} days'
    group by 1 order by 1;
  `));
  table(await runQuery(`select count(*) as all_time_signups from auth.users;`));

  section('2. CHILDREN CREATED / ONBOARDING COMPLETED BY DAY');
  table(await runQuery(`
    select date_trunc('day', created_at)::date as day, count(*) as children_created
    from public.child_profiles
    where created_at >= now() - interval '${DAYS} days'
    group by 1 order by 1;
  `));
  table(await runQuery(`select count(*) as all_time_children from public.child_profiles;`));

  section('3. ACTIVATION (child with >=1 real learning_events attempt) + time-to-activation');
  table(await runQuery(`
    with first_event as (
      select child_id, min(recorded_at) as first_activity
      from public.learning_events
      group by child_id
    )
    select
      count(*) as activated_children,
      (select count(*) from public.child_profiles) as total_children,
      round(avg(extract(epoch from (fe.first_activity - cp.created_at)) / 3600.0)::numeric, 1) as avg_hours_to_activation,
      round(percentile_cont(0.5) within group (order by extract(epoch from (fe.first_activity - cp.created_at)))::numeric / 3600.0, 1) as median_hours_to_activation
    from first_event fe
    join public.child_profiles cp on cp.id = fe.child_id;
  `));

  section('4. D1 / D7 RETURN (distinct active days per child after first activity)');
  table(await runQuery(`
    with first_event as (
      select child_id, min(date_trunc('day', recorded_at)) as day0
      from public.learning_events group by child_id
    ),
    active_days as (
      select distinct child_id, date_trunc('day', recorded_at) as active_day
      from public.learning_events
    )
    select
      count(distinct fe.child_id) as cohort_size,
      count(distinct ad1.child_id) as returned_d1,
      count(distinct ad7.child_id) as returned_d7
    from first_event fe
    left join active_days ad1 on ad1.child_id = fe.child_id and ad1.active_day = fe.day0 + interval '1 day'
    left join active_days ad7 on ad7.child_id = fe.child_id and ad7.active_day = fe.day0 + interval '7 days';
  `));

  section('5. STREAK DISTRIBUTION (user_streaks.current_streak, bucketed)');
  table(await runQuery(`
    select
      case
        when current_streak = 0 then '0'
        when current_streak between 1 and 2 then '1-2'
        when current_streak between 3 and 6 then '3-6'
        when current_streak between 7 and 13 then '7-13'
        when current_streak between 14 and 29 then '14-29'
        else '30+'
      end as bucket,
      count(*) as children
    from public.user_streaks
    group by 1
    order by min(current_streak);
  `));

  section('6. PLACEMENT FUNNEL (product_events + child_profiles.measured_unit)');
  table(await runQuery(`
    select event_type, count(*) as events
    from public.product_events
    where event_type like 'placement_%'
      and created_at >= now() - interval '${DAYS} days'
    group by 1 order by 1;
  `));
  table(await runQuery(`select event_type, count(*) as all_time_events from public.product_events where event_type like 'placement_%' group by 1 order by 1;`));
  table(await runQuery(`
    select measured_unit, count(*) as children
    from public.child_profiles
    where measured_unit is not null
    group by 1 order by 1;
  `));
  table(await runQuery(`
    select count(*) as free_children_measured_above_5_upsell_pipeline
    from public.child_profiles cp
    where cp.measured_unit > 5
      and cp.parent_id not in (select user_id from public.subscriptions where plan = 'family' and status in ('active','trialing'));
  `));

  section('7. SUBSCRIPTIONS: active count, new by day, cancellations by day');
  table(await runQuery(`select count(*) as active_subscriptions from public.subscriptions where status in ('active','trialing');`));
  table(await runQuery(`
    select date_trunc('day', created_at)::date as day, count(*) as new_subscriptions
    from public.subscriptions
    where created_at >= now() - interval '${DAYS} days'
    group by 1 order by 1;
  `));
  table(await runQuery(`
    select date_trunc('day', updated_at)::date as day, count(*) as cancellations
    from public.subscriptions
    where status = 'canceled' and updated_at >= now() - interval '${DAYS} days'
    group by 1 order by 1;
  `));

  section('8. PAYWALL / CHECKOUT (product_events)');
  table(await runQuery(`
    select payload->>'surface' as surface, count(*) as views
    from public.product_events
    where event_type = 'paywall_viewed' and created_at >= now() - interval '${DAYS} days'
    group by 1 order by 1;
  `));
  table(await runQuery(`
    select count(*) as checkout_started_events
    from public.product_events
    where event_type = 'checkout_started' and created_at >= now() - interval '${DAYS} days';
  `));

  console.log('\nDone. Zero writes performed (every statement above was a SELECT/WITH).');
}

main().catch((err) => {
  console.error('analytics-report.mjs failed:', err.message);
  process.exit(1);
});
