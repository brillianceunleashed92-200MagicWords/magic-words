import { test, expect } from "@playwright/test";

// FEAT_BLANK_ENGINE_R1 Phase 4 — story comprehension errorless scaffold.
// StoryReader.jsx's comprehension question (already existed in the
// story_catalog data model, see docs/BLANK_ENGINE_REPORT.md STEP 0) now
// renders via the same AnswerTile+WordArt picture-tile primitives every
// other activity's scaffold uses, with the same wiggle-soften ->
// hint-glow -> second-miss-completes errorless flow as WordMatch. This
// spec drives the real catalog "cat" story (tier 3, has a real
// comprehension_question with 3 choices) end to end: renders as picture
// tiles (not plain text buttons), a first wrong tap doesn't complete the
// question, a correct retry does, and the result lands in learning_events
// like any other activity.
//
// Needs SUPABASE_SERVICE_ROLE_KEY, same provisioning pattern as
// story-time-chrome.spec.js / fill-the-story.spec.js.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Seeds ranks 1-5 of the guided path so Story Time (rank 6) is next up
// (story-time-chrome.spec.js's technique), PLUS a user_stats row with
// enough XP to land on level 12+ (tier 3 — src/lib/localStory.js's
// getStoryTier) so the "cat" catalog entry (tier 3 only) actually matches
// instead of falling through to the simpler local-fallback tier.
//
// Deliberately does NOT seed word_progress: useCandyGalaxyData's
// `currentWord` is `words.find(w => !isRealMastery(...))` over the full
// curriculum sorted by sort_order — with zero progress rows, that's
// "cat" (sort_order 1, unit 1), and useTodayWordActivityQuery's guided-
// path unlock gate is `.eq('word', word)` against THAT exact current
// word, so the learning_events rows below must be stamped for "cat" too,
// not an arbitrary target word — confirmed by reading both call sites
// directly after an earlier version of this fixture (which mastered
// units 1-2 like story-time-chrome.spec.js's exit-only test does, and
// used a mismatched word) left Story Time locked/unclickable.
async function provisionFixture() {
  const targetWord = "cat";
  const email = `nextgenprecisiondrones+mwblankcompr${Date.now()}@gmail.com`;
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
    body: JSON.stringify({ parent_id: userId, name: "ComprKid", age: 6, avatar: "rocket", interests: ["animals"] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  const priorActivities = ["word_match", "word_hunt", "rhyme_time", "find_the_word", "flash_cards"];
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(priorActivities.map((gt) => ({
      child_id: childId, user_id: userId, word: targetWord, game_type: gt, correct: true, attempt_number: 1,
    }))),
  });

  await fetch(`${SUPABASE_URL}/rest/v1/user_stats`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ user_id: userId, child_id: childId, total_xp: 2000, current_level: 12, avatar: "rocket" }),
  });

  return { email, userId, childId };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function fetchLearningEvents(childId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/learning_events?child_id=eq.${childId}&game_type=eq.story_time&select=word,correct,recorded_at`,
    { headers: adminHeaders },
  );
  return res.json();
}

test("Story Time comprehension: picture-tile scaffold, wrong-then-correct-retry completes and logs", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(120000);

  const { email, userId, childId } = await provisionFixture();
  try {
    await new Promise((r) => setTimeout(r, 1500));
    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Story Time" }).click();
    await page.waitForTimeout(2500);

    await page.getByRole("button", { name: /Start reading/ }).click();
    await page.waitForTimeout(1500);

    // Walk through every sentence page until the comprehension question
    // appears (the "cat" catalog story is 8 sentences; not hardcoding the
    // count so this survives catalog content edits). Detects arrival via
    // the "a shoe" choice tile, not the question's own heading text —
    // renderSentence() splits the heading into one <span> per word (for
    // tap-to-speak), so the words have no real space characters between
    // them in the DOM and getByText can't match the full spaced sentence;
    // the AnswerTile choice label is a single plain-string text node, so
    // it matches reliably.
    const wrongChoice = page.getByRole("button", { name: /a shoe/ });
    for (let i = 0; i < 12 && !(await wrongChoice.isVisible().catch(() => false)); i++) {
      const nextBtn = page.getByRole("button", { name: /Next →/ });
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1200);
      }
    }
    await expect(wrongChoice).toBeVisible({ timeout: 10000 });

    // Picture tiles, not the old plain-text buttons: WordArt renders a
    // real <svg role="img"> for each choice (illustrated art for "ball"/
    // "book", the typographic candy-tile fallback for "shoe" — either
    // way, a picture, never emoji).
    await expect(page.locator('svg[role="img"][aria-label="ball"]')).toBeVisible();
    await expect(page.locator('svg[role="img"][aria-label="book"]')).toBeVisible();

    await page.waitForTimeout(1000); // let narration settle so taps aren't swallowed by the "let's read first" nudge

    // First tap the WRONG choice ("a shoe" — cat played with a ball, not
    // a shoe). Errorless: this must NOT complete the question yet.
    await page.getByRole("button", { name: /a shoe/ }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText("Great reading!")).not.toBeVisible();
    // Choices are still on screen — the scaffold let the child retry
    // instead of ending the question on the first miss.
    await expect(page.getByRole("button", { name: /a ball/ })).toBeVisible();

    await page.waitForTimeout(700); // past the 450ms wiggle -> hint-glow transition

    // Retry with the correct choice — completes as correct.
    await page.getByRole("button", { name: /a ball/ }).click();
    await expect(page.getByText("Great reading!")).toBeVisible({ timeout: 5000 });

    // Logs like any other activity: a story_time learning_events row for
    // "cat", correct=true (the scaffold's final/second-attempt outcome —
    // same firstTry:true contract every other activity's onAnswer uses).
    let events = [];
    for (let i = 0; i < 10; i++) {
      events = await fetchLearningEvents(childId);
      if (events.length > 0) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].word).toBe("cat");
    expect(events[0].correct).toBe(true);
  } finally {
    await deleteAccount(userId);
  }
});
