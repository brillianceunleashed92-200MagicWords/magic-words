import { test, expect } from "@playwright/test";

// FIX_NO_BLANK_SCREENS_R1 -- QA-03. Proves the newly-mounted root
// ErrorBoundary actually catches a real render-time error and shows the
// friendly recovery UI instead of a blank page.
//
// No throw is added to app code. Instead this forces a REAL, naturally-
// occurring render error the same way a malformed API response would:
// src/lib/queries/childProfiles.js does `return data ?? [];`, and
// CandyGalaxyShell.jsx then does `childrenQ.data?.find(...)`. If the
// Supabase response body is `{}` (an object, not null/undefined and not
// an array), `data ?? []` keeps `{}` as-is, so `({}).find` is undefined
// and calling it throws a real TypeError during CandyGalaxyShell's
// render -- exactly the class of bug this boundary exists to catch.
// Intercepting the network response is the only thing this test does;
// every line of code that actually throws already ships in the app.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let confirmedUser = null;

test.beforeAll(async () => {
  if (!SERVICE_KEY) return;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `nextgenprecisiondrones+mwerrb${Date.now()}@gmail.com`,
      password: "TestPass!23456",
      email_confirm: true,
      user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() },
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

test("a real render error is caught by the root ErrorBoundary, not a blank page", async ({ page }) => {
  test.skip(!confirmedUser?.id, "requires SUPABASE_SERVICE_ROLE_KEY to provision a confirmed test account");

  // Force the child_profiles REST response into a shape existing app
  // code doesn't guard against (an object instead of an array), which
  // throws naturally inside CandyGalaxyShell's render.
  await page.route("**/rest/v1/child_profiles*", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(confirmedUser.email);
  await page.getByPlaceholder("••••••••").fill("TestPass!23456");
  await page.locator('button[type="submit"]').click();

  // Before this run's fix, this render error propagated uncaught and the
  // app rendered a blank page. Now the root ErrorBoundary catches it.
  await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible({ timeout: 20000 });

  // Body must have real content, not be blank.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.trim().length).toBeGreaterThan(0);
});
