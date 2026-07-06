import { test, expect } from "@playwright/test";

// Galaxy lock fix (docs/200MW_Prompt7_Polish_Pass.md, Part 1) — a word
// with real, attempted-but-sub-mastery progress that isn't this
// moment's single adaptive `currentWord` used to render as a flat,
// non-tappable `locked` node on the Galaxy map, identical to a word
// never touched at all (reproduced directly against "dance" before this
// fix). This spec seeds exactly that shape and asserts the node now
// shows its real percent and is tappable.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwgalaxy${Date.now()}@gmail.com`;
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

  // "cat" (sort_order 1) stays untouched -- it remains `currentWord`.
  // "dance" (unit 3) gets real, sub-mastery, attempted progress -- the
  // exact shape that used to render as a flat lock icon.
  const wpRes = await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify([
      { user_id: userId, child_id: childId, word: "dance", mastery: 45, attempt_count: 4, correct_count: 2 },
    ]),
  });

  return { email, userId, wpStatus: wpRes.status };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

test("Galaxy map: touched-but-unmastered word shows real progress, not a flat lock", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId } = await provisionFixture();
  try {
    // Reduced motion so GalaxyPath renders every node immediately
    // instead of gating reveal on scroll-driven animation progress.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Galaxy" }).click();
    await page.waitForTimeout(1500);

    const danceNode = page.getByRole("button", { name: /dance/ });
    await danceNode.scrollIntoViewIfNeeded();
    await expect(danceNode).toContainText("45%");
    await expect(danceNode).toBeVisible();

    // Tappable -- not the non-interactive `locked`/`premium` treatment.
    await danceNode.click();
    await page.waitForTimeout(1500);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/dance/i);
  } finally {
    await deleteAccount(userId);
  }
});
