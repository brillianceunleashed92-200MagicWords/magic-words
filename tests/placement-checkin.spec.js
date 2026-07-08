import { test, expect } from "@playwright/test";
import { isCheckinEligible } from "../src/lib/checkinEligibility.js";

// FEAT_PLACEMENT_CHECKIN_R1 Phase 3 — fixtures + tests. Same production-
// only convention as placement-adventure.spec.js (local Vite serves no
// /api routes, so the ladder/history endpoints 404 there).

// ─── Pure-function eligibility tests (plain Node, no browser) ─────────────
function daysAgoIso(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

test("eligibility: never placed (null placement_completed_at) is never eligible", () => {
  expect(isCheckinEligible({ placement_completed_at: null })).toBe(false);
});

test("eligibility: 35 days since last measurement is eligible", () => {
  expect(isCheckinEligible({ placement_completed_at: daysAgoIso(35) })).toBe(true);
});

test("eligibility: 10 days since last measurement is not yet eligible", () => {
  expect(isCheckinEligible({ placement_completed_at: daysAgoIso(10) })).toBe(false);
});

// ─── Live tests (against a real deployment -- local Vite serves no /api
// routes). DEPLOY_BASE_URL lets this run against this branch's own
// preview before merge; defaults to production once merged, same
// convention as pedagogy-preview-walk.spec.js. ──────────────────────────
test.use({ baseURL: process.env.DEPLOY_BASE_URL || "https://200magicwordsapp.com" });

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function provisionChild(prefix, { measuredUnit, placementUnit, daysAgo }) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;
  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({
      parent_id: userId, name: "CheckinKid", age: 6, avatar: "rocket", interests: [],
      placement_unit: placementUnit, measured_unit: measuredUnit, placement_completed_at: daysAgoIso(daysAgo),
    }),
  });
  const [child] = await childRes.json();
  return { email, userId, childId: child.id };
}
async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}
async function fetchChild(childId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles?id=eq.${childId}&select=placement_unit,measured_unit,placement_completed_at`, { headers: adminHeaders });
  const [child] = await res.json();
  return child;
}
// checkin_completed is written via a fire-and-forget insert server-side
// (same pattern as every other product_events writer) -- poll instead of
// a single immediate read, since the insert's landing time is variable.
async function fetchCheckinEvents(childId) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/product_events?child_id=eq.${childId}&event_type=in.(checkin_started,checkin_completed)&select=event_type,payload,created_at&order=created_at.asc`, { headers: adminHeaders });
    const events = await res.json();
    if (events.some((e) => e.event_type === "checkin_completed")) return events;
    await new Promise((r) => setTimeout(r, 500));
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/product_events?child_id=eq.${childId}&event_type=in.(checkin_started,checkin_completed)&select=event_type,payload,created_at&order=created_at.asc`, { headers: adminHeaders });
  return res.json();
}

async function signIn(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
}

function nextCheckinResponse(page) {
  return page.waitForResponse((r) => r.url().includes("/api/session-generator") && r.request().method() === "POST");
}

// Drives the check-in ladder to completion, answering every rung either
// always-correct or always-incorrect. Reads the real target word out of
// each network response (never assumed/guessed) so correctness is
// deterministic rather than tapping "the first tile" and hoping. Takes
// the FIRST rung's already-armed response promise (set up by the caller
// BEFORE clicking "Start" -- waitForResponse must be armed before its
// triggering action, not after, or it waits for a network call that
// already happened and deadlocks).
async function runCheckin(page, { forceCorrect }, firstResponsePromise) {
  let responsePromise = firstResponsePromise;
  for (let round = 0; round < 12; round++) {
    const resp = await responsePromise;
    const body = await resp.json().catch(() => null);
    if (!body?.checkin) { responsePromise = nextCheckinResponse(page); continue; }
    if (body.checkin.done) return body.checkin;

    const probes = body.checkin.words;
    for (let i = 0; i < probes.length; i++) {
      const probe = probes[i];
      await expect(page.locator(`text=/Which word matches this picture|Find the word Nova said/`)).toBeVisible({ timeout: 10000 });
      const wordButtons = page.locator("button").filter({ hasText: /^[a-z']+$/i });
      const count = await wordButtons.count();
      let target = null;
      for (let j = 0; j < count; j++) {
        const text = (await wordButtons.nth(j).innerText()).trim().toLowerCase();
        const isMatch = forceCorrect ? text === probe.word : text !== probe.word;
        if (isMatch) { target = wordButtons.nth(j); break; }
      }
      // The LAST probe's answer is what actually triggers the next
      // network call (fetchRung) -- arm the listener before that click.
      if (i === probes.length - 1) responsePromise = nextCheckinResponse(page);
      await target.click();
      await page.waitForTimeout(1100);
    }
  }
  throw new Error("Check-in did not finalize within 12 rounds");
}

// Same gate-automation technique as tests/parent-metrics-charts.spec.js's
// openGrownUpsDashboard -- a real Playwright mouse hold (not a synthetic
// click), plus the "Quick check" math gate that can follow it.
async function openCheckinFromPortal(page) {
  await page.click("text=Grown-ups");
  await page.waitForTimeout(500);
  const star = page.locator('button[aria-label="Hold to unlock"]');
  const box = await star.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2000);
  await page.mouse.up();
  await page.waitForTimeout(500);

  const quickCheck = page.locator("text=Quick check");
  if (await quickCheck.isVisible().catch(() => false)) {
    const questionText = await page.locator("text=/Quick check: what/").textContent();
    const match = questionText.match(/(\d+)\s*\+\s*(\d+)/);
    const answer = String(Number(match[1]) + Number(match[2]));
    await page.click(`button:has-text("${answer}")`, { exact: true });
    await page.waitForTimeout(500);
  }
  await expect(page.getByText("Progress", { exact: true })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500); // let the lazy ProgressCharts chunk + query settle
}

test("Check-In: eligible card visible, Placement Report shows measured level, full flow records result + growth line", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(120000);
  const fixture = await provisionChild("mwcheckinflow", { measuredUnit: 3, placementUnit: 3, daysAgo: 35 });
  try {
    await signIn(page, fixture.email);
    await openCheckinFromPortal(page);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/Placement Report/i);
    expect(bodyText).toMatch(/Unit 3/);
    expect(bodyText).toMatch(/Time for a Star Check-In/i);

    const firstResponse = nextCheckinResponse(page);
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.locator(`text=/Which word matches this picture|Find the word Nova said/`)).toBeVisible({ timeout: 15000 });

    // §5a tone parity, same assertion as placement-adventure.spec.js's own
    // measurement-exception test -- no wiggle/soften state, ever.
    const wiggleCount = await page.locator('[style*="lessonWiggle"]').count();
    expect(wiggleCount).toBe(0);

    await runCheckin(page, { forceCorrect: true }, firstResponse);
    await expect(page.getByText("Great flying, Star Learner!")).toBeVisible({ timeout: 15000 });

    // Zero assessment language anywhere on the result screen.
    const resultText = await page.locator("body").innerText();
    expect(resultText).not.toMatch(/\btest\b|\bquiz\b|\bassessment\b|\bscore\b/i);

    await page.getByRole("button", { name: /Let's fly/ }).click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 15000 });

    const child = await fetchChild(fixture.childId);
    expect(child.measured_unit).toBeGreaterThanOrEqual(3); // never-regress: at least holds, likely raised by answering correctly
    expect(new Date(child.placement_completed_at).getTime()).toBeGreaterThan(Date.now() - 5 * 60 * 1000); // bumped to "now"

    // Positive-assertion telemetry (rule 4): a legit checkin_completed row
    // actually lands, not just that forged ones are rejected.
    const events = await fetchCheckinEvents(fixture.childId);
    const started = events.find((e) => e.event_type === "checkin_started");
    const completed = events.find((e) => e.event_type === "checkin_completed");
    expect(started).toBeTruthy();
    expect(completed).toBeTruthy();
    expect(typeof completed.payload.rawMeasured).toBe("number");
    expect(typeof completed.payload.appliedMeasured).toBe("number");
  } finally {
    await deleteAccount(fixture.userId);
  }
});

test("Check-In: never-regress -- failing every rung does not lower the stored/enforced level", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(120000);
  const fixture = await provisionChild("mwcheckinregress", { measuredUnit: 15, placementUnit: 15, daysAgo: 35 });
  try {
    await signIn(page, fixture.email);
    await openCheckinFromPortal(page);
    const firstResponse = nextCheckinResponse(page);
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.locator(`text=/Which word matches this picture|Find the word Nova said/`)).toBeVisible({ timeout: 15000 });

    await runCheckin(page, { forceCorrect: false }, firstResponse);
    await expect(page.getByText("Great flying, Star Learner!")).toBeVisible({ timeout: 15000 });

    const child = await fetchChild(fixture.childId);
    expect(child.measured_unit).toBe(15); // never-regress: stored/enforced value untouched by a bad day

    const events = await fetchCheckinEvents(fixture.childId);
    const completed = events.find((e) => e.event_type === "checkin_completed");
    expect(completed).toBeTruthy();
    expect(completed.payload.appliedMeasured).toBe(15); // applied never drops
    expect(completed.payload.rawMeasured).toBeLessThanOrEqual(15); // raw reading can be lower -- informational only
  } finally {
    await deleteAccount(fixture.userId);
  }
});

test("Check-In: ineligible child (measured 5 days ago) shows Placement Report but no Check-In card", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const fixture = await provisionChild("mwcheckinnotelig", { measuredUnit: 4, placementUnit: 4, daysAgo: 5 });
  try {
    await signIn(page, fixture.email);
    await openCheckinFromPortal(page);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/Placement Report/i);
    expect(bodyText).not.toMatch(/Time for a Star Check-In/i);
  } finally {
    await deleteAccount(fixture.userId);
  }
});
