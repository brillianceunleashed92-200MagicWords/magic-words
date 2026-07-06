import { test, expect } from "@playwright/test";

// chore/captcha Phase 4 — exercises both paths of LoginScreen.jsx's hCaptcha
// wiring:
//   1. INERT (VITE_HCAPTCHA_SITE_KEY unset, matching production today) —
//      runs against the shared dev server (default baseURL, port 5183,
//      already started by playwright.config.js's webServer) — no env
//      override needed, since it's already unset there.
//   2. WIRED (site key present) — needs a SEPARATE Vite dev server instance
//      with VITE_HCAPTCHA_SITE_KEY actually set, since import.meta.env is
//      inlined at build/dev-server-start time, not runtime. Started/stopped
//      by this spec itself (see test.beforeAll/afterAll below) on a
//      different port so the shared 5183 server (every other spec's inert
//      baseline) is never touched.
//
// hCaptcha's own published test keypair (fetched live from docs.hcaptcha.com,
// not invented): sitekey 10000000-ffff-ffff-ffff-000000000001, secret
// 0x0000000000000000000000000000000000000000 — documented to "never
// challenge and always produce the same response token" (success: true).
// Not a real secret; hCaptcha publishes it specifically for use in code
// like this.
const TEST_SITE_KEY = "10000000-ffff-ffff-ffff-000000000001";
const WIRED_PORT = 5187;
const WIRED_BASE_URL = `http://localhost:${WIRED_PORT}`;

test.describe("hCaptcha inert path (site key unset, matches production today)", () => {
  test("sign-in form renders and submits with zero hCaptcha network activity", async ({ page }) => {
    const hcaptchaRequests = [];
    page.on("request", (req) => {
      if (/hcaptcha\.com/.test(req.url())) hcaptchaRequests.push(req.url());
    });

    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(`nextgenprecisiondrones+captchainert${Date.now()}@gmail.com`);
    await page.getByPlaceholder("••••••••").fill("WrongPass!23456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500); // let any (unexpected) hCaptcha script attempt fire before asserting

    expect(hcaptchaRequests, "no request should ever reach hcaptcha.com when the site key is unset").toEqual([]);
    expect(await page.locator('iframe[src*="hcaptcha"]').count()).toBe(0);
  });
});

test.describe("hCaptcha wired path (test site key present)", () => {
  let serverProcess;

  test.beforeAll(async () => {
    const { spawn } = await import("node:child_process");
    serverProcess = spawn("npx", ["vite", "--port", String(WIRED_PORT)], {
      env: { ...process.env, VITE_HCAPTCHA_SITE_KEY: TEST_SITE_KEY },
      stdio: "ignore",
      detached: true,
    });
    // Poll until the dev server responds instead of a fixed sleep.
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

  test("real widget loads under CSP and produces a token on submit", async ({ page }) => {
    const hcaptchaRequests = [];
    page.on("request", (req) => {
      if (/hcaptcha\.com/.test(req.url())) hcaptchaRequests.push(req.url());
    });

    await page.goto("/app");
    // Confirm the widget actually mounted (invisible mode still injects an
    // iframe into the DOM once the script loads, even though nothing is
    // visibly rendered).
    await expect.poll(async () => page.locator('iframe[src*="hcaptcha"]').count(), { timeout: 15000 }).toBeGreaterThan(0);

    await page.getByPlaceholder("you@example.com").fill(`nextgenprecisiondrones+captchawired${Date.now()}@gmail.com`);
    await page.getByPlaceholder("••••••••").fill("WrongPass!23456");
    await page.locator('button[type="submit"]').click();

    // The real test-keypair widget never challenges and always succeeds —
    // proof this ran for real (not just that our code called execute()) is
    // the browser actually reaching hcaptcha.com under the new CSP.
    await expect.poll(() => hcaptchaRequests.length, { timeout: 15000 }).toBeGreaterThan(0);
  });
});
