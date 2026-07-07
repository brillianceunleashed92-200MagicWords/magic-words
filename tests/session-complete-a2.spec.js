import { test, expect } from "@playwright/test";

// Prompt 10 — Session Complete "A2" redesign regression coverage. Confirmed
// during this pass that A2 (Nova glow, XP/Sparks, words-learned progress,
// growth-mindset copy, real child name, WordArt chips) was actually already
// shipped 2026-07-04 (commit cb3d473) — this spec is the missing automated
// coverage that redesign never got, not a rebuild. Reuses Quiz Boss's fully
// deterministic 6-question battle (tests/quiz-boss.spec.js) as the vehicle:
// answered correctly throughout, it reaches SessionComplete via a known,
// repeatable path with real, non-zero XP/Sparks.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const EXPECTED_BATTLE_ORDER = ["eat", "jump", "run", "swim", "fly", "dance"];

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwa2${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;

  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "A2TestKid", age: 6, avatar: "rocket", interests: ["dinosaurs"] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  const wordsRes = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=lte.2&select=word`, { headers: adminHeaders });
  const words = await wordsRes.json();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 3 — non-"cat" words need a real
  // attempt_count (3, meets isRealMastery's minimum) so units 1-2 still
  // register as genuinely done and unit 3 stays the fallback's current
  // unit (see tests/quiz-boss.spec.js's identical fixture for the same
  // reasoning — this test reuses that battle mechanic).
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify(
      words.map((w) => (
        w.word === "cat"
          ? { user_id: userId, child_id: childId, word: w.word, mastery: 100, attempt_count: 5, correct_count: 5, next_review_at: yesterday }
          : { user_id: userId, child_id: childId, word: w.word, mastery: 100, attempt_count: 3, correct_count: 3, next_review_at: farFuture }
      ))
    ),
  });

  const priorActivities = ["word_match", "word_hunt", "rhyme_time", "find_the_word"];
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify(priorActivities.map((gt) => ({
      child_id: childId, user_id: userId, word: "eat", game_type: gt, correct: true, attempt_number: 1,
    }))),
  });

  return { email, userId };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

test("Session Complete A2: real child name, non-zero XP/Sparks, word chips, one-tap continue", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(90000);

  const { email, userId } = await provisionFixture();
  try {
    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Quiz Boss" }).click();
    await page.waitForTimeout(3000);

    for (const word of EXPECTED_BATTLE_ORDER) {
      await expect(page.getByRole("button", { name: word, exact: true })).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: word, exact: true }).click();
      await page.waitForTimeout(2200);
    }

    // Give the async onSessionEnd pipeline (Promise.allSettled on pending
    // learning_events writes, then setSessionResult) time to settle onto
    // PlayScreen's own richer SessionComplete render before asserting —
    // GameEngine's own bare-bones sessionDone branch (no xpEarned/
    // sparksEarned/masteredCount props) can render transiently first.
    await expect(page.getByText(/XP earned/)).toBeVisible({ timeout: 10000 });

    const bodyText = await page.locator("body").innerText();
    // Real child name, not a fallback/placeholder.
    expect(bodyText).toMatch(/A2TestKid/);
    // 6/6 correct, first-try, well under 3s each -> well above +0.
    expect(bodyText).not.toMatch(/\+0 XP earned|\+0\s*$/m);
    expect(bodyText).toMatch(/XP earned/);
    expect(bodyText).toMatch(/Sparks earned/);
    // Growth-mindset effort copy, not trait praise.
    expect(bodyText).not.toMatch(/so smart|genius/i);
    // Word chips for the battle words actually played.
    for (const word of EXPECTED_BATTLE_ORDER) {
      expect(bodyText).toMatch(new RegExp(word, 'i'));
    }
    // No emoji anywhere on the completion screen.
    // eslint-disable-next-line no-misleading-character-class
    expect(bodyText).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);

    // One tap continues cleanly back to the guided path.
    await page.getByRole("button", { name: "Keep going" }).click();
    await page.waitForTimeout(1500);
    const afterText = await page.locator("body").innerText();
    expect(afterText).not.toMatch(/Session Complete/);
  } finally {
    await deleteAccount(userId);
  }
});
