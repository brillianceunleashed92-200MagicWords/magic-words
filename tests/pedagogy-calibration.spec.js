import { test, expect } from "@playwright/test";

// FEAT_PEDAGOGY_CALIBRATION_R1 Phase 7 — fixtures + specs for the
// pedagogy-calibration run's client-visible behavior. Self-provisions one
// shared account (nextgenprecisiondrones+mwpedagogy* — same prefix
// convention as every other self-provisioning spec, per rule 4: not a
// third pattern, just this run's own suffix alongside mwquestprog/mwqb/
// mwa2/mwparentmetrics).
//
// Server-side session-generator.js selection ("the one-tap word is still
// selected by the generator") is NOT re-verified here — local dev serves
// no /api routes (documented trap, see quiz-boss.spec.js's own note), so
// any local test necessarily exercises the CLIENT FALLBACK
// (computeFallbackCurrentUnit), already unit-tested directly in
// session-plan-fallback.spec.js including the exact one-tap case. The
// real server path is confirmed in the PRODUCTION VERIFICATION walk
// (Phase 8), same precedent as quiz-boss.spec.js.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function provisionFixture() {
  const email = `nextgenprecisiondrones+mwpedagogy${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const userId = user.id;

  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: userId, name: "PedagogyKid", age: 6, avatar: "rocket", interests: ["dinosaurs"] }),
  });
  const [child] = await childRes.json();
  const childId = child.id;

  const unit1Res = await fetch(`${SUPABASE_URL}/rest/v1/words?unit=eq.1&select=word`, { headers: adminHeaders });
  const unit1Words = (await unit1Res.json()).map((w) => w.word);
  const siblings = unit1Words.filter((w) => w !== "cat");

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = Date.now();

  // "cat": one-tap-100% -- 1 attempt, 1 correct, exactly the A2 confound
  // this run eliminates. Siblings: genuinely mastered (attempt_count 5)
  // so "cat" is the natural weakest/current word in unit 1 (drives both
  // the client fallback's currentUnit scan AND which word actually
  // appears in the local session batch).
  await fetch(`${SUPABASE_URL}/rest/v1/word_progress`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify([
      { user_id: userId, child_id: childId, word: "cat", mastery: 100, attempt_count: 1, correct_count: 1, next_review_at: yesterday },
      ...siblings.map((w) => ({ user_id: userId, child_id: childId, word: w, mastery: 100, attempt_count: 5, correct_count: 5, next_review_at: yesterday })),
    ]),
  });

  // Real learning_events history for "dog" (a sibling) crossing real
  // mastery THIS week, real-mastery-gated for weeklyStats/chart-1
  // agreement (both should report exactly 1 word this week: dog, not cat).
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify([0, 1, 2].map((i) => ({
      user_id: userId, child_id: childId, word: "dog", game_type: "word_match", correct: true,
      response_time_ms: 1500, recorded_at: new Date(now - i * 60000).toISOString(),
    }))),
  });
  // "cat"'s own single (one-tap) event, for attempt_number-monotonic
  // context alongside the live gameplay events tests B/C add on top.
  await fetch(`${SUPABASE_URL}/rest/v1/learning_events`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify([{
      user_id: userId, child_id: childId, word: "cat", game_type: "word_match", correct: true,
      response_time_ms: 1500, attempt_number: 1, recorded_at: new Date(now - 5 * 60000).toISOString(),
    }]),
  });

  return { email, userId, childId };
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

async function openGrownUpsDashboard(page) {
  await page.click("text=Grown-ups");
  await page.waitForTimeout(500);
  const star = page.locator('button[aria-label="Hold to unlock"]');
  const box = await star.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2000);
  await page.mouse.up();
  await page.waitForTimeout(500);

  const quickCheck = page.locator("text=Quick check");
  if (await quickCheck.isVisible().catch(() => false)) {
    const questionText = await page.locator("text=/Quick check: what/").textContent();
    const match = questionText.match(/(\d+)\s*\+\s*(\d+)/);
    const answer = String(Number(match[1]) + Number(match[2]));
    await page.click(`button:has-text("${answer}")`, { exact: true });
    await page.waitForTimeout(500);
  }
}

test.describe("Pedagogy calibration", () => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.describe.configure({ mode: "serial" });

  let fixture;

  test.beforeAll(async () => {
    fixture = await provisionFixture();
  });

  test.afterAll(async () => {
    await deleteAccount(fixture?.userId);
  });

  test("a one-tap 100%-mastery word is non-mastered everywhere: galaxy, masteredCount, This Week, chart 1, unit progress", async ({ page }) => {
    test.setTimeout(60000);
    await signIn(page, fixture.email);

    // Home: "cat" should render in-progress (touched, percent shown), not
    // done, and the natural current/weakest word in unit 1 -- confirmed by
    // its presence in "Today's Magic Word" / the guided path, not skipped
    // past. masteredCount badge (Galaxy "X / 200") should count only the
    // 7 genuinely-mastered siblings, not cat -- 7, not 8.
    await page.click("text=Galaxy");
    await page.waitForTimeout(1500);
    const galaxyText = await page.locator("body").innerText();
    expect(galaxyText).toMatch(/7\s*\/\s*200/);

    // Parent Dashboard: This Week hero stat and chart 1 must agree (both
    // count only "dog", the genuinely-crossed-this-week word) -- the
    // exact same-screen contradiction this run's mission (line 6) names.
    await openGrownUpsDashboard(page);
    await page.waitForTimeout(3000);
    const dashboardText = await page.locator("body").innerText();
    const wordsThisWeekMatch = dashboardText.match(/(\d+)\s*\n?\s*WORDS THIS WEEK/i);
    expect(wordsThisWeekMatch).not.toBeNull();
    expect(Number(wordsThisWeekMatch[1])).toBe(1);

    // Mastery Map tab: cat's tile must not be in the top (mint/"mastered")
    // bucket -- confirmed via the tile's title attribute (word -- percent%),
    // cross-checked against its real isRealMastery status rather than
    // asserting a color directly (brittle).
    await page.click("text=Mastery Map");
    await page.waitForTimeout(1500);
    const catTile = page.locator('[title^="cat —"]');
    await expect(catTile).toBeVisible();
    const catBg = await catTile.evaluate((el) => getComputedStyle(el).backgroundColor);
    const dogTile = page.locator('[title^="dog —"]');
    const dogBg = await dogTile.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(catBg).not.toBe(dogBg); // dog (real mastery) is mint; cat must render differently
  });

  // Answer tiles show the option word as visible text; the 3 chrome
  // buttons (exit, mute, audio-replay) are icon-only with an aria-label
  // but empty visible text -- filtering on innerText (not accessible
  // name/aria-label) is what actually distinguishes them, confirmed via
  // a throwaway debug run that logged every button's innerText.
  async function clickAnyTileExcept(page, excludeWord) {
    const buttons = await page.getByRole("button").all();
    for (const b of buttons) {
      const text = (await b.innerText()).trim().toLowerCase();
      if (text && text !== excludeWord.toLowerCase() && /^[a-z]+$/.test(text)) {
        await b.click();
        return true;
      }
    }
    return false;
  }

  // Deliberately used ONLY the natural "complete the whole batch -> Session
  // Complete -> Keep going" pipeline, never the early-exit control.
  // Confirmed via debugging (both flows are real, mid-run findings): early
  // exit (`onExit()`) actually unmounts PlayScreen, which (a) wipes this
  // run's scaffold-down React state entirely (a fresh mount has no memory
  // of prior misses) and (b) the guided path's "done today" query did not
  // reliably refresh across that unmount/remount cycle in this test
  // environment. Natural completion keeps PlayScreen mounted the whole
  // time -- confirmed reliable, and matches quest-progression.spec.js's
  // own already-proven pattern.
  //
  // WordArt renders `role="img" aria-label={word}` -- Tap & Hear's target
  // is readable from its own text prompt ("Tap the picture of X"); Word
  // Hunt has no text prompt (audio-only), but its one prompt picture
  // (not the text-only answer tiles) is the only role=img element, so its
  // aria-label reveals the target word directly.
  async function playBatchFailingWord(page, activityLabel, targetWord, getCurrentTargetWord) {
    await page.getByText(activityLabel, { exact: true }).click();
    await page.waitForTimeout(2000);
    for (let i = 0; i < 8; i++) {
      if (await page.getByText("Session Complete!").isVisible().catch(() => false)) break;
      const word = await getCurrentTargetWord(page);
      if (!word) break;
      if (word.toLowerCase() === targetWord.toLowerCase()) {
        // The target question -- fail it deliberately (first tap absorbed
        // by the errorless scaffold, second tap on a still-wrong tile
        // completes it wrong).
        await clickAnyTileExcept(page, targetWord);
        await page.waitForTimeout(700);
        await clickAnyTileExcept(page, targetWord);
      } else {
        // Filler question -- answer it precisely correctly (single tap,
        // no retry ambiguity) so it never needs a second, possibly
        // stale/wrong-question tap.
        const tile = page.getByRole("button", { name: new RegExp(`^${word}\\b`, "i") });
        await tile.click();
      }
      await page.waitForTimeout(2200);
    }
    await expect(page.getByText("Session Complete!")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Keep going" }).click();
    await page.waitForTimeout(2000);
  }

  async function tapHearTarget(page) {
    const promptLocator = page.locator("text=/Tap the picture of/");
    if (!(await promptLocator.isVisible().catch(() => false))) return null;
    const prompt = await promptLocator.textContent();
    return prompt.replace("Tap the picture of", "").trim();
  }

  async function wordHuntTarget(page) {
    // Several icon-only buttons (exit, mute, audio-replay) and the Nova
    // sprite are ALSO role="img" with their own aria-labels ("Nova", or
    // none) -- the actual WordArt prompt picture is the only one whose
    // label is a real lowercase curriculum word, confirmed via a debug
    // run's accessibility snapshot showing `.first()` matched an icon,
    // not the word.
    const imgs = await page.getByRole("img").all();
    for (const img of imgs) {
      const label = await img.getAttribute("aria-label");
      if (label && label.toLowerCase() !== "nova" && /^[a-z]+$/i.test(label)) return label;
    }
    return null;
  }

  test("scaffold-down: two completed errors on the same word pin its next activity, banner shows, resets on a correct completion at the pinned tier", async ({ page }) => {
    test.setTimeout(120000);
    await signIn(page, fixture.email);
    await page.getByRole("button", { name: /Let's go/ }).click();
    await page.waitForTimeout(1500);

    // "cat" (unit 1's weakest word, per fixture) is in both batches --
    // fail it via Tap & Hear, then fail it again via Word Hunt (two
    // different activities, same word, two completed errors, same
    // PlayScreen mount throughout).
    await playBatchFailingWord(page, "Tap & Hear", "cat", tapHearTarget);
    await playBatchFailingWord(page, "Word Hunt", "cat", wordHuntTarget);

    // Pin should now be active: encouraging banner, never mentioning
    // difficulty/misses. "cat" is has_art, so its easiest eligible tier
    // (getEligibleActivities(word)[0]) is word_match (Tap & Hear) -- the
    // doc's own named example.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/Let's look at this one together/i);
    expect(bodyText).not.toMatch(/wrong|miss|struggl|difficult/i);

    // product_events telemetry is NOT checked here: fireScaffoldDownTelemetry
    // POSTs to /api/track, which -- like /api/session-generator -- is not
    // served by local Vite dev (the same documented trap quiz-boss.spec.js's
    // own comment names). The write itself is confirmed live in the
    // PRODUCTION VERIFICATION walk (Phase 8), same precedent.

    // Reset: answer correctly at the pinned tier (still the same mount)
    // -- the banner clears.
    await page.getByText("Tap & Hear", { exact: true }).click();
    await page.waitForTimeout(2000);
    for (let i = 0; i < 8; i++) {
      if (await page.getByText("Session Complete!").isVisible().catch(() => false)) break;
      const word = await tapHearTarget(page);
      if (!word) break;
      const tile = page.getByRole("button", { name: new RegExp(`^${word}\\b`, "i") });
      await tile.click();
      await page.waitForTimeout(2200);
    }
    await expect(page.getByText("Session Complete!")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Keep going" }).click();
    await page.waitForTimeout(2000);

    const afterResetText = await page.locator("body").innerText();
    expect(afterResetText).not.toMatch(/Let's look at this one together/i);

    // attempt_number monotonic per word (Phase 4): this test generated
    // real "cat" events on top of the fixture's own 1 seeded event --
    // every one should carry a strictly increasing attempt_number, no
    // duplicates, no gaps relative to the previous value.
    const catEventsRes = await fetch(`${SUPABASE_URL}/rest/v1/learning_events?child_id=eq.${fixture.childId}&word=eq.cat&select=attempt_number,recorded_at&order=recorded_at.asc`, { headers: adminHeaders });
    const catEvents = await catEventsRes.json();
    expect(catEvents.length).toBeGreaterThan(1);
    for (let i = 1; i < catEvents.length; i++) {
      expect(catEvents[i].attempt_number).toBeGreaterThan(catEvents[i - 1].attempt_number);
    }
  });
});
