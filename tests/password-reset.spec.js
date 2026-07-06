import { test, expect } from "@playwright/test";

// feat/auth-r1 Phase 6 — password reset request + update-password screen.
//
// The E2E happy path deliberately does NOT follow admin.generate_link's
// action_link via HTTP redirect (the doc's own suggested trick) — that
// produces GoTrue's classic implicit-flow hash-fragment tokens
// regardless of this app's PKCE flowType setting, and a PKCE-configured
// client correctly REJECTS that format as a flow mismatch (confirmed by
// reading node_modules/@supabase/auth-js's own source during Phase 3/4 —
// see docs/AUTH_R1_REPORT.md). Instead: generate_link's response also
// includes a top-level `hashed_token` field, and calling
// supabase.auth.verifyOtp({ token_hash, type: 'recovery' }) directly from
// the app's own PKCE-configured client establishes the session correctly
// — this is what real end users' PKCE-flow email links do too, just
// without needing an actual email round-trip.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createTestUser(prefix) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "OldPass!23456", email_confirm: true }),
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

async function getRecoveryTokenHash(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "recovery", email }),
  });
  const body = await res.json();
  return body.hashed_token;
}

async function passwordGrantWorks(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { ok: res.ok && !!body.access_token, errorCode: body.error_code };
}

test.describe("Password reset — full E2E without email delivery", () => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  let userId;

  test.afterEach(async () => {
    await deleteTestUser(userId);
    userId = undefined;
  });

  test("verifyOtp establishes recovery session, form updates password, old fails / new succeeds", async ({ page }) => {
    const { email, id } = await createTestUser("resetE2E");
    userId = id;
    const tokenHash = await getRecoveryTokenHash(email);

    await page.goto("/update-password");
    const result = await page.evaluate(async (th) => {
      const mod = await import("/src/supabaseClient.js");
      const { data, error } = await mod.supabase.auth.verifyOtp({ token_hash: th, type: "recovery" });
      return { hasSession: !!data?.session, error: error?.message };
    }, tokenHash);
    expect(result.hasSession, `verifyOtp should establish a session: ${result.error}`).toBe(true);

    await expect(page.getByText("Set a new password")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("••••••••").first().fill("NewPass!456");
    await page.getByPlaceholder("••••••••").nth(1).fill("NewPass!456");
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText("Password updated")).toBeVisible({ timeout: 5000 });
    await page.waitForURL(/\/app/, { timeout: 5000 });

    const oldResult = await passwordGrantWorks(email, "OldPass!23456");
    expect(oldResult.ok, "old password must no longer work").toBe(false);
    expect(oldResult.errorCode).toBe("invalid_credentials");

    const newResult = await passwordGrantWorks(email, "NewPass!456");
    expect(newResult.ok, "new password must work").toBe(true);
  });

  test("expired/invalid link shows friendly error, never a blank screen", async ({ page }) => {
    await page.goto("/update-password");
    await expect(page.getByText("Link expired")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/app");
  });
});

test.describe("Password reset request — anti-enumeration + cooldown", () => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  let userId;

  test.afterEach(async () => {
    await deleteTestUser(userId);
    userId = undefined;
  });

  test("existing vs nonexistent email produce byte-identical UI copy", async ({ page }) => {
    const { email: existingEmail, id } = await createTestUser("resetanti");
    userId = id;
    const nonexistentEmail = `nextgenprecisiondrones+resetantinonexist${Date.now()}@gmail.com`;

    // Reads whichever message actually renders (success or the generic
    // error) rather than asserting one specific outcome — this project's
    // mailer has a real, documented, easily-exhausted rate limit (hit
    // repeatedly elsewhere this session), and resetPasswordForEmail can
    // legitimately return either outcome depending on its current state.
    // The actual anti-enumeration requirement is that BOTH calls produce
    // the identical message to each other, whichever branch fires.
    async function submitAndGetMessage(email) {
      await page.goto("/app");
      await page.getByRole("button", { name: "Forgot password?" }).click();
      await page.getByPlaceholder("you@example.com").fill(email);
      await page.locator('button[type="submit"]').click();
      const message = page.getByText(/If an account exists for that email|Something went wrong/);
      await expect(message).toBeVisible({ timeout: 10000 });
      return message.textContent();
    }

    const existingMessage = await submitAndGetMessage(existingEmail);
    const nonexistentMessage = await submitAndGetMessage(nonexistentEmail);
    expect(existingMessage).toBe(nonexistentMessage);
  });

  test("cooldown disables submit for 60s with a visible countdown", async ({ page }) => {
    const email = `nextgenprecisiondrones+resetcooldown${Date.now()}@gmail.com`;
    await page.goto("/app");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByPlaceholder("you@example.com").fill(email);
    const submit = page.locator('button[type="submit"]');
    await submit.click();
    await expect(submit).toBeDisabled({ timeout: 10000 });
    await expect(submit).toContainText(/\(\d+s\)/);
  });
});
