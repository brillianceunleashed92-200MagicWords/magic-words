// Measures tap-to-playable latency + full network waterfall for
// docs/ACTIVITY_LOAD_PERF_REPORT.md (PERF_ACTIVITY_LOAD_R1). Not part of
// the gated test suite -- a manually-run measurement tool so the before/
// after methodology in that report is reproducible.
//
// Provisions a fresh, realistic test account + child per run via the
// Supabase admin REST API (same pattern as tests/overlap-probes.spec.js),
// seeded with mixed word_progress (some partial mastery, some untouched --
// NOT an empty or fully-mastered account, per the report's "representative
// account/state" requirement). Signs in, taps "Let's go!" (t0 -- the word
// tap that mounts PlayScreen and fires plan generation), waits a realistic
// ~1s QuestPath dwell (matches the precedent in tests/overlap-probes.spec.js),
// taps "Tap & Hear" (word_match -- chosen because it's the one activity
// confirmed to render the answer word as visible text inside a real
// <button>, giving an unambiguous "playable" signal), then waits for a real
// answer tile to render. Deletes the account afterward.
//
// TRAP (see report TRAPS section): do NOT use a loading indicator going
// hidden as the "playable" signal -- Playwright's waitFor({state:'hidden'})
// resolves immediately for an element that was never attached in the first
// place, which under-reported this measurement by ~5-6x in an early
// version of this script. Always wait for a positive, definitive signal.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/measure-activity-load-waterfall.mjs \
//     [--base-url=https://200magicwordsapp.com] [--warm] [--dwell=8000] [label]
//
//   --base-url   target to measure against. Defaults to production. Pass
//                the SHA-matched preview URL to measure an unmerged branch
//                (production always runs main -- see docs/... memory on
//                the domain/branch trap).
//   --warm       after the cold (first-tap) measurement, exit early back to
//                Home and tap the SAME word again in the same session, to
//                also measure the warm-plan-cache-reuse path.
//   --dwell=N    wait N ms on Home (after sign-in, before the first tap)
//                to simulate a realistic child looking around before
//                tapping "Let's go!" -- isolates the prefetchSessionPlan
//                Home-mount improvement (see report WATERFALL AFTER):
//                on unmodified code with no prefetch, dwelling does
//                nothing; with the fix, the plan can finish generating
//                in the background during the dwell. Reports
//                sessionGeneratorCalls so you can confirm directly
//                whether the tap triggered a fresh AI round trip.

import { chromium } from "playwright";

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const args = process.argv.slice(2);
const baseUrlArg = args.find((a) => a.startsWith("--base-url="));
const BASE = baseUrlArg ? baseUrlArg.slice("--base-url=".length) : "https://200magicwordsapp.com";
const WARM = args.includes("--warm");
const dwellArg = args.find((a) => a.startsWith("--dwell="));
const DWELL_MS = dwellArg ? Number(dwellArg.slice("--dwell=".length)) : 0;
const label = args.find((a) => !a.startsWith("--")) ?? "1";

if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function provisionAccount(prefix) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() },
    }),
  });
  const user = await res.json();
  return { email, userId: user.id };
}

async function makeChild(userId, name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name, age: 6, avatar: "rocket", interests: ["dinosaurs"] }),
  });
  const [child] = await res.json();
  return child.id;
}

// A "representative" returning account: some unit-1 progress (partial
// mastery + untouched words, both content and function types) -- NOT a
// brand-new empty account and NOT a fully-mastered one.
async function seedRealisticProgress(childId) {
  const rows = [
    { child_id: childId, word: "cat", mastery: 60, attempt_count: 3 },
    { child_id: childId, word: "dog", mastery: 40, attempt_count: 2 },
    { child_id: childId, word: "bird", mastery: 0, attempt_count: 0 },
    { child_id: childId, word: "fish", mastery: 0, attempt_count: 0 },
    { child_id: childId, word: "the", mastery: 80, attempt_count: 4 },
    { child_id: childId, word: "is", mastery: 20, attempt_count: 1 },
  ];
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(rows),
  });
}

async function deleteAccount(userId) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function runOnce() {
  const { email, userId } = await provisionAccount(`mwperf${label}_`);
  const childId = await makeChild(userId, "PerfKid");
  await seedRealisticProgress(childId);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const requests = [];
  let t0 = null; // set at each word tap ("Let's go!")

  page.on("requestfinished", async (request) => {
    try {
      const timing = request.timing();
      const response = await request.response();
      const now = Date.now();
      requests.push({
        url: request.url(),
        method: request.method(),
        status: response ? response.status() : null,
        finishedOffsetMs: t0 != null ? now - t0 : null,
        durationMs: Math.round(timing.responseEnd - timing.requestStart),
      });
    } catch {
      // ignore requests that error before timing/response is available
    }
  });

  const candidatePattern = /cat|dog|bird|fish|the|is/i;

  async function tapWordThenActivity() {
    t0 = Date.now();
    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.getByText("Today's Quest").waitFor({ timeout: 10000 });
    const tQuestPathVisible = Date.now();
    await page.waitForTimeout(1000); // realistic QuestPath dwell

    const activityButton = page.getByRole("button", { name: "Tap & Hear" }).first();
    await activityButton.waitFor({ timeout: 10000 });
    const tActivityTap = Date.now();
    await activityButton.click();

    await page.getByRole("button", { name: candidatePattern }).first().waitFor({ timeout: 15000 });
    const tPlayable = Date.now();

    const sgCalls = requests.filter((r) => r.url.includes("session-generator"));
    return {
      target: BASE,
      wordTapToQuestPathMs: tQuestPathVisible - t0,
      activityTapToPlayableMs: tPlayable - tActivityTap,
      wordTapToPlayableMs: tPlayable - t0,
      sessionGeneratorCalls: sgCalls.length,
      sessionGeneratorDurations: sgCalls.map((r) => r.durationMs),
      requests: requests.filter((r) => r.finishedOffsetMs !== null && r.finishedOffsetMs >= -50),
    };
  }

  try {
    await page.goto(`${BASE}/app`);
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.getByText(/Ready to fly\?|Nova mapped your next|Let's go/).first().waitFor({ timeout: 20000 });

    if (DWELL_MS > 0) await page.waitForTimeout(DWELL_MS);

    const cold = await tapWordThenActivity();
    let warm = null;

    if (WARM) {
      // Scenario B: repeat tap, same account/session, same word. Exit
      // early (no answer given, so word_progress/currentWord don't shift),
      // return to Home, tap "Let's go!" again -- should hit the warm cache.
      await page.getByRole("button", { name: "Exit and save progress" }).click();
      await page.getByText(/Ready to fly\?|Nova mapped your next|Let's go/).first().waitFor({ timeout: 20000 });
      requests.length = 0;
      warm = await tapWordThenActivity();
    }

    await browser.close();
    await deleteAccount(userId);

    return { label, target: BASE, cold, warm };
  } catch (err) {
    await browser.close().catch(() => {});
    await deleteAccount(userId).catch(() => {});
    throw err;
  }
}

runOnce().then((result) => {
  console.log(JSON.stringify(result, null, 2));
}).catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
