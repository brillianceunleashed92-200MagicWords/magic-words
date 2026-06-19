import { test, expect } from "@playwright/test";

// Re-run after every redesign phase instead of writing one-off scripts.
// Needs VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local to exercise
// real auth, and SUPABASE_SERVICE_ROLE_KEY in the environment (not committed)
// to provision/clean up the confirmed test account used for sign-in.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let confirmedUser = null;

test.beforeAll(async () => {
  if (!SERVICE_KEY) return;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `nextgenprecisiondrones+mwsmoke${Date.now()}@gmail.com`,
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

test("landing page loads with the dawn token system", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "200 Magic Words" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start with your child" })).toBeVisible();
});

test("sign up shows the post-signup confirmation screen", async ({ page }) => {
  const email = `nextgenprecisiondrones+mwsmokesignup${Date.now()}@gmail.com`;

  await page.goto("/app");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("TestPass!23456");
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(email)).toBeVisible();
});

test("sign in loads the Parent dashboard", async ({ page }) => {
  test.skip(!confirmedUser?.id, "requires SUPABASE_SERVICE_ROLE_KEY to provision a confirmed test account");

  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(confirmedUser.email);
  await page.getByPlaceholder("••••••••").fill("TestPass!23456");
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText("WELCOME BACK!")).toBeVisible({ timeout: 20000 });

  await page.getByText("Parent", { exact: true }).click();
  await expect(page.getByText("PARENT DASHBOARD")).toBeVisible();
  await expect(page.getByText("CHILD SHARE CODE")).toBeVisible();
});
