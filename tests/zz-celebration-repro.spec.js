import { test, expect } from "@playwright/test";

// TEMPORARY reproduction spec for FIX_CELEBRATION_R1 -- Phase 2. Not part of
// the permanent suite (zz- prefix, deleted before merge; see
// docs/CELEBRATION_FIX_REPORT.md Phase 4 for the permanent replacement).
//
// Forces the exact race identified in Phase 1 forensics: GameEngine's
// handleAnswer calls onProgress (PlayScreen.handleProgress) WITHOUT
// awaiting it, then -- on the session's last question -- calls
// onSessionEnd almost immediately after. handleProgress's own mastery-
// crossing check + queueCelebration only run after `await
// saveWordProgress.mutateAsync(...)` resolves (a real network round
// trip). Delaying that specific response reproduces "crossing detected
// after the screen has already moved on."
//
// Fixture: unit 1 has 8 words, sort_order 1-8 (cat,dog,bird,fish,bear,
// ball,book,cup). Pre-mastering cat/dog/bird/fish/bear/book/cup to raw
// mastery=100 and seeding "ball" at attempt_count=2/correct_count=2
// (also raw mastery=100, tied) makes the client-side fallback plan's
// ascending-mastery-stable-sort select exactly the first 6 by
// sort_order -- cat,dog,bird,fish,bear,ball -- with "ball" LAST. The
// 3rd correct answer on "ball" (this session) both completes the
// 6-question session AND crosses isRealMastery (attempts 3, mastery
// 100) in the same instant, matching Sal's forensic timeline.
const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwcelebrepro${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;
  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "ReproKid", age: 6, avatar: "rocket", interests: [] }),
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

test("REPRO: mastery-crossing celebration decouples from its own answer when word_progress write is slow", async ({ page }) => {
  test.setTimeout(60000);
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  const fixture = await provisionFixture();
  try {
    // Delay every word_progress REST call by 3s -- long enough that
    // GameEngine's post-chime onSessionEnd call (fires within ~1s of the
    // last answer) will have already run and transitioned PlayScreen to
    // SessionComplete/Home well before handleProgress's mutateAsync
    // (and therefore the crossing check + queueCelebration) resolves.
    await page.route("**/rest/v1/word_progress*", async (route) => {
      if (route.request().method() !== "GET") await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });

    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(fixture.email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1500);

    await page.getByText("Tap & Hear", { exact: true }).click();
    await page.waitForTimeout(2000);

    const order = ["cat", "dog", "bird", "fish", "bear", "ball"];
    for (let i = 0; i < order.length; i++) {
      const word = order[i];
      await expect(page.locator(`text=/Tap the picture of\\s+${word}/i`)).toBeVisible({ timeout: 10000 });
      const isLast = i === order.length - 1;
      if (isLast) {
        // The moment of the crossing answer -- capture what's on screen
        // in the seconds immediately after, before the delayed write
        // resolves.
        await page.getByRole("button", { name: new RegExp(`^${word}\\b`, "i") }).click();
        await page.waitForTimeout(1200);
        const rightAfterAnswer = await page.locator("body").innerText();
        console.log("--- STATE ~1.2s after crossing answer (before delayed write resolves) ---");
        console.log(rightAfterAnswer.replace(/\s+/g, " ").slice(0, 400));
        const hasIgnitionAlready = /star ignited/i.test(rightAfterAnswer);
        console.log(`Ignition visible immediately (anchored to the answer)?  ${hasIgnitionAlready}`);

        // Now wait past the delayed write's resolution and see where the
        // ignition actually lands.
        await page.waitForTimeout(3500);
        const afterDelayedWrite = await page.locator("body").innerText();
        console.log("--- STATE ~4.7s after crossing answer (delayed write has now resolved) ---");
        console.log(afterDelayedWrite.replace(/\s+/g, " ").slice(0, 400));
        const ignitionLandedLate = /star ignited/i.test(afterDelayedWrite) && !hasIgnitionAlready;
        console.log(`Ignition landed AFTER the answer's own screen had already moved on? ${ignitionLandedLate}`);
        expect(ignitionLandedLate || hasIgnitionAlready).toBe(true); // sanity: it fires at all
      } else {
        await page.getByRole("button", { name: new RegExp(`^${word}\\b`, "i") }).click();
        await page.waitForTimeout(4500); // slow write on every question with this route delay
      }
    }
  } finally {
    await deleteAccount(fixture.userId);
  }
});
