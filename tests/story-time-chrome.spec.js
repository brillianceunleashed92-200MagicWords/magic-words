import { test, expect } from "@playwright/test";

// Prompt 9 — story_time chrome migration regression protection. Per
// docs/CELEBRATION_COMPLETION_FIX_REPORT.md's Bug 5, Story Time's own
// full-screen portal used to make EVERY exit control unreachable
// (`StoryReader`'s internal close button was the only fix, and became the
// ONLY working exit while the portal is open). This spec proves the exit
// path survives moving story_time onto the shared isE2Activity chrome and
// removing that internal button — it must pass unchanged both before and
// after the migration (the "Exit and save progress" aria-label is
// identical across SessionProgress / the isE2Activity top bar / the old
// StoryReader-internal button, by design).
//
// Needs SUPABASE_SERVICE_ROLE_KEY, same pattern as fill-the-story.spec.js.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Seeds ranks 1-5 of the guided path (word_match/word_hunt/rhyme_time/
// find_the_word/flash_cards) so Story Time (rank 6) is the next eligible
// activity — same technique as fill-the-story.spec.js's provisionFixture.
async function provisionFixture(targetWord) {
  const email = `nextgenprecisiondrones+mwstorytime${Date.now()}@gmail.com`;
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
    body: JSON.stringify({ parent_id: userId, name: "StoryKid", age: 6, avatar: "rocket", interests: ["dinosaurs"] }),
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

  const priorActivities = ["word_match", "word_hunt", "rhyme_time", "find_the_word", "flash_cards"];
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

test("Story Time: exit mid-story via the shared close returns home with zero phantom credit", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(120000);

  const { email, userId } = await provisionFixture("eat");
  try {
    await new Promise((r) => setTimeout(r, 1500)); // let the freshly-inserted rows settle before the first authenticated read
    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Story Time" }).click();
    await page.waitForTimeout(2500);

    // Enter actual story pages (past the cover) before exiting — the
    // real Bug 5 failure mode reproduced on the cover page too, but this
    // also exercises narration/page state being torn down mid-read.
    await page.getByRole("button", { name: /Start reading/ }).click();
    await page.waitForTimeout(1000);

    // `.last()` — whichever chrome renders the reachable exit control
    // (StoryReader's own portal button pre-migration, or the shared
    // isE2Activity top bar's button post-migration), it's always the
    // last "Exit and save progress" element in DOM order. Avoids a
    // Playwright strict-mode violation across the migration's
    // intermediate states without needing two separate spec versions.
    const closeButton = page.getByRole("button", { name: "Exit and save progress" }).last();
    await expect(closeButton).toBeVisible();
    const box = await closeButton.boundingBox();
    // A raw coordinate click, not locator.click() — CELEBRATION_COMPLETION_
    // FIX_REPORT.md's Bug 5 verification found Playwright's own
    // actionability heuristic flags this specific SVG-in-button as
    // "intercepted" even when document.elementFromPoint correctly
    // resolves to the button itself; this sidesteps that false negative.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Returns Home ("Hey StoryKid! Ready to fly?") — the exact regression
    // Bug 5 fixed (previously: no way to leave a story once opened, stuck
    // on the reader forever). handleExitEarly awaits any pending
    // learning_events writes + a streak-update round-trip before
    // navigating, so this can take a few seconds longer than a typical
    // click-driven assertion.
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

    // Exited before the comprehension question — zero phantom credit
    // banked, matching the "errorless learning ≠ free credit" invariant
    // (partialXP only accrues from an actual onAnswer call, which Story
    // Time only fires on full completion).
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\+\d+ XP/);
  } finally {
    await deleteAccount(userId);
  }
});
