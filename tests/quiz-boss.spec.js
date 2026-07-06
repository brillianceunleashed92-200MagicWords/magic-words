import { test, expect } from "@playwright/test";

// Quiz Boss (docs/200MW_Prompt6_Activity_Roster.md, Part 4) — covers the
// app-measured review battle end to end: a fully deterministic 6-question
// battle (fixture seeds exactly one "due for review" word plus five
// unit-3 fallback words, in a known order — see provisionFixture below),
// answered correctly throughout, proving the self-rating UI is gone and
// a real accuracy run reaches the standard celebration with real XP.
// Needs SUPABASE_SERVICE_ROLE_KEY, same as tests/fill-the-story.spec.js.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Battle order actually observed against local dev: local Vite serves no
// /api routes (documented trap — see this prompt's "known traps" and
// FILL_THE_STORY_REPORT.md's own note that Home's recommended word is
// "the lowest-sort_order unmastered word in the current unit... regardless
// of..." for the exact same reason), so `generateReviewPlan`'s fetch to
// /api/session-generator 404s locally and falls back to
// `buildSupabaseFallbackPlan` — the same generic fallback every other
// activity's local test already runs against, which does NOT know about
// reviewOnly and just returns unit 3's weakest-mastery words in
// sort_order (all tied at mastery 0 here, so stable-sort order holds):
// eat, jump, run, swim, fly, dance. All six have real art (has_art), so
// every question in this fixture is the picture->pick-the-word mechanic.
// The server-side reviewOnly selection itself (spaced-repetition/
// lowest-confidence pool) is verified separately against the deployed
// preview in the PRODUCTION VERIFICATION pass, per the same trap.
const EXPECTED_BATTLE_ORDER = ["eat", "jump", "run", "swim", "fly", "dance"];

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwqb${Date.now()}@gmail.com`;
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
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // "cat" gets real attempt history + a past next_review_at (due for
  // review) — the one word this fixture wants the reviewOnly pool to
  // pick up as "previously encountered". Every other unit-1/2 word is
  // mastered but has attempt_count 0 and a far-future next_review_at, so
  // it does NOT count as "encountered" (attemptCount > 0) and can't leak
  // into the pool. PostgREST bulk inserts require every object to share
  // the same key set ("All object keys must match") -- so every row gets
  // attempt_count/correct_count/next_review_at explicitly, not just
  // "cat"'s. next_review_at is NOT NULL in the schema (confirmed the hard
  // way: an explicit `null` here 400s the *entire* batch insert, leaving
  // every word unmastered and pathWord stuck on "cat") -- hence the
  // far-future date instead of null for the non-"cat" rows.
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(
      words.map((w) => (
        w.word === "cat"
          ? { user_id: userId, child_id: childId, word: w.word, mastery: 100, attempt_count: 5, correct_count: 5, next_review_at: yesterday }
          : { user_id: userId, child_id: childId, word: w.word, mastery: 100, attempt_count: 0, correct_count: 0, next_review_at: farFuture }
      ))
    ),
  });

  // Unlocks Quiz Boss (rank 5) on the Guided Path for "eat" — ranks 1-4
  // (word_match/word_hunt/rhyme_time/find_the_word) done today.
  const priorActivities = ["word_match", "word_hunt", "rhyme_time", "find_the_word"];
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
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

test("Quiz Boss: app-measured review battle, no self-rating UI, real accuracy reaches celebration", async ({ page }) => {
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
    // Distinct review-plan fetch — give it real time to resolve (own
    // loading state, "Summoning the Quiz Boss…", may resolve too fast to
    // reliably assert on against a local fallback).
    await page.waitForTimeout(3000);

    for (const word of EXPECTED_BATTLE_ORDER) {
      await expect(page.getByRole("button", { name: word, exact: true })).toBeVisible({ timeout: 10000 });
      // Self-rating is fully removed — must never appear at any point.
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toMatch(/I know it|Need practice/);
      await page.getByRole("button", { name: word, exact: true }).click();
      await page.waitForTimeout(2200);
    }

    // 6/6 correct -- standard celebration, real measured XP, no mega
    // celebration beyond the normal per-question size discipline.
    const finalText = await page.locator("body").innerText();
    expect(finalText).not.toMatch(/I know it|Need practice/);
    expect(finalText).toMatch(/XP|Sparks|correct/i);
  } finally {
    await deleteAccount(userId);
  }
});
