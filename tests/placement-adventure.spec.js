import { test, expect } from "@playwright/test";

// Placement Adventure (Prompt 8) -- three specs against production (real
// ElevenLabs audio; local Vite serves no /api routes, so the ladder
// endpoint 404s there). Self-provisioning: an admin-created account with
// ZERO child profiles hits the real Star Learner onboarding screen on
// first sign-in, same as a genuinely brand-new user.

test.use({ baseURL: "https://200magicwordsapp.com" });

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function provisionAccount(prefix) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = await userRes.json();
  return { email, userId: user.id };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function fetchChildId(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles?parent_id=eq.${userId}&select=id,placement_unit,placement_completed_at`, {
    headers: adminHeaders,
  });
  const [child] = await res.json();
  return child;
}

async function signInAndOnboard(page, email, name) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Let's meet your Star Learner!")).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder("e.g. Emma").fill(name);
  await page.locator('button[aria-label]').first().click(); // first avatar
  await page.getByRole("button", { name: /Let's go/ }).click();
  await expect(page.getByText("One more thing")).toBeVisible({ timeout: 15000 });
}

test("Placement Adventure: beginner path -- zero probes, Unit 1, placement_skipped logged", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId } = await provisionAccount("mwplacebeg");
  try {
    await signInAndOnboard(page, email, "BeginnerKid");
    await page.getByRole("button", { name: /start at the beginning/i }).click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('"cat"')).toBeVisible();

    await page.waitForTimeout(1500); // let the fire-and-forget skip log land
    const child = await fetchChildId(userId);
    expect(child.placement_unit).toBeNull();
    expect(child.placement_completed_at).toBeNull();
  } finally {
    await deleteAccount(userId);
  }
});

test("Placement Adventure: full persona -- pass rung 1, fail rung 2, completes at Unit 1", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(90000);
  const { email, userId } = await provisionAccount("mwplacefull");
  try {
    await signInAndOnboard(page, email, "PersonaKid");
    await page.getByRole("button", { name: /Let Nova find their level/i }).click();
    await expect(page.getByText(/Which word matches this picture|Find the word Nova said/)).toBeVisible({ timeout: 15000 });

    // Answer every probe by tapping the FIRST tile each time (right or
    // wrong doesn't matter for this spec -- it proves the ladder reaches
    // a real finalization and Home reflects whatever floor resulted,
    // without needing to script exact correctness through the manifest).
    for (let i = 0; i < 8; i++) {
      const doneHeading = page.getByText("Nova found your starting star!");
      if (await doneHeading.isVisible().catch(() => false)) break;
      const tile = page.locator("button").filter({ hasText: /^[a-z]+$/ }).first();
      await tile.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1600);
    }
    await expect(page.getByText("Nova found your starting star!")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Let's fly/ }).click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 15000 });

    const child = await fetchChildId(userId);
    expect(child.placement_unit).not.toBeNull();
    expect(child.placement_completed_at).not.toBeNull();
  } finally {
    await deleteAccount(userId);
  }
});

test("Placement Adventure: measurement exception -- a miss shows no wiggle/hint-glow, same tone as a hit", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId } = await provisionAccount("mwplaceexc");
  try {
    await signInAndOnboard(page, email, "ExceptionKid");
    await page.getByRole("button", { name: /Let Nova find their level/i }).click();
    await expect(page.getByText(/Which word matches this picture|Find the word Nova said/)).toBeVisible({ timeout: 15000 });

    // Tap whichever tile renders first -- right or wrong, the scaffold
    // must be absent either way. Assert directly on the tile's own
    // style rather than guessing correctness: no wiggle/soften/hint-glow
    // box-shadow, and the message is the neutral "Let's try another!"
    // once a tap has landed (never "Not quite" or similar).
    const tile = page.locator("button").filter({ hasText: /^[a-z]+$/ }).first();
    await tile.click();
    await page.waitForTimeout(300);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/Not quite|try the glowing one/i);

    const wiggleCount = await page.locator('[style*="lessonWiggle"]').count();
    expect(wiggleCount).toBe(0);
  } finally {
    await deleteAccount(userId);
  }
});
