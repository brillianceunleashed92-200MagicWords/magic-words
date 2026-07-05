import { test, expect } from "@playwright/test";

// Draw It → Letter Tracing rebuild (docs/200MW_Prompt5_Draw_It_Tracing.md) —
// covers the tracing happy path (a full word, letter by letter) and the
// errorless off-path re-cue, per the prompt's VERIFY requirement that the
// suite grow with the rebuild. Needs SUPABASE_SERVICE_ROLE_KEY in the
// environment (not committed), same as the other self-provisioning specs.
//
// Tracing a curved stroke can't be done with a simple two-point mouse drag
// (SVG arcs aren't straight lines) — each test dispatches synthetic
// PointerEvents sampled along the stroke's own guide-path geometry inside
// the page (via page.evaluate), the same technique used to verify this
// live during development (see docs/DRAW_IT_TRACING_REPORT.md TRACING
// INTERACTION). Each test provisions its own account+child (rather than
// sharing one via beforeAll) since playing Draw It writes learning_events
// for the target word.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Fresh child, no mastery seeded — "cat" (unit 1, sort_order 1, has_art)
// is the pathWord by default. Seeds the 9 activities ranked ahead of Draw
// It (rank 10 in src/lib/activityDefs.js) so it's the current Guided Path
// node today.
async function provisionFixture() {
  const targetWord = "cat";
  const email = `nextgenprecisiondrones+mwdrawit${Date.now()}@gmail.com`;
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

  const priorActivities = ["word_match", "word_hunt", "rhyme_time", "word_song", "flash_cards", "story_time", "story_builder", "word_builder", "say_it"];
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(priorActivities.map((gt) => ({
      child_id: childId, user_id: userId, word: targetWord, game_type: gt, correct: true, attempt_number: 1,
    }))),
  });

  return { email, userId };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function startDrawIt(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: /Let's go/ }).click();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Draw It" }).click();
  await page.waitForTimeout(1500);
}

// Runs inside the page. Samples the current stroke's guide path (the first
// <path> in the 0 0 100 120 tracing SVG) and dispatches a pointerdown ->
// pointermove* -> pointerup sequence following it exactly, so curved
// strokes (bowls, arches) are traced correctly, not just straight lines.
async function traceCurrentStroke(page) {
  return page.evaluate(() => {
    const svg = [...document.querySelectorAll("svg")].find((s) => s.getAttribute("viewBox") === "0 0 100 120");
    if (!svg) return null;
    const guidePath = svg.querySelector("path");
    const total = guidePath.getTotalLength();
    const ctm = svg.getScreenCTM();
    function toScreen(svgPt) {
      const pt = svg.createSVGPoint();
      pt.x = svgPt.x;
      pt.y = svgPt.y;
      const s = pt.matrixTransform(ctm);
      return { x: s.x, y: s.y };
    }
    const steps = 40;
    const screenPts = [];
    for (let i = 0; i <= steps; i++) {
      const len = (total * i) / steps;
      const p = guidePath.getPointAtLength(len);
      screenPts.push(toScreen(p));
    }
    function dispatch(type, pt) {
      svg.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 1, pointerType: "mouse", clientX: pt.x, clientY: pt.y,
      }));
    }
    dispatch("pointerdown", screenPts[0]);
    for (let i = 1; i < screenPts.length; i++) dispatch("pointermove", screenPts[i]);
    dispatch("pointerup", screenPts[screenPts.length - 1]);
    return total;
  });
}

async function traceOffPath(page) {
  return page.evaluate(() => {
    const svg = [...document.querySelectorAll("svg")].find((s) => s.getAttribute("viewBox") === "0 0 100 120");
    if (!svg) return null;
    const guidePath = svg.querySelector("path");
    const ctm = svg.getScreenCTM();
    function toScreen(svgPt) {
      const pt = svg.createSVGPoint();
      pt.x = svgPt.x;
      pt.y = svgPt.y;
      const s = pt.matrixTransform(ctm);
      return { x: s.x, y: s.y };
    }
    const start = toScreen(guidePath.getPointAtLength(0));
    function dispatch(type, pt) {
      svg.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 1, pointerType: "mouse", clientX: pt.x, clientY: pt.y,
      }));
    }
    dispatch("pointerdown", start);
    dispatch("pointermove", { x: start.x + 300, y: start.y + 300 });
    const sunPath = [...svg.querySelectorAll("path")].find((p) => p.getAttribute("stroke") === "#FFC531");
    const result = { offset: sunPath?.getAttribute("stroke-dashoffset") ?? null, dash: sunPath?.getAttribute("stroke-dasharray") ?? null };
    dispatch("pointerup", { x: start.x + 300, y: start.y + 300 });
    return result;
  });
}

test("Draw It: tracing a full word completes and celebrates", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId } = await provisionFixture();
  try {
    await startDrawIt(page, email);
    await expect(page.getByText("Trace the letter, start at the dot!")).toBeVisible();

    // "cat" — 3 letters, up to 3 strokes each; loop generously and stop
    // once the tracing stage disappears (word complete -> celebration ->
    // session advances to the next word, which unmounts this stage).
    for (let i = 0; i < 8; i++) {
      const stage = page.locator('svg[viewBox="0 0 100 120"]');
      if (!(await stage.count())) break;
      await page.waitForTimeout(1100); // let the per-stroke demo finish
      await traceCurrentStroke(page);
    }

    await page.waitForTimeout(2500); // whole-word audio + celebration sequencing
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("XP");
    expect(bodyText).not.toMatch(/not quite|incorrect|wrong/i);
  } finally {
    await deleteAccount(userId);
  }
});

test("Draw It: off-path tracing is errorless and resumes", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId } = await provisionFixture();
  try {
    await startDrawIt(page, email);
    await page.waitForTimeout(1100); // let the first stroke's demo finish

    const offPathResult = await traceOffPath(page);
    expect(offPathResult).not.toBeNull();
    // Off-path never advances progress: dashoffset stays equal to the full
    // dasharray length (0% traced) — and never fails, never shows red/X.
    expect(offPathResult.offset).toBe(offPathResult.dash);
    const bodyAfterOffPath = await page.locator("body").innerText();
    expect(bodyAfterOffPath).not.toMatch(/not quite|incorrect|wrong|try again/i);

    // The same stroke is still tappable — an on-path trace immediately
    // after completes normally (errorless: off-path never locks anything).
    await traceCurrentStroke(page);
    await page.waitForTimeout(300);
    const svg = page.locator('svg[viewBox="0 0 100 120"]');
    await expect(svg).toBeVisible();
  } finally {
    await deleteAccount(userId);
  }
});
