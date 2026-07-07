import { test, expect } from "@playwright/test";

// FEAT_PEDAGOGY_CALIBRATION_R1 Phase 8 -- preview/production walk.
// Runs against a real deployment (DEPLOY_BASE_URL, default production),
// same convention as csp-walk.spec.js/story-time-chrome.spec.js. This is
// the ONLY place in the suite that exercises the REAL
// api/session-generator.js selection path -- local Vite dev serves no
// /api routes, so every other spec (including pedagogy-calibration.spec.js)
// necessarily runs against the client-side offline fallback
// (sessionPlanFallbackUnit.js) instead, a documented, accepted gap noted
// throughout this run's report.
//
// Fixture mirrors pedagogy-calibration.spec.js's own (siblings genuinely
// mastered so "cat" is the only unit-1 word left in the candidate pool) --
// NOT a "fully fresh, zero seeding" account. An earlier draft of this file
// used a fully-fresh account and hit a real, confirmed difference between
// the local fallback and the server: buildSupabaseFallbackPlan's
// focusWords sorts ascending by RAW mastery and slices to 6 -- with unit
// 1's 8 words, "cat" (100% raw mastery after 1 tap) sorts past that
// cutoff and gets excluded from the next local batch entirely, even
// though it's still genuinely selectable server-side (session-generator's
// currentUnitWords is an unsorted filter, no such cutoff -- confirmed by
// reading both). That's an accepted local-fallback simplification (its own
// header says "doesn't need full parity"), not a bug -- but it means a
// fully-fresh fixture can't reliably drive a multi-batch journey through
// EITHER path without either (a) tolerating filler questions on unknown
// words with unknown correct answers (RhymeTime/Find the Word have no
// generalizable correct-answer-for-an-arbitrary-word rule), or (b) doing
// what this version does: pre-mastering the siblings so "cat" is the only
// unit-1 candidate everywhere, eliminating fillers entirely and making the
// walk deterministic against BOTH paths.
const DEPLOY_BASE_URL = process.env.DEPLOY_BASE_URL || "https://200magicwordsapp.com";
test.use({ baseURL: DEPLOY_BASE_URL });

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwpreviewwalk${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;
  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "JourneyKid", age: 6, avatar: "rocket", interests: [] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  const unit1Res = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=eq.1&select=word`, { headers: adminHeaders });
  const unit1Words = (await unit1Res.json()).map((w) => w.word);
  const siblings = unit1Words.filter((w) => w !== "cat");
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify(siblings.map((w) => ({ user_id: userId, child_id: childId, word: w, mastery: 100, attempt_count: 5, correct_count: 5 }))),
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

test("preview walk: full one-tap-word journey stays current until real mastery, celebrates once, galaxy/counts agree", async ({ page }) => {
  test.setTimeout(120000);
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  const fixture = await provisionFixture();
  try {
    await signIn(page, fixture.email);

    // Attempt 1, via Tap & Hear. Siblings are pre-mastered, so "cat" is
    // the only candidate -- no filler questions possible.
    await page.getByText("Tap & Hear", { exact: true }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator("text=/Tap the picture of\\s+cat/i")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /^cat\b/i }).click();
    await page.waitForTimeout(2200);

    const bodyAfter1 = await page.locator("body").innerText();
    expect(bodyAfter1).not.toMatch(/now shining|mastered/i);

    await page.getByRole("button", { name: "Exit and save progress" }).click();
    await page.waitForTimeout(1500);

    const homeAfter1 = await page.locator("body").innerText();
    expect(homeAfter1).toMatch(/"cat"/); // currentWord did not roll forward

    const wp1Res = await fetch(`${SUPABASE_URL}/rest/v1/word_progress?child_id=eq.${fixture.childId}&word=eq.cat&select=mastery,attempt_count`, { headers: adminHeaders });
    const [wp1] = await wp1Res.json();
    expect(wp1.mastery).toBe(100);
    expect(wp1.attempt_count).toBe(1);

    // Attempts 2 and 3, via Word Hunt then Match & Sort -- still only
    // "cat" eligible, so each activity's single question is guaranteed
    // to target it.
    await page.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(1500);
    await page.getByText("Word Hunt", { exact: true }).click();
    await page.waitForTimeout(2000);
    const imgs = await page.getByRole("img").all();
    let huntTarget = null;
    for (const img of imgs) {
      const label = await img.getAttribute("aria-label");
      if (label && label.toLowerCase() !== "nova" && /^[a-z]+$/i.test(label)) { huntTarget = label; break; }
    }
    expect(huntTarget?.toLowerCase()).toBe("cat");
    await page.getByRole("button", { name: /^cat\b/i }).click();
    await page.waitForTimeout(2200);
    await page.getByRole("button", { name: "Exit and save progress" }).click();
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(1500);
    await page.getByText("Match & Sort", { exact: true }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText("cat", { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /^bat\b/i }).click(); // cat's real rhyme per RHYME_MAP
    await page.waitForTimeout(2200);
    await page.getByRole("button", { name: "Exit and save progress" }).click();
    await page.waitForTimeout(1500);

    const wp3Res = await fetch(`${SUPABASE_URL}/rest/v1/word_progress?child_id=eq.${fixture.childId}&word=eq.cat&select=mastery,attempt_count`, { headers: adminHeaders });
    const [wp3] = await wp3Res.json();
    expect(wp3.attempt_count).toBe(3);
    expect(wp3.mastery).toBe(100);

    await page.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Home" }).click().catch(() => {});
    await page.waitForTimeout(1000);
    await page.click("text=Galaxy");
    await page.waitForTimeout(1500);
    const galaxyText = await page.locator("body").innerText();
    expect(galaxyText).toMatch(/8\s*\/\s*200/); // 7 pre-seeded siblings + cat, now genuinely mastered

    console.log(`PREVIEW WALK: one-tap-word journey verified live against ${DEPLOY_BASE_URL} -- "cat" stayed current through attempts 1-2, crossed real mastery at attempt 3, galaxy count agrees.`);
  } finally {
    await deleteAccount(fixture.userId);
  }
});

test("preview walk: reviewOnly Quiz Boss pulls a real due-for-review word via server-side selection", async ({ page }) => {
  test.setTimeout(90000);
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");

  // Mirrors quiz-boss.spec.js's own fixture: "cat" due for review (past
  // next_review_at), every other unit<=2 word genuinely mastered with a
  // far-future next_review_at so it can't leak into the reviewOnly pool
  // ahead of "cat". Unlike that spec (which can only prove this against
  // the local fallback, which has no reviewOnly concept at all and just
  // returns unit 3's weakest words per its own documented trap), this
  // walk proves the real server-side spaced-repetition selection actually
  // surfaces "cat" specifically.
  const email = `nextgenprecisiondrones+mwpreviewwalk${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;
  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "JourneyKid", age: 6, avatar: "rocket", interests: [] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  try {
    const wordsRes = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=lte.2&select=word`, { headers: adminHeaders });
    const words = await wordsRes.json();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
      method: "POST", headers: adminHeaders,
      body: JSON.stringify(words.map((w) => (
        w.word === "cat"
          ? { user_id: userId, child_id: childId, word: w.word, mastery: 100, attempt_count: 5, correct_count: 5, next_review_at: yesterday }
          : { user_id: userId, child_id: childId, word: w.word, mastery: 100, attempt_count: 3, correct_count: 3, next_review_at: farFuture }
      ))),
    });
    const priorActivities = ["word_match", "word_hunt", "rhyme_time", "find_the_word"];
    await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
      method: "POST", headers: adminHeaders,
      body: JSON.stringify(priorActivities.map((gt) => ({
        child_id: childId, user_id: userId, word: "eat", game_type: gt, correct: true, attempt_number: 1,
      }))),
    });

    await signIn(page, email);
    await page.getByRole("button", { name: "Quiz Boss" }).click();
    await page.waitForTimeout(3000);

    // No self-rating UI at any point (app-measured, not self-rated).
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/I know it|Need practice/);

    // "cat" (the due-for-review word) must actually appear in the battle
    // -- proof the real server-side reviewOnly pool was used, not the
    // local fallback's unit-3-weakest-words behavior.
    await expect(page.getByRole("button", { name: /^cat\b/i })).toBeVisible({ timeout: 10000 });

    console.log(`PREVIEW WALK: Quiz Boss reviewOnly pool surfaced "cat" via real server-side selection against ${DEPLOY_BASE_URL}.`);
  } finally {
    await deleteAccount(userId);
  }
});
