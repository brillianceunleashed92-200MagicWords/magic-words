import { test, expect } from "@playwright/test";

// Find the Word (docs/200MW_Prompt6_Activity_Roster.md, Part 3) — covers
// the audio-first happy path (word never shown as text before answering)
// and the errorless first-miss behavior, same pattern as
// tests/fill-the-story.spec.js. Needs SUPABASE_SERVICE_ROLE_KEY.
//
// Each test provisions its own account+child — playing a real question
// mutates word_progress/learning_events, so a shared fixture would make
// the second test depend on what the first did.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Same units-1-2-mastered fixture shape as fill-the-story.spec.js, so
// unit 3 (all verbs, "eat" first by sort_order) becomes the current pool
// — but seeds only ranks 1-3 (word_match/word_hunt/rhyme_time) done for
// "eat", which is exactly enough to unlock Find the Word (rank 4) on the
// Guided Path without also unlocking anything past it.
async function provisionFixture() {
  const targetWord = "eat";
  const email = `nextgenprecisiondrones+mwftw${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;

  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "SpecKid", age: 6, avatar: "rocket", interests: ["dinosaurs"] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  const wordsRes = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=lte.2&select=word`, { headers: adminHeaders });
  const words = await wordsRes.json();
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(words.map((w) => ({ user_id: userId, child_id: childId, word: w.word, mastery: 100 }))),
  });

  const priorActivities = ["word_match", "word_hunt", "rhyme_time"];
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(priorActivities.map((gt) => ({
      child_id: childId, user_id: userId, word: targetWord, game_type: gt, correct: true, attempt_number: 1,
    }))),
  });

  return { email, userId, targetWord };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function startFindTheWord(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: /Let's go/ }).click();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Find the Word" }).click();
  await page.waitForTimeout(2500);
}

test("Find the Word: audio-first happy path, word never shown as a cue before answering", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId, targetWord } = await provisionFixture();
  try {
    await startFindTheWord(page, email);

    // The instructional message never names the word -- only "Find the
    // word Nova said!" (audio is the cue), no "Tap the picture of eat"
    // style prompt text anywhere.
    await expect(page.getByText("Find the word Nova said!")).toBeVisible();
    const promptArea = await page.locator("body").innerText();
    expect(promptArea).not.toMatch(/says? ["']?eat["']?/i);

    // 4 real-word tiles, exactly one of which is the target.
    const tiles = page.getByRole("button", { name: new RegExp(`^(${targetWord}|ear|eight|east)$`) });
    await expect(tiles).toHaveCount(4);

    await page.getByRole("button", { name: targetWord, exact: true }).click();
    await page.waitForTimeout(2500);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("XP");
    expect(bodyText).not.toMatch(/Not quite/);
  } finally {
    await deleteAccount(userId);
  }
});

test("Find the Word: first miss is errorless (wiggle+glow, no completion, no phonics)", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId, targetWord } = await provisionFixture();
  try {
    await startFindTheWord(page, email);

    const wrongTile = page.getByRole("button", { name: /^(ear|eight|east)$/ }).first();
    await wrongTile.click();

    await expect(page.getByText(/Not quite.*glowing/)).toBeVisible();
    const bodyAfterMiss = await page.locator("body").innerText();
    expect(bodyAfterMiss).not.toContain("XP"); // no answer scored yet — errorless, not completed
    // Hard rule: never letter sounds, blending, or letter names anywhere.
    expect(bodyAfterMiss.toLowerCase()).not.toMatch(/sound.?out|blend|letter name/);

    await page.getByRole("button", { name: targetWord, exact: true }).click();
    await page.waitForTimeout(2500);
    const bodyAfterCorrect = await page.locator("body").innerText();
    expect(bodyAfterCorrect).toContain("XP");
  } finally {
    await deleteAccount(userId);
  }
});
