import { test, expect } from "@playwright/test";

// Round-2 verification requested after a report of emoji still visible on
// the deployed preview: check-no-emoji.mjs only proves no literal emoji
// character in *source* — it can't catch anything runtime/data-driven, and
// it can't prove what actually lands in the rendered DOM. This test drives
// the real running app (signed in, real quiz flow, real Supabase) and
// asserts directly against the rendered page: no emoji-range characters in
// the DOM text, and no 404s on any image request. Screenshot-level proof,
// not just a source grep.
//
// Same account-provisioning pattern as smoke.spec.js — see that file for
// why (admin API vs. real signUp, cleanup, etc).

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Same ranges as scripts/check-no-emoji.mjs — kept in sync deliberately;
// if that pattern changes, this one should too.
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}]/gu;

let confirmedUser = null;
const failed404s = [];
const emojiFindings = [];

test.beforeAll(async () => {
  if (!SERVICE_KEY) return;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `nextgenprecisiondrones+mwnoemoji${Date.now()}@gmail.com`,
      password: "TestPass!23456",
      email_confirm: true,
    }),
  });
  confirmedUser = await res.json();
});

test.afterAll(async () => {
  if (!SERVICE_KEY || !confirmedUser?.id) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${confirmedUser.id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
});

// Asserts the currently-rendered page has zero emoji-range characters
// anywhere in its text content, and records (with a screenshot) any
// failures found rather than failing on the first one, so a single run
// surfaces every violation instead of stopping at the first screen.
async function assertNoEmojiInDom(page, screenLabel) {
  const text = await page.evaluate(() => document.body.innerText);
  const matches = [...text.matchAll(EMOJI_PATTERN)];
  if (matches.length > 0) {
    const path = `/tmp/no-emoji-live-FAIL-${screenLabel.replace(/\s+/g, "-")}.png`;
    await page.screenshot({ path, fullPage: true });
    emojiFindings.push({ screen: screenLabel, chars: matches.map((m) => m[0]), screenshot: path });
  }
}

test("live quiz flow: no emoji in DOM, no image 404s, across the full session", async ({ page }) => {
  test.skip(!confirmedUser?.id, "requires SUPABASE_SERVICE_ROLE_KEY to provision a confirmed test account");

  page.on("response", (res) => {
    const req = res.request();
    if (res.status() === 404 && ["image", "media"].includes(req.resourceType())) {
      failed404s.push(`${res.status()} ${req.url()}`);
    }
  });

  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(confirmedUser.email);
  await page.getByPlaceholder("••••••••").fill("TestPass!23456");
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText("Let's meet your Star Learner!")).toBeVisible({ timeout: 20000 });
  await assertNoEmojiInDom(page, "onboarding");
  await page.getByPlaceholder("e.g. Emma").fill("Emma");
  await page.getByRole("button", { name: "Rocket Kid" }).click();
  await page.getByText("Dinosaurs").click();
  await page.getByRole("button", { name: /Let's go/ }).click();

  await expect(page.getByText("Hey Emma!")).toBeVisible({ timeout: 20000 });
  await assertNoEmojiInDom(page, "home");

  await page.getByRole("button", { name: /^Play/ }).click();
  await expect(page.getByText("Today's Quest")).toBeVisible();
  await assertNoEmojiInDom(page, "activity-picker");

  await page.getByText("Tap & Hear").click();
  await expect(page.locator("text=/^Tap the picture of/")).toBeVisible({ timeout: 15000 });

  // Play through every round: always tap the first answer tile. Errorless
  // scaffold means a wrong tap doesn't advance — retry until a round
  // actually completes and the "Tap the picture of X" text changes (or
  // Session Complete appears).
  for (let round = 0; round < 8; round++) {
    const stillPlaying = await page.locator("text=/^Tap the picture of/").isVisible().catch(() => false);
    if (!stillPlaying) break;
    await assertNoEmojiInDom(page, `quiz-round-${round}`);
    // Answer tiles are plain divs with onClick, not <button> — click the
    // tile whose word text matches the target (always the correct tile).
    const target = (await page.locator("text=/^Tap the picture of/").textContent()).replace("Tap the picture of ", "").trim();
    const targetTile = page.getByText(target, { exact: true }).last();
    await targetTile.click();
    await page.waitForTimeout(1600); // correct-answer advance delay
  }

  await expect(page.getByText("Session Complete!")).toBeVisible({ timeout: 10000 });
  await assertNoEmojiInDom(page, "session-complete");

  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: /Galaxy/ }).click();
  await expect(page.getByText("Your Galaxy")).toBeVisible();
  await assertNoEmojiInDom(page, "galaxy");

  await page.getByRole("button", { name: /^Home/ }).click();
  await assertNoEmojiInDom(page, "home-bottom-nav-final");

  // Report everything found in one place rather than failing on the first
  // screen, so a single run tells the whole story.
  expect(emojiFindings, `Emoji found in rendered DOM:\n${JSON.stringify(emojiFindings, null, 2)}`).toEqual([]);
  expect(failed404s, `Image 404s during session:\n${failed404s.join("\n")}`).toEqual([]);
});
