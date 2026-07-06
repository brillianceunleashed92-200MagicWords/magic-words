import { test, expect } from "@playwright/test";

// Say It with Nova -- word-6/mid-session misfire investigation (docs/
// 200MW_Prompt7_Polish_Pass.md, Part 5). Found by reading the code, not
// (yet) reproduced on a real device: nothing stopped a second
// `startListening()` call while a PREVIOUS SpeechRecognition instance's
// async browser callbacks were still in flight -- a real, observed
// WebKit quirk is `onend` firing before `onresult` ever does, which
// re-enables the mic button while the old recognition object can still
// deliver a late, stale result afterward. This spec stubs
// SpeechRecognition to force exactly that ordering (end-with-no-result,
// then a NEW attempt starts, then the FIRST instance's result finally
// arrives) and asserts the stale event is discarded rather than acting
// on it -- the fix is the recognitionSeqRef sequence guard in
// SayItWithNova.jsx.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// A controllable fake SpeechRecognition: each `new` call pushes an
// instance onto window.__recognitions so the test can fire its
// onresult/onerror/onend handlers on demand, in any order, out of band
// from the component's own control flow -- exactly what a real flaky
// browser implementation would do, but deterministic here.
const FAKE_SPEECH_RECOGNITION_SCRIPT = `
window.__recognitions = [];
window.SpeechRecognition = window.webkitSpeechRecognition = class FakeSpeechRecognition {
  constructor() {
    this.lang = 'en-US';
    this.interimResults = false;
    this.maxAlternatives = 3;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._started = false;
    window.__recognitions.push(this);
  }
  start() { this._started = true; }
  abort() { this._aborted = true; }
  fireResult(transcript) {
    this.onresult?.({ results: [[{ transcript }]] });
  }
  fireError(error) {
    this.onerror?.({ error });
  }
  fireEnd() {
    this.onend?.();
  }
};
`;

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwsayit${Date.now()}@gmail.com`;
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

  // Unlocks Say It (rank 9) for "cat" -- ranks 1-8 done today.
  const priorActivities = ["word_match", "word_hunt", "rhyme_time", "find_the_word", "flash_cards", "story_time", "story_builder", "word_builder"];
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(priorActivities.map((gt) => ({
      child_id: child.id, user_id: userId, word: "cat", game_type: gt, correct: true, attempt_number: 1,
    }))),
  });

  return { email, userId };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

test("Say It with Nova: a stale recognition result after a fresh attempt starts is discarded, not acted on", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId } = await provisionFixture();
  try {
    await page.addInitScript(FAKE_SPEECH_RECOGNITION_SCRIPT);
    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Say It with Nova" }).click();
    await page.waitForTimeout(1500);

    const micButton = page.getByRole("button", { name: "Tap to speak" });
    await expect(micButton).toBeVisible({ timeout: 5000 });

    // Attempt #1: tap, then the fake recognition ends with no result at
    // all (the real WebKit quirk this race depends on).
    await micButton.click();
    await page.waitForFunction(() => window.__recognitions.length === 1);
    await page.evaluate(() => window.__recognitions[0].fireEnd());
    await page.waitForTimeout(200);

    // Mic button is re-enabled (status returned to idle) -- attempt #2,
    // a genuine new recognition.
    await expect(micButton).toBeEnabled();
    await micButton.click();
    await page.waitForFunction(() => window.__recognitions.length === 2);

    // NOW the stale attempt #1 finally delivers a result -- wrong word,
    // arriving after #2 already started. Without the sequence guard this
    // would knock the UI into "wrong"/miss state based on stale data.
    await page.evaluate(() => window.__recognitions[0].fireResult("not-the-target-word"));
    await page.waitForTimeout(300);

    // The stale event must NOT have been acted on: still shows the
    // listening state for the real, current attempt (#2), not "wrong".
    const bodyAfterStale = await page.locator("body").innerText();
    expect(bodyAfterStale).not.toMatch(/Almost!|Good try!/);

    // The genuine, current attempt (#2) resolves correctly.
    await page.evaluate(() => window.__recognitions[1].fireResult("cat"));
    await page.waitForTimeout(1200);
    const bodyAfterReal = await page.locator("body").innerText();
    expect(bodyAfterReal).toMatch(/Nova heard you!/);
  } finally {
    await deleteAccount(userId);
  }
});
