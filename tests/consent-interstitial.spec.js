import { test, expect } from "@playwright/test";

// feat/auth-r1 Phase 6 — the mandatory COPPA interstitial (Phase 5).
// Admin-created accounts have no user_metadata.parental_consent by
// default (same shape a real Google-OAuth-created account would have,
// since OAuth skips the B6 checkbox entirely) — this is the exact
// scenario the interstitial exists to catch.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

async function createTestUser(prefix, userMetadata) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: userMetadata ?? {} }),
  });
  const body = await res.json();
  return { email, id: body.id };
}

async function deleteTestUser(id) {
  if (!id) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

async function signIn(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
}

test.describe("COPPA consent interstitial", () => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  let userId;

  test.afterEach(async () => {
    await deleteTestUser(userId);
    userId = undefined;
  });

  test("account WITHOUT parental_consent metadata is blocked until agreed, then proceeds", async ({ page }) => {
    const { email, id } = await createTestUser("interstitial");
    userId = id;

    await signIn(page, email);
    await expect(page.getByText("Before we begin")).toBeVisible({ timeout: 10000 });
    // Both links present, same as the B6 checkbox.
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    await expect(page.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    // Blocks child creation/Home — neither should be visible yet.
    await expect(page.getByText("Let's meet your Star Learner")).not.toBeVisible();

    await page.getByRole("button", { name: "I agree, continue" }).click();
    // Proceeds to the normal authenticated flow (fresh account -> onboarding).
    await expect(page.getByText("Let's meet your Star Learner")).toBeVisible({ timeout: 10000 });

    // Metadata was actually written, not just a client-side dismissal.
    const checkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const checkBody = await checkRes.json();
    expect(checkBody.user_metadata?.parental_consent).toBe(true);
    expect(typeof checkBody.user_metadata?.parental_consent_at).toBe("string");
  });

  test("account WITH parental_consent metadata already set sees no interstitial", async ({ page }) => {
    const { email, id } = await createTestUser("interstitialskip", {
      parental_consent: true,
      parental_consent_at: new Date().toISOString(),
    });
    userId = id;

    await signIn(page, email);
    await expect(page.getByText("Let's meet your Star Learner")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Before we begin")).not.toBeVisible();
  });
});
