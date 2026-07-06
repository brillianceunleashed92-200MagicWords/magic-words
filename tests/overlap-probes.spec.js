import { test, expect } from "@playwright/test";

// Prompt 7 Part 8 -- formal synchronous `.paused` overlap probes for Find
// the Word and Quiz Boss, closing the gap ACTIVITY_ROSTER_REPORT.md
// disclosed ("Overlap probe: not run as a standalone synchronous
// `.paused` script"). Runs against PRODUCTION (real ElevenLabs audio --
// local Vite serves no /api routes, so /api/speak 404s there and every
// audioUrl would be null, making an overlap probe meaningless). Same
// project (ozhqsaysltiamadpcruz) backs both local and production, so
// provisioning via the admin REST API works identically either way.
//
// Method (per FILL_THE_STORY_REPORT.md's documented methodology, reused
// verbatim in DRAW_IT_TRACING_REPORT.md): instrument
// HTMLMediaElement.prototype.play via an init script that runs before
// any page script. At the moment each NEW play() fires, check whether
// the PREVIOUSLY tracked element's `.paused` is already true
// (synchronously, not via async pause/ended events -- that was the
// false-positive trap FILL_THE_STORY_REPORT.md found and documented).

test.use({ baseURL: "https://200magicwordsapp.com" });

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const OVERLAP_PROBE_SCRIPT = `
window.__overlapEvents = [];
(function() {
  const origPlay = HTMLMediaElement.prototype.play;
  let prevEl = null;
  HTMLMediaElement.prototype.play = function() {
    const overlapping = prevEl && prevEl !== this && !prevEl.paused;
    window.__overlapEvents.push({ src: this.src, overlapping, ts: Date.now() });
    prevEl = this;
    return origPlay.apply(this, arguments);
  };
})();
`;

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

async function makeChild(userId, name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name, age: 6, avatar: "rocket", interests: ["dinosaurs"] }),
  });
  const [child] = await res.json();
  return child.id;
}

async function seedRanks(childId, userId, word, gameTypes) {
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(gameTypes.map((gt) => ({
      child_id: childId, user_id: userId, word, game_type: gt, correct: true, attempt_number: 1,
    }))),
  });
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function signIn(page, email) {
  await page.addInitScript(OVERLAP_PROBE_SCRIPT);
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
}

async function answerAllQuestions(page, candidateWords) {
  const pattern = new RegExp(`^(${candidateWords.join("|")})$`, "i");
  let answeredCount = 0;
  for (let i = 0; i < 10; i++) {
    const target = page.getByRole("button", { name: pattern }).first();
    const visible = await target.isVisible().catch(() => false);
    if (!visible) break;
    await target.click();
    answeredCount += 1;
    await page.waitForTimeout(1800); // let the errorless celebration + advance settle
  }
  return answeredCount;
}

test("Find the Word: synchronous overlap probe against production, real audio", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(90000);
  const { email, userId } = await provisionAccount("mwoverlapftw");
  try {
    const childId = await makeChild(userId, "OverlapKid");
    await seedRanks(childId, userId, "cat", ["word_match", "word_hunt", "rhyme_time"]);
    // A session pulls from every unmastered word in the child's pool, not
    // just today's single pathWord -- seed a few more so this session has
    // more than one real question to work through.
    const morePathWords = ["dog", "bird", "fish"];
    await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(morePathWords.map((w) => ({ child_id: childId, word: w, mastery: 0, attempt_count: 0 }))),
    });

    await signIn(page, email);
    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Find the Word" }).click();
    await expect(page.getByText("Preparing your quest…")).toHaveCount(0, { timeout: 15000 });
    await page.waitForTimeout(1500);

    const answered = await answerAllQuestions(page, ["cat", ...morePathWords]);
    expect(answered).toBeGreaterThan(0);

    const events = await page.evaluate(() => window.__overlapEvents);
    const overlaps = events.filter((e) => e.overlapping);
    console.log(`[overlap-probe] Find the Word: ${events.length} play() calls, ${overlaps.length} overlaps, ${answered} questions answered`);
    expect(overlaps).toHaveLength(0);
  } finally {
    await deleteAccount(userId);
  }
});

test("Quiz Boss: synchronous overlap probe against production, real audio", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(90000);
  const { email, userId } = await provisionAccount("mwoverlapqb");
  try {
    const childId = await makeChild(userId, "OverlapKid2");
    // Quiz Boss draws from a review pool (spaced-repetition, falls back to
    // weakest-mastery words) -- seed several distinct words' history so it
    // has more than one question to pull from, plus ranks 1-4 for "cat"
    // (the fresh child's default pathWord) to unlock rank 5 itself.
    await seedRanks(childId, userId, "cat", ["word_match", "word_hunt", "rhyme_time", "find_the_word"]);
    const priorWords = ["dog", "bird", "fish", "bear", "ball"];
    await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(priorWords.map((w) => ({ child_id: childId, word: w, mastery: 40, attempt_count: 2 }))),
    });

    await signIn(page, email);
    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Quiz Boss" }).click();
    await page.waitForTimeout(3000); // review plan generation (/api/session-generator) round-trip

    let answeredCount = 0;
    for (let i = 0; i < 8; i++) {
      const buttons = page.getByRole("button").filter({ hasNotText: /Hear|speak|Home/i });
      const count = await buttons.count();
      if (count < 2) break;
      // Quiz Boss options are unlabeled as to correctness from the DOM alone
      // (that's the point -- it's a real recognition question); tap the
      // first plausible option tile each round. The probe cares about
      // audio-overlap behavior across rapid question transitions, not
      // scoring, so a mix of hits/misses through the errorless scaffold is
      // fine -- it still exercises every real play() call along the way.
      await buttons.first().click();
      answeredCount += 1;
      await page.waitForTimeout(1800);
    }

    const events = await page.evaluate(() => window.__overlapEvents);
    const overlaps = events.filter((e) => e.overlapping);
    console.log(`[overlap-probe] Quiz Boss: ${events.length} play() calls, ${overlaps.length} overlaps, ${answeredCount} taps`);
    expect(overlaps).toHaveLength(0);
  } finally {
    await deleteAccount(userId);
  }
});
