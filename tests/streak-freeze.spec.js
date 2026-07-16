import { test, expect } from "@playwright/test";
import { isoWeekStartString, isEligibleForFreezeGrant } from "../src/lib/streakFreeze.js";

// FEAT_QUICK_WINS_R1 Package E, item 1 — streak freeze grant/accrual.
// Plain Node assertions against the extracted pure functions (no
// Supabase, no browser) — same precedent as sessionPlanFallbackUnit.js /
// blankEngineWeighting.js. Consumption is exercised live (VERIFICATION
// in the report); this covers the grant-eligibility rule exhaustively.
//
// FEAT_QUICK_WINS_R2 — the live "positive twin" below (RULE 3: a real
// product_events row must be proven to land, not just the eligibility
// math) was the one piece Phase 2 parked before writing, per the branch's
// own WIP note and QUICK_WINS_REPORT.md's "Phase 7's fixture-driven
// Playwright spec (below)" reference that was never reached.

test("isoWeekStartString returns the Monday of the given week", () => {
  // 2026-07-08 is a Wednesday.
  expect(isoWeekStartString("2026-07-08")).toBe("2026-07-06");
  // 2026-07-06 is already a Monday.
  expect(isoWeekStartString("2026-07-06")).toBe("2026-07-06");
  // 2026-07-12 is a Sunday — still the same week as the 6th-12th.
  expect(isoWeekStartString("2026-07-12")).toBe("2026-07-06");
  // 2026-07-13 is the next Monday — a new week.
  expect(isoWeekStartString("2026-07-13")).toBe("2026-07-13");
});

test("no active streak is never eligible, regardless of freeze state", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 0, freezeCount: 0, freezeLastGrantedAt: null, today: "2026-07-08" })).toBe(false);
});

test("already holding a freeze is never eligible for another", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 5, freezeCount: 1, freezeLastGrantedAt: null, today: "2026-07-08" })).toBe(false);
});

test("active streak, holds 0, never granted before -> eligible", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 3, freezeCount: 0, freezeLastGrantedAt: null, today: "2026-07-08" })).toBe(true);
});

test("active streak, holds 0, granted earlier THIS ISO week -> not eligible again", () => {
  // Both dates fall in the Mon 2026-07-06 week.
  expect(isEligibleForFreezeGrant({ currentStreak: 3, freezeCount: 0, freezeLastGrantedAt: "2026-07-06", today: "2026-07-08" })).toBe(false);
});

test("active streak, holds 0, last granted a PRIOR ISO week -> eligible again", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 3, freezeCount: 0, freezeLastGrantedAt: "2026-06-29", today: "2026-07-08" })).toBe(true);
});

test("grant is never manufactured beyond one protected day — holding 1 blocks a second grant even mid-new-week", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 10, freezeCount: 1, freezeLastGrantedAt: "2026-06-29", today: "2026-07-13" })).toBe(false);
});

// ─── Live "positive twin" — a real product_events row must actually land ──
const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const ORDER = ["cat", "dog", "bird", "fish", "bear", "ball"];

// Same local-calendar convention useUpdateStreakMutation itself uses
// (Intl.DateTimeFormat('en-CA', {timeZone}) — never a bare ISO string
// through new Date(), the exact footgun isoWeekStartString's own tests
// above caught) so the fixture's "2 days ago" always lands on the same
// side of a timezone/DST boundary the client will compute at test time.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
function daysAgoDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

async function provisionFixture(prefix) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;
  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "FreezeKid", age: 6, avatar: "rocket", interests: [] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  const masteredSiblings = ["cat", "dog", "bird", "fish", "bear", "book", "cup"];
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify([
      ...masteredSiblings.map((w) => ({ user_id: userId, child_id: childId, word: w, mastery: 100, attempt_count: 5, correct_count: 5 })),
      { user_id: userId, child_id: childId, word: "ball", mastery: 100, attempt_count: 2, correct_count: 2 },
    ]),
  });

  // Seeded to guarantee BOTH events fire in the same session-end call:
  // last_activity_date 2 days ago + a held freeze triggers consumption
  // (daysDiff===2 && freezes>0); the grant check runs AFTER that math,
  // against the post-consumption state (streak>0, freezeCount now back
  // to 0, never granted before) -- exactly the "same-call replenish"
  // path streaks.js's own comment calls out, and a real proof that both
  // the CHECK constraint and api/track.js allowlist entries added in
  // migration 0038 actually accept a live client-posted row of each type.
  await fetch(`${SUPABASE_URL}/rest/v1/user_streaks`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId, child_id: childId, current_streak: 5, longest_streak: 5,
      streak_freeze_count: 1, freeze_last_granted_at: null,
      last_activity_date: daysAgoDateStr(2),
    }),
  });

  return { email, userId, childId };
}
async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}
async function signIn(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Let's go/ }).click();
  await page.waitForTimeout(1500);
}
async function playSixWordSession(page) {
  await page.getByText("Tap & Hear", { exact: true }).click();
  await page.waitForTimeout(2000);
  for (const word of ORDER) {
    await expect(page.locator(`text=/Tap the picture of\\s+${word}/i`)).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: new RegExp(`^${word}\\b`, "i") }).click();
    await page.waitForTimeout(1600);
  }
}
// Fire-and-forget insert via /api/track (same pattern as every other
// product_events writer elsewhere in this suite) -- poll instead of a
// single immediate read.
async function fetchStreakFreezeEvents(childId) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/product_events?child_id=eq.${childId}&event_type=in.(streak_freeze_used,streak_freeze_granted)&select=event_type,payload`, { headers: adminHeaders });
    const events = await res.json();
    if (events.length >= 2) return events;
    await new Promise((r) => setTimeout(r, 1500));
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/product_events?child_id=eq.${childId}&event_type=in.(streak_freeze_used,streak_freeze_granted)&select=event_type,payload`, { headers: adminHeaders });
  return res.json();
}

// Needs a real deployment: /api/track (like /api/session-generator
// elsewhere in this suite) 404s on local Vite dev, which serves no /api
// routes at all -- confirmed live, not assumed, same convention as
// placement-checkin.spec.js/star-check.spec.js. DEPLOY_BASE_URL lets this
// run against this branch's own preview before merge.
test.use({ baseURL: process.env.DEPLOY_BASE_URL || "https://200magicwordsapp.com" });

test("product_events: a real session completion that consumes a held freeze and immediately re-qualifies for a grant lands BOTH rows (positive twin)", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(90000);
  const fixture = await provisionFixture("mwfreezeevent");
  try {
    await signIn(page, fixture.email);
    await playSixWordSession(page);
    await expect(page.getByText(/Session Complete/i).first()).toBeVisible({ timeout: 15000 });

    const events = await fetchStreakFreezeEvents(fixture.childId);
    const used = events.find((e) => e.event_type === "streak_freeze_used");
    const granted = events.find((e) => e.event_type === "streak_freeze_granted");
    expect(used).toBeTruthy();
    expect(granted).toBeTruthy();

    const streakRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_streaks?child_id=eq.${fixture.childId}&select=current_streak,streak_freeze_count,freeze_last_granted_at`,
      { headers: adminHeaders },
    );
    const [row] = await streakRes.json();
    expect(row.current_streak).toBe(6); // consumption preserved + incremented the streak
    expect(row.streak_freeze_count).toBe(1); // spent, then immediately re-granted -- back to 1, not 0
    expect(row.freeze_last_granted_at).toBeTruthy();
  } finally {
    await deleteAccount(fixture.userId);
  }
});
