import { test, expect } from "@playwright/test";

// FEAT_PARENT_METRICS_R1 Phase 4 — one shared fixture account (a "ChartKid"
// with a heavy seeded history + an unseeded "EmptyKid") provisions the data
// all 3 required specs need: (a) all 6 charts populate with real data, (b)
// empty-state, (c) child-switch refetch. Provisioned once in beforeAll
// (>=1200 learning_events is expensive to insert 3x) and torn down in
// afterAll, same self-provisioning-via-service-role pattern as
// draw-it-tracing.spec.js.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const WORDS = [
  "cat", "dog", "bird", "fish", "bear", "ball", "book", "cup",
  "frog", "horse", "lion", "rabbit", "duck", "cow", "pig", "turtle", "monkey", "shark", "ant", "bee",
  "eat", "jump", "run", "swim", "fly", "dance", "sing", "play",
  "stop", "go", "look", "see", "help", "sleep", "open", "sit", "push", "pull", "throw", "catch", "stand", "hop",
  "big", "small", "hot", "cold", "happy", "sad", "fast", "slow",
];
const REAL_GAME_TYPES = ["word_match", "word_hunt", "rhyme_time", "find_the_word", "flash_cards", "story_time", "story_builder", "word_builder", "say_it", "draw_it"];
const SCORELESS = new Set(["draw_it", "word_builder"]);
const MS_PER_DAY = 86400000;

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function buildFixtureEvents(userId, childId) {
  const now = new Date();
  function isoAt(daysAgo, hour) {
    const d = new Date(now.getTime() - daysAgo * MS_PER_DAY);
    d.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
    return d.toISOString();
  }

  const eventsByWord = new Map();
  function addEvent(word, { daysAgo, hour, gameType, correct, responseMs }) {
    if (!eventsByWord.has(word)) eventsByWord.set(word, []);
    eventsByWord.get(word).push({
      user_id: userId, child_id: childId, word, game_type: gameType, correct,
      response_time_ms: responseMs, attempt_number: 1, recorded_at: isoAt(daysAgo, hour),
    });
  }

  // 8 tracked words, one per rolling-week bucket 0..7 — exactly 3 correct
  // events each, so computeWeeklyMasteryCrossings shows a real crossing in
  // every one of the last 8 weeks.
  WORDS.slice(0, 8).forEach((word, weekIdx) => {
    const base = weekIdx * 7;
    [base + 5, base + 3, base + 1].forEach((daysAgo, i) => {
      addEvent(word, { daysAgo, hour: 9 + i, gameType: "word_match", correct: true, responseMs: randInt(1200, 5000) });
    });
  });

  // Filler events across the full 84-day window: mixed game_types (incl.
  // rare retired magic_video + scoreless rows), mixed correctness, a
  // handful of >30s response-time outliers.
  let outlierBudget = 15;
  for (let daysAgo = 0; daysAgo < 84; daysAgo++) {
    const perDay = randInt(13, 17);
    for (let i = 0; i < perDay; i++) {
      const word = pick(WORDS);
      const useRetired = Math.random() < 0.008;
      const gameType = useRetired ? "magic_video" : pick(REAL_GAME_TYPES);
      const correct = SCORELESS.has(gameType) ? true : Math.random() < 0.8;
      let responseMs = randInt(900, 9000);
      if (outlierBudget > 0 && Math.random() < 0.01) {
        responseMs = randInt(31000, 60000);
        outlierBudget--;
      }
      addEvent(word, { daysAgo, hour: randInt(7, 20), gameType, correct, responseMs });
    }
  }

  const allEvents = [];
  const progressRows = [];
  const RUNG_OFFSETS_DAYS = [-3, -1, 1, 3, 5, 7, 10, 13, 20, 30];
  let wi = 0;
  for (const [word, events] of eventsByWord) {
    events.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    allEvents.push(...events);

    let attemptCount = 0, correctCount = 0;
    for (const e of events) { attemptCount++; if (e.correct) correctCount++; }
    const mastery = Math.round((correctCount / attemptCount) * 100);
    const offset = RUNG_OFFSETS_DAYS[wi % RUNG_OFFSETS_DAYS.length];
    wi++;
    progressRows.push({
      user_id: userId, child_id: childId, word, mastery,
      attempt_count: attemptCount, correct_count: correctCount,
      next_review_at: new Date(now.getTime() + offset * MS_PER_DAY).toISOString(),
      review_interval_days: Math.abs(offset) || 1,
    });
  }

  return { allEvents, progressRows };
}

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwparentmetrics${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;

  async function createChild(name, avatar) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ parent_id: userId, name, avatar, interests: [] }),
    });
    const [child] = await res.json();
    return child;
  }

  // ChartKid created first -> it's the default active child (children[0]
  // fallback in useCandyGalaxyData).
  const chartKid = await createChild("ChartKid", "rocket");
  const emptyKid = await createChild("EmptyKid", "star");

  const chartKidId = chartKid.id;
  const emptyKidId = emptyKid.id;

  const { allEvents, progressRows } = buildFixtureEvents(userId, chartKidId);

  // Chunk the bulk insert to keep individual request bodies reasonable.
  const CHUNK = 500;
  for (let i = 0; i < allEvents.length; i += CHUNK) {
    await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, { method: "POST", headers: adminHeaders, body: JSON.stringify(allEvents.slice(i, i + CHUNK)) });
  }
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, { method: "POST", headers: adminHeaders, body: JSON.stringify(progressRows) });

  return { email, userId, chartKidId, emptyKidId, eventCount: allEvents.length };
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
}

async function openGrownUpsDashboard(page) {
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

test.describe("Parent Metrics Dashboard charts", () => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.describe.configure({ mode: "serial" });

  let fixture;

  test.beforeAll(async () => {
    fixture = await provisionFixture();
    expect(fixture.eventCount).toBeGreaterThanOrEqual(1200);
  });

  test.afterAll(async () => {
    await deleteAccount(fixture?.userId);
  });

  test("all 6 charts populate with real data for the seeded child", async ({ page }) => {
    test.setTimeout(60000);
    await signIn(page, fixture.email);
    await openGrownUpsDashboard(page);

    // ChartKid is created first, so it's the default active child.
    const emptyMessages = [
      "No words have reached real mastery yet",
      "No practice logged in the last 12 weeks yet",
      "Not enough recent attempts yet",
      "No timed answers yet",
      "No words are due for review",
    ];
    for (const msg of emptyMessages) {
      await expect(page.getByText(msg, { exact: false })).not.toBeVisible();
    }

    // Recharts renders real SVG bar/line elements once data is non-empty —
    // a stronger assertion than "the empty message is absent." 5 of the 6
    // charts use recharts; the practice heatmap is a plain CSS grid.
    await expect(page.locator(".recharts-wrapper")).toHaveCount(5);
    const barCount = await page.locator(".recharts-bar-rectangle").count();
    expect(barCount).toBeGreaterThan(0);
    const lineDotCount = await page.locator(".recharts-line-dot").count();
    expect(lineDotCount).toBeGreaterThan(0);
  });

  test("empty state renders for an unseeded child", async ({ page }) => {
    test.setTimeout(60000);
    await signIn(page, fixture.email);

    // Switch to EmptyKid on Home before opening the Dashboard.
    await page.click('button:has-text("EmptyKid")');
    await page.waitForTimeout(500);
    await openGrownUpsDashboard(page);

    await expect(page.getByText("No words have reached real mastery yet", { exact: false })).toBeVisible();
    await expect(page.getByText("No practice logged in the last 12 weeks yet", { exact: false })).toBeVisible();
    await expect(page.getByText("Not enough recent attempts yet", { exact: false })).toBeVisible();
    await expect(page.getByText("No timed answers yet", { exact: false })).toBeVisible();
    await expect(page.getByText("No words are due for review", { exact: false })).toBeVisible();
  });

  test("switching children refetches the Dashboard's chart data", async ({ page }) => {
    test.setTimeout(60000);
    await signIn(page, fixture.email);
    await openGrownUpsDashboard(page);

    // Starts on ChartKid (populated) -> confirm real data first.
    let barCount = await page.locator(".recharts-bar-rectangle").count();
    expect(barCount).toBeGreaterThan(0);

    // Switch to EmptyKid from Home, then return to the still-open Dashboard tab.
    await page.click("text=Home");
    await page.waitForTimeout(500);
    await page.click('button:has-text("EmptyKid")');
    await page.waitForTimeout(500);
    await page.click("text=Grown-ups");
    await page.waitForTimeout(2000);

    await expect(page.getByText("No words have reached real mastery yet", { exact: false })).toBeVisible();

    // Switch back to ChartKid -> real data returns (proves the query key
    // includes childId rather than serving a stale cached empty result).
    await page.click("text=Home");
    await page.waitForTimeout(500);
    await page.click('button:has-text("ChartKid")');
    await page.waitForTimeout(500);
    await page.click("text=Grown-ups");
    await page.waitForTimeout(2000);

    barCount = await page.locator(".recharts-bar-rectangle").count();
    expect(barCount).toBeGreaterThan(0);
  });
});
