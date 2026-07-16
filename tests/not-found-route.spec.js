import { test, expect } from "@playwright/test";

// FIX_NO_BLANK_SCREENS_R1 -- QA-04. Previously any path outside the 6
// routes defined in main.jsx rendered nothing (<Suspense fallback={null}>,
// no matching <Route>). Confirms the new catch-all renders a real,
// on-brand not-found screen instead, and that its CTA actually navigates.

test("unknown path renders the NotFound screen instead of a blank page", async ({ page }) => {
  await page.goto("/this-path-does-not-exist");
  await expect(page.getByText("This star hasn't been mapped yet")).toBeVisible();
  await expect(page.getByText("We couldn't find that page.")).toBeVisible();
  // A genuinely blank page would have an empty <body> -- assert real content exists.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.trim().length).toBeGreaterThan(0);
});

test("unknown path under /app/legacy-style deep link also renders NotFound, not a blank page", async ({ page }) => {
  // Sanity: a deep, multi-segment unknown path (not just a single unknown
  // top-level segment) also matches the catch-all, since it's the last
  // route and React Router path="*" matches any unmatched path.
  await page.goto("/some/deeply/nested/nonexistent/path");
  await expect(page.getByText("This star hasn't been mapped yet")).toBeVisible();
});

test("NotFound's back-CTA navigates home when logged out", async ({ page }) => {
  await page.goto("/zzz-typo");
  await expect(page.getByText("This star hasn't been mapped yet")).toBeVisible();
  await page.getByRole("button", { name: /Back to the galaxy/i }).click();
  // Logged-out visitors go to the landing page ("/").
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
});
