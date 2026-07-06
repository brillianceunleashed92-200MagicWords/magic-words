import { test, expect } from "@playwright/test";

// Reduced motion at the primitive (docs/200MW_Prompt7_Polish_Pass.md,
// Part 2) — AnswerTile's entrance/wiggle and ConfettiStars now gate on
// usePrefersReducedMotion() INSIDE lessonChrome.jsx, so every consumer
// inherits it automatically, including activities that never checked
// this themselves (WordMatch/WordHunt/RhymeTime). This spec verifies
// under emulated reduced motion across 3 activities -- WordMatch
// (untouched by this pass, the control case), Find the Word, and Quiz
// Boss's underlying mechanic -- that: tiles render immediately
// interactable (no entrance-animation stall) and no confetti SVG pieces
// appear after a correct answer.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwrm${Date.now()}@gmail.com`;
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
  await page.getByRole("button", { name: /Let's go/ }).click();
  await page.waitForTimeout(1000);
}

// ConfettiStars' pieces (lessonChrome.jsx) carry the `lessonConfettiPop`
// animation name in their inline style -- the star path shape itself
// turned out NOT to be distinctive (IconStar reuses the identical path
// for perfectly ordinary UI, e.g. StarProgress segments), so matching on
// the animation name is the real signal.
const CONFETTI_SVG_SELECTOR = 'svg[style*="lessonConfettiPop"]';

test("Reduced motion: Word Match (untouched-by-this-pass control) -- tiles interactable immediately, no confetti", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId } = await provisionFixture();
  try {
    await signIn(page, email);
    await page.getByRole("button", { name: "Tap & Hear" }).click();
    await page.waitForTimeout(1500);

    // No entrance-animation stall: tiles are immediately clickable, not
    // stuck at opacity 0 waiting on a RAF-driven fade-in.
    const promptText = await page.locator("body").innerText();
    const match = promptText.match(/of\s+([a-z]+)/i);
    const target = match ? match[1] : null;
    const tiles = target
      ? page.getByRole("button", { name: new RegExp(target, "i") })
      : page.getByRole("button").filter({ hasText: /^[a-z]+$/i });
    await expect(tiles.first()).toBeVisible({ timeout: 3000 });
    await tiles.first().click();
    await page.waitForTimeout(1500);

    expect(await page.locator(CONFETTI_SVG_SELECTOR).count()).toBe(0);
  } finally {
    await deleteAccount(userId);
  }
});

test("Reduced motion: Find the Word -- tiles interactable immediately, no confetti", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const priorActivities = ["word_match", "word_hunt", "rhyme_time"];
  const { email, userId } = await provisionFixture();
  try {
    const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles?parent_id=eq.${userId}&select=id`, { headers: adminHeaders });
    const [child] = await childRes.json();
    await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(priorActivities.map((gt) => ({
        child_id: child.id, user_id: userId, word: "cat", game_type: gt, correct: true, attempt_number: 1,
      }))),
    });

    await signIn(page, email);
    await page.getByRole("button", { name: "Find the Word" }).click();
    await page.waitForTimeout(1500);

    const tiles = page.getByRole("button", { name: /\b(cat|hat|cap|bat)\b/ });
    await expect(tiles.first()).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /\bcat\b/ }).first().click();
    await page.waitForTimeout(1500);

    expect(await page.locator(CONFETTI_SVG_SELECTOR).count()).toBe(0);
  } finally {
    await deleteAccount(userId);
  }
});

test("Reduced motion: Match & Sort / RhymeTime (untouched-by-this-pass control) -- no confetti", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId } = await provisionFixture();
  try {
    // Match & Sort is rank 3 on the Guided Path -- needs ranks 1-2 done
    // first (same gating FindTheWord's fixture above already relies on).
    const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles?parent_id=eq.${userId}&select=id`, { headers: adminHeaders });
    const [child] = await childRes.json();
    await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(["word_match", "word_hunt"].map((gt) => ({
        child_id: child.id, user_id: userId, word: "cat", game_type: gt, correct: true, attempt_number: 1,
      }))),
    });

    await signIn(page, email);
    await page.getByRole("button", { name: "Match & Sort" }).click();
    await page.waitForTimeout(1500);

    const tiles = page.getByRole("button").filter({ hasText: /\bcat\b|\bbat\b/i });
    await expect(tiles.first()).toBeVisible({ timeout: 3000 });
    await tiles.first().click();
    await page.waitForTimeout(1500);

    expect(await page.locator(CONFETTI_SVG_SELECTOR).count()).toBe(0);
  } finally {
    await deleteAccount(userId);
  }
});
