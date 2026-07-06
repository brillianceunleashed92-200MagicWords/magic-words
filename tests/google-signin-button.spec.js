import { test, expect } from "@playwright/test";

// feat/auth-r1 Phase 6 — Google sign-in button, inert by default.
// Same separate-dev-server pattern as chore/captcha's
// tests/hcaptcha.spec.js: import.meta.env is inlined at Vite
// build/dev-server-start time, so testing the wired (flag-on) path
// needs its own server instance with the env var actually set.

const WIRED_PORT = 5188;
const WIRED_BASE_URL = `http://localhost:${WIRED_PORT}`;

test.describe("Google button inert (flag unset, matches production today)", () => {
  test("button absent, zero Google-related network activity", async ({ page }) => {
    const googleRequests = [];
    page.on("request", (req) => {
      if (/accounts\.google\.com|google/.test(req.url()) && !req.url().includes("fonts.google")) googleRequests.push(req.url());
    });

    await page.goto("/app");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(googleRequests, "no request should reach Google when the flag is unset").toEqual([]);
  });
});

test.describe("Google button wired (flag set)", () => {
  let serverProcess;

  test.beforeAll(async () => {
    const { spawn } = await import("node:child_process");
    serverProcess = spawn("npx", ["vite", "--port", String(WIRED_PORT)], {
      env: { ...process.env, VITE_GOOGLE_AUTH_ENABLED: "true" },
      stdio: "ignore",
      detached: true,
    });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(WIRED_BASE_URL);
        if (res.ok) return;
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("wired-path dev server did not become ready in time");
  });

  test.afterAll(() => {
    if (serverProcess?.pid) {
      try { process.kill(-serverProcess.pid, "SIGKILL"); } catch { /* already gone */ }
    }
  });

  test.use({ baseURL: WIRED_BASE_URL });

  test("button renders and click navigates toward Google's authorize URL", async ({ page }) => {
    await page.goto("/app");
    const googleButton = page.getByRole("button", { name: "Continue with Google" });
    await expect(googleButton).toBeVisible();

    // Never let a real navigation to Google complete in automation —
    // intercept and abort right as it's about to leave the app, then
    // assert the URL it was headed to.
    let capturedUrl = null;
    await page.route("**/authorize**", async (route) => {
      capturedUrl = route.request().url();
      await route.abort();
    });

    await googleButton.click();
    await expect.poll(() => capturedUrl, { timeout: 10000 }).not.toBeNull();
    expect(capturedUrl).toContain("/auth/v1/authorize");
    expect(capturedUrl).toContain("provider=google");
  });
});
