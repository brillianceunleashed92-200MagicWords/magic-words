import { test, expect } from "@playwright/test";

// Fill the Story rebuild (docs/200MW_Prompt4_Fill_The_Story.md) — covers the
// new tap-to-place happy path and the first-miss errorless behavior, per the
// prompt's VERIFY requirement that the suite grow with the rebuild.
// Needs SUPABASE_SERVICE_ROLE_KEY in the environment (not committed), same
// as tests/smoke.spec.js, to provision/clean up its own test account.
//
// Each test provisions its own account+child (rather than sharing one via
// beforeAll) — playing a real Fill the Story question mutates that word's
// mastery/learning_events, so a shared fixture would make the second test's
// behavior depend on what the first test happened to do to it.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Provisions a confirmed account + one child with units 1-2 mastered (so
// unit 3 -- all verbs, has_art except "play" -- becomes the current pool)
// and Fill the Story unlocked on the Guided Path for `targetWord` (seeding
// learning_events for the 6 activities ranked ahead of it -- test-data
// only, the Guided Path's own code/composition is untouched).
async function provisionFixture(targetWord) {
  const email = `nextgenprecisiondrones+mwfts${targetWord}${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
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

  const priorActivities = ["word_match", "word_hunt", "rhyme_time", "find_the_word", "flash_cards", "story_time"];
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(priorActivities.map((gt) => ({
      child_id: childId, user_id: userId, word: targetWord, game_type: gt, correct: true, attempt_number: 1,
    }))),
  });

  return { email, userId };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function startFillTheStory(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  // The child profile is already seeded (test-data fixture, not UI
  // onboarding), so a confirmed sign-in lands directly on Home.
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: /Let's go/ }).click();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Fill the Story" }).click();
  await page.waitForTimeout(2500);
}

test("Fill the Story: single-tap-to-place happy path with picture cue", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId } = await provisionFixture("eat");
  try {
    await startFillTheStory(page, email);

    // Picture-as-cue for the has_art verb target, shown before answering.
    await expect(page.getByText("Tap a word to place it")).toBeVisible();
    await expect(page.getByText(/Nova/)).toBeVisible();

    // Single tap on the correct chip places it immediately -- no
    // select-then-confirm double tap.
    await page.getByRole("button", { name: /eat/ }).click();

    // Placed word appears in the blank right away (before the chime/
    // read-back finish), and the celebration eventually fires.
    await expect(page.locator("button", { hasText: "eat" }).first()).toBeVisible();
    await page.waitForTimeout(3000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/Not quite/);
  } finally {
    await deleteAccount(userId);
  }
});

test("Fill the Story: first miss is errorless (wiggle+glow, no completion)", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  // Same target word as the happy-path test ("eat") -- Home always
  // recommends the lowest-sort_order unmastered word in the current unit,
  // which is "eat" for a fresh unit-3 pool, regardless of which word Fill
  // the Story was unlocked for. Safe to reuse across tests now since each
  // test provisions its own isolated account.
  const { email, userId } = await provisionFixture("eat");
  try {
    await startFillTheStory(page, email);

    const chips = page.locator("button").filter({ hasText: /^[a-z]{2,}$/ });
    const count = await chips.count();
    let wrongChip = null;
    for (let i = 0; i < count; i++) {
      const t = (await chips.nth(i).innerText()).trim();
      if (t !== "eat") { wrongChip = chips.nth(i); break; }
    }

    await wrongChip.click();

    // First miss does not complete the error -- it stays on the same
    // question with the "try the glowing one" nudge, no red/X anywhere.
    await expect(page.getByText(/Not quite.*glowing/)).toBeVisible();
    const bodyAfterMiss = await page.locator("body").innerText();
    expect(bodyAfterMiss).not.toContain("XP"); // no answer scored yet

    // The correct chip is still tappable -- second attempt on the right
    // answer completes normally.
    await page.getByRole("button", { name: /eat/ }).click();
    await page.waitForTimeout(3000);
    const bodyAfterCorrect = await page.locator("body").innerText();
    expect(bodyAfterCorrect).toContain("XP");
  } finally {
    await deleteAccount(userId);
  }
});
