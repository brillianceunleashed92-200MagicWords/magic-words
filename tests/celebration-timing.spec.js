import { test, expect } from "@playwright/test";

// FIX_CELEBRATION_R1 Phase 4 -- permanent regression coverage for the
// star-ignition-on-a-bare-screen bug (docs/CELEBRATION_FIX_REPORT.md).
//
// Root cause: GameEngine.handleAnswer fired onProgress (PlayScreen's
// handleProgress, which awaits a Supabase write before detecting a
// mastery crossing) without awaiting it, then -- on the session's last
// question -- called onSessionEnd almost immediately after. A slow
// write let the crossing-detection + queueCelebration call land AFTER
// the screen had already swapped to Session Complete (or beyond),
// landing the ignition on whatever screen navigation reached next.
// Fix: the last question's onSessionEnd now awaits that same promise
// first, so the celebration is always queued before the screen swap.
//
// Fixture mirrors tests/pedagogy-preview-walk.spec.js's sibling-mastery
// trick: unit 1's 8 words, sort_order 1-8 (cat,dog,bird,fish,bear,ball,
// book,cup). Pre-mastering everyone except "ball" to raw mastery=100
// (tied) makes the client-side fallback plan's ascending-mastery stable
// sort select exactly cat,dog,bird,fish,bear,ball as the 6-question
// session, with "ball" last -- so its 3rd correct answer both crosses
// isRealMastery and ends the session in the same instant, matching the
// forensic timeline in the report.
const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const ORDER = ["cat", "dog", "bird", "fish", "bear", "ball"];

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
    body: JSON.stringify({ parent_id: userId, name: "TimingKid", age: 6, avatar: "rocket", interests: [] }),
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

test("crossing at attempt 3 fires exactly one ignition, anchored to its own answer (not a later screen)", async ({ page }) => {
  test.setTimeout(90000);
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  const fixture = await provisionFixture("mwcelebtiming");
  try {
    // Slow every word_progress write so a still-racing implementation
    // would visibly show Session Complete before the ignition catches
    // up -- the fixed implementation must show them together.
    await page.route("**/rest/v1/word_progress*", async (route) => {
      if (route.request().method() !== "GET") await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await signIn(page, fixture.email);
    await playSixWordSession(page);

    const start = Date.now();
    let sessionCompleteAt = null;
    let ignitionAt = null;
    let ignitionOccurrences = 0;
    while (Date.now() - start < 8000 && (sessionCompleteAt === null || ignitionAt === null)) {
      const text = await page.locator("body").innerText();
      if (sessionCompleteAt === null && /Session Complete/i.test(text)) sessionCompleteAt = Date.now() - start;
      if (ignitionAt === null && /star ignited/i.test(text)) ignitionAt = Date.now() - start;
      await page.waitForTimeout(150);
    }
    expect(sessionCompleteAt, "Session Complete never rendered").not.toBeNull();
    expect(ignitionAt, "ignition never rendered").not.toBeNull();
    // Anchored: the ignition must not lag Session Complete by more than
    // one poll interval's worth of slack -- the bug's signature was a
    // multi-second gap (2815ms measured against the pre-fix code).
    expect(ignitionAt - sessionCompleteAt).toBeLessThan(1000);

    // Exactly one ignition — dismiss it, wait out the full network delay
    // window again, and confirm it doesn't reappear (would indicate a
    // duplicate/re-queued fire).
    await page.getByText('"ball" star ignited!').click().catch(() => {});
    await page.waitForTimeout(2500);
    const finalText = await page.locator("body").innerText();
    ignitionOccurrences = (finalText.match(/star ignited/gi) || []).length;
    expect(ignitionOccurrences).toBeLessThanOrEqual(1); // dismissed, or never re-showed
  } finally {
    await deleteAccount(fixture.userId);
  }
});

test("remount/refetch after a crossing fires zero additional ignitions", async ({ page }) => {
  test.setTimeout(90000);
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  const fixture = await provisionFixture("mwcelebremount");
  try {
    await signIn(page, fixture.email);
    await playSixWordSession(page);

    await expect(page.getByText('"ball" star ignited!')).toBeVisible({ timeout: 10000 });
    await page.getByText('"ball" star ignited!').click().catch(() => {});
    await page.waitForTimeout(800);

    // Navigate home (unmount PlayScreen), then back into Play (remount +
    // refetch wordProgress) -- the already-crossed word must not
    // re-fire just because its data was re-fetched.
    await page.getByRole("button", { name: "Home" }).click().catch(() => {});
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(2000);
    let bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/star ignited/i);

    // Pull-to-refresh equivalent: force a fresh reload of the whole app
    // (re-mounts everything, forces every query to refetch from scratch).
    await page.reload();
    await page.waitForTimeout(2500);
    bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/star ignited/i);
  } finally {
    await deleteAccount(fixture.userId);
  }
});
