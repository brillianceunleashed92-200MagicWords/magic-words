import { test, expect } from "@playwright/test";

// Quest progression regression (docs/QUEST_FIX_REPORT.md,
// FIX_QUEST_PROGRESSION run) — Sal reported that after completing Tap &
// Hear, the guided path didn't advance to Word Hunt and the "done today"
// counter stayed at 0. Extensive reproduction attempts (natural
// currentWord progression, a full PlayScreen remount, and the
// review-an-already-mastered-word path via the Galaxy map) all showed
// correct behavior — this spec pins that correct behavior down so a
// future regression in the invalidateQueries/refetchOnMount mechanism
// (src/lib/queries/questProgress.js, src/screens/PlayScreen.jsx's
// handleSessionEnd) fails a test instead of silently shipping.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Unit 1 fully mastered so "frog" (unit 2, sort_order 9) is the current
// word, seeded with pre-existing partial progress (33%, below the 80%
// mastery threshold) so ONE more correct answer this session (-> 50%)
// keeps "frog" as currentWord instead of rolling over to a new word --
// the exact confound found and worked around during this run's manual
// reproduction.
async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwquestprog${Date.now()}@gmail.com`;
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

  const unit1Res = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=eq.1&select=word`, { headers: adminHeaders });
  const unit1Words = await unit1Res.json();
  const unit2Res = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=eq.2&select=word`, { headers: adminHeaders });
  const unit2Words = (await unit2Res.json()).map((w) => w.word);

  // The local dev session-plan falls back to buildSupabaseFallbackPlan
  // (src/hooks/useSessionPlan.js) when /api/session-generator isn't
  // reachable (no serverless functions under `vite`/Playwright's dev
  // server) -- that fallback sorts the current unit's words ASCENDING by
  // mastery and caps the batch at 6. Leaving frog's 7 unit-2 siblings at
  // the default 0 mastery would rank frog (given any non-zero mastery)
  // LAST and drop it from the capped batch entirely -- confirmed by
  // reproducing exactly that during this test's own development (frog
  // silently excluded from the session, so completing it never touched
  // frog's guided path at all). Mastering frog's siblings first makes
  // frog rank lowest (guaranteed included) without changing which unit
  // is "current" (computeFallbackCurrentUnit only requires frog itself,
  // not its siblings, to be under the 80 mastery threshold).
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify([
      ...unit1Words.map((w) => ({ user_id: userId, child_id: childId, word: w.word, mastery: 100, attempt_count: 1, correct_count: 1 })),
      ...unit2Words.filter((w) => w !== "frog").map((w) => ({ user_id: userId, child_id: childId, word: w, mastery: 100, attempt_count: 1, correct_count: 1 })),
      { user_id: userId, child_id: childId, word: "frog", mastery: 33, attempt_count: 3, correct_count: 1 },
    ]),
  });

  return { email, userId };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function signIn(page, email) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
}

// Tap & Hear quizzes the whole unit's word batch, one picture-match
// question at a time, in whatever order the session plan picked -- loop
// until "Session Complete!" rather than assuming a fixed question count.
// Tiles are `disabled={answered}` (GameEngine.jsx) and the question fully
// remounts (`key={currentIdx}`) between questions, so re-read the prompt
// fresh on every iteration (not once, cached) and wait for the specific
// tile to actually be enabled before clicking -- avoids a race where a
// just-answered, still-disabled tile from the outgoing question matches
// the same accessible-name query as the incoming one.
async function playTapAndHearToCompletion(page) {
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByText("Tap & Hear").click();

  for (let i = 0; i < 12; i++) {
    if (await page.getByText("Session Complete!").isVisible().catch(() => false)) return;
    const promptLocator = page.locator("text=/Tap the picture of/");
    await expect(promptLocator).toBeVisible({ timeout: 10000 });
    const prompt = await promptLocator.textContent();
    const targetWord = prompt.replace("Tap the picture of", "").trim();
    // Accessible name combines the tile's image alt + label (e.g. "horse
    // horse"), so an exact match against the bare word never matches --
    // anchor to the start instead.
    const tile = page.getByRole("button", { name: new RegExp(`^${targetWord}\\b`, "i") });
    await expect(tile).toBeEnabled({ timeout: 8000 });
    await tile.click();
    // Wait for THIS question to actually resolve (prompt text changes or
    // the session ends) rather than a blind fixed sleep guessing at
    // GameEngine's chime/confetti/remount timing.
    await Promise.race([
      expect(promptLocator).not.toHaveText(prompt, { timeout: 8000 }),
      expect(page.getByText("Session Complete!")).toBeVisible({ timeout: 8000 }),
    ]).catch(() => {});
  }
  await expect(page.getByText("Session Complete!")).toBeVisible({ timeout: 10000 });
}

test("Quest progression: completing Tap & Hear unlocks Word Hunt and increments the counter, in-app and after reload", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(90000);

  const { email, userId } = await provisionFixture();
  try {
    await signIn(page, email);
    await expect(page.getByText(/"frog"/)).toBeVisible();

    await playTapAndHearToCompletion(page);

    // In-app return, no reload -- the exact repro shape from the bug report.
    await page.getByRole("button", { name: "Keep going" }).click();
    await expect(page.getByText("1 of 10 done today")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Word Hunt")).toBeVisible();
    await expect(page.getByText("YOU'RE HERE!")).toBeVisible();

    // Also correct after a hard reload (Phase 1's step 4 comparison).
    await page.reload();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByText("1 of 10 done today")).toBeVisible({ timeout: 10000 });
  } finally {
    await deleteAccount(userId);
  }
});
