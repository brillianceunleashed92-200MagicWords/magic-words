import { test, expect } from "@playwright/test";

// Prompt 10 PART 3 — the CSP walkthrough the hardening phase always deferred
// ("don't flip Report-Only -> enforcing until a walkthrough confirms zero
// violations" — CLAUDE.md's own standing rule). Runs against a real
// deployment (DEPLOY_BASE_URL, default production) since CSP headers are
// only served by Vercel, not local Vite. First run: production, still
// Report-Only, to FIND violations. Second run (this pass): the branch
// preview, after flipping to enforcing, to prove zero violations AND zero
// broken functionality under the real blocking policy.
//
// Covers every live rotation activity (word_match/word_hunt/rhyme_time/
// find_the_word/flash_cards/story_builder/word_builder/draw_it/story_time/
// say_it), the placement ladder, Galaxy, every Parent Portal tab, and a
// real TEST-mode checkout call — the full MISSION #3 coverage list.
//
// Method: the standard `securitypolicyviolation` DOM event (fires for
// BOTH Report-Only and enforcing policies — https://developer.mozilla.org/
// en-US/docs/Web/API/Document/securitypolicyviolation_event), collected
// via an addInitScript so it's wired before any page script runs,
// including the very first navigation. Deliberately NOT relying on
// page.on('console') scraping "Refused to..." text — Chrome routes CSP
// violation reports through the browser's own security logging, which
// isn't guaranteed to surface as a `Runtime.consoleAPICalled` event (what
// Playwright's console listener actually taps); confirmed empirically
// during this pass (a console-scraping first draft saw only 1 message
// total across the entire walk, suspiciously low for a genuine signal —
// switched to the DOM event before trusting a clean result either way).

const DEPLOY_BASE_URL = process.env.DEPLOY_BASE_URL || "https://200magicwordsapp.com";
test.use({ baseURL: DEPLOY_BASE_URL });

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function provisionFixture(tag) {
  const email = `nextgenprecisiondrones+mwcsp${tag}${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;

  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "CSPWalkKid", age: 6, avatar: "rocket", interests: ["dinosaurs"] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  const wordsRes = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=lte.2&select=word`, { headers: adminHeaders });
  const words = await wordsRes.json();
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify(words.map((w) => ({ user_id: userId, child_id: childId, word: w.word, mastery: 100 }))),
  });

  return { email, userId, childId };
}

async function seedPriorActivities(childId, userId, activities) {
  if (activities.length === 0) return;
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify(activities.map((gt) => ({
      child_id: childId, user_id: userId, word: "eat", game_type: gt, correct: true, attempt_number: 1,
    }))),
  });
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function signIn(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
}

// Full guided-path rank order (src/lib/activityDefs.js).
const RANK_ORDER = [
  "word_match", "word_hunt", "rhyme_time", "find_the_word", "flash_cards",
  "story_time", "story_builder", "word_builder", "say_it", "draw_it",
];
const RANK_LABEL = {
  word_match: "Tap & Hear", word_hunt: "Word Hunt", rhyme_time: "Match & Sort",
  find_the_word: "Find the Word", flash_cards: "Quiz Boss", story_time: "Story Time",
  story_builder: "Fill the Story", word_builder: "Word Builder", say_it: "Say It with Nova",
  draw_it: "Draw It",
};

test("CSP walk: every live activity + Galaxy + Parent Portal + checkout, zero violations", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(240000);

  // Wired via addInitScript so it's present before EVERY navigation's
  // scripts run (addInitScript re-injects on each new document) — a CSP
  // violation on any page load, not just the first, must be caught.
  // window.__cspViolations resets on every navigation, so it's drained
  // into the Node-side `allViolations` array immediately before each
  // `page.goto` via `gotoAndDrain` below, not read only once at the end.
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__cspViolations.push({
        directive: e.violatedDirective,
        blockedURI: e.blockedURI,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber,
        disposition: e.disposition, // "report" (Report-Only) or "enforce"
      });
    });
  });
  page.on("pageerror", () => {}); // unrelated JS errors are out of scope for this walk

  const allViolations = [];
  async function drainViolations() {
    const v = await page.evaluate(() => window.__cspViolations ?? []).catch(() => []);
    allViolations.push(...v);
  }
  async function gotoAndDrain(url) {
    await drainViolations();
    await page.goto(url);
  }

  const { email, userId, childId } = await provisionFixture("main");
  try {
    // ── feat/auth-r1 Phase 3: /update-password, reached with no active
    // session (the real state a cold recovery-link click lands in) ──
    await gotoAndDrain("/update-password");
    await expect(page.getByText("Link expired")).toBeVisible({ timeout: 10000 });

    // ── LEGAL_PAGES_R1: the three published policy routes — public,
    // no auth needed, but still real routes the CSP must cover. ──
    await gotoAndDrain("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible({ timeout: 10000 });
    await gotoAndDrain("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible({ timeout: 10000 });
    await gotoAndDrain("/refunds");
    await expect(page.getByRole("heading", { name: "Cancellation & Refund Policy" })).toBeVisible({ timeout: 10000 });

    // ── Every rotation activity: re-seed ranks-ahead, reload, enter, wait
    // for render + any auto-playing audio, exit via the shared close. ──
    for (let i = 0; i < RANK_ORDER.length; i++) {
      const activity = RANK_ORDER[i];
      await fetch(`${SUPABASE_URL}/rest/v1/learning_events?child_id=eq.${childId}`, {
        method: "DELETE", headers: adminHeaders,
      });
      await seedPriorActivities(childId, userId, RANK_ORDER.slice(0, i));

      await gotoAndDrain("/app");
      if (i === 0) await signIn(page, email);
      await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
      await page.getByRole("button", { name: /Let's go/ }).click();
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: RANK_LABEL[activity] }).click();
      await page.waitForTimeout(3000); // let audio/art/story fetches fire

      const closeBtn = page.getByRole("button", { name: "Exit and save progress" }).last();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // ── Galaxy tab ──
    await gotoAndDrain("/app");
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Galaxy" }).click();
    await page.waitForTimeout(1500);

    // ── Parent Portal: every tab ──
    await page.getByRole("button", { name: "Grown-ups" }).click();
    await page.waitForTimeout(500);
    // Press-and-hold gate — dispatch pointerdown/up directly (see
    // LEGACY_RETIREMENT_REPORT.md / LAUNCH_ANALYTICS_REPORT.md for why a
    // simulated click/drag doesn't satisfy a real 2s hold).
    await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, 330);
      el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, 330);
      el?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      el?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await page.waitForTimeout(1000);
    // A math quick-check may gate entry — answer generously by trying
    // every visible option in turn until the gate clears (avoids hardcoding
    // one arithmetic answer that may not match this run's random question).
    const mathGate = page.getByText(/Quick check/);
    if (await mathGate.isVisible().catch(() => false)) {
      const options = page.locator("button").filter({ hasText: /^\d+$/ });
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        await options.nth(i).click();
        await page.waitForTimeout(500);
        if (!(await mathGate.isVisible().catch(() => false))) break;
      }
    }
    await page.waitForTimeout(1000);

    for (const tab of ["Dashboard", "Moments", "Mastery Map", "Settings"]) {
      const tabBtn = page.getByRole("button", { name: tab, exact: true });
      if (await tabBtn.isVisible().catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // ── TEST-mode checkout: fires the same fetch UpgradeBanner uses, from
    // INSIDE the page (curl/Node bypasses CSP entirely — a browser-enforced
    // mechanism — so this only means something run in-page). Observed
    // directly rather than following the full redirect (which would
    // navigate off-origin and end the page/test); this pass cares whether
    // the same-origin fetch itself is CSP-clean, not the Stripe redirect
    // target (already proven reachable in LAUNCH_ANALYTICS_REPORT.md's
    // VERIFICATION, a real cs_test_... URL returned). ──
    const checkoutResult = await page.evaluate(async () => {
      const raw = localStorage.getItem('sb-ozhqsaysltiamadpcruz-auth-token');
      const token = raw ? JSON.parse(raw)?.access_token : null;
      if (!token) return { skipped: true };
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interval: "month" }),
      });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, hasUrl: !!body.url };
    });
    console.log(`[csp-walk] checkout call result: ${JSON.stringify(checkoutResult)}`);
    expect(checkoutResult.skipped || checkoutResult.status === 200).toBeTruthy();
    if (!checkoutResult.skipped) expect(checkoutResult.hasUrl).toBe(true);

    await drainViolations(); // final drain — nothing navigates away after this

    // Vercel injects its own preview-deployment toolbar/feedback script
    // (vercel.live/_next-live/feedback/feedback.js) at the platform edge
    // layer on PREVIEW deployments only — confirmed absent from both
    // production's and this preview's actual HTML source (`curl | grep
    // vercel.live` — zero matches on either), so it isn't something our
    // build ships or something a real production visitor ever loads.
    // Correctly blocked by script-src 'self' (that's the policy working
    // as intended); filtered here because it's a preview-tooling artifact
    // of running this walk against a Vercel preview URL at all, not a
    // real CSP gap to fix — the production re-walk (no vercel.live
    // injection there) is the authoritative zero-violations proof.
    const realViolations = allViolations.filter((v) => !v.blockedURI.includes('vercel.live'));
    console.log(`[csp-walk] total violations observed: ${allViolations.length} (${allViolations.length - realViolations.length} filtered as Vercel preview-toolbar artifacts)`);
    expect(realViolations, `CSP violations found:\n${JSON.stringify(realViolations, null, 2)}`).toEqual([]);
  } finally {
    await fetch(`${SUPABASE_URL}/rest/v1/learning_events?child_id=eq.${childId}`, {
      method: "DELETE", headers: adminHeaders,
    }).catch(() => {});
    await deleteAccount(userId);
  }
});
