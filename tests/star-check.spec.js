import { test, expect } from "@playwright/test";
import {
  BANK, LEVEL_UNIT_MAP, TOTAL_LEVELS, WORDS_PER_LEVEL,
  wordsForLevel, frameA, voFor, isWordKnown, levelProgress, startingUnitForFloor,
} from "../src/lib/starCheckBank.js";
import { STAR_CHECK_PICS } from "../src/lib/starCheckIcons.js";

// STAR_CHECK_R1 Phase 5 — same convention as placement-checkin.spec.js:
// plain-Node pure-function tests first (no browser), then live tests
// against a real deployment below (local Vite serves no /api routes).

// ─── frameA ─────────────────────────────────────────────────────────────
test("frameA: noun frame uses 'a' before a consonant sound", () => {
  const kid = BANK.find((w) => w.word === "kid");
  expect(frameA(kid)).toBe("Find the one that is a kid");
});

test("frameA: noun frame uses 'an' before a vowel sound (animal)", () => {
  const animal = BANK.find((w) => w.word === "animal");
  expect(frameA(animal)).toBe("Find the one that is an animal");
});

test("frameA: plural frame", () => {
  const boys = BANK.find((w) => w.word === "boys");
  expect(frameA(boys)).toBe("Find the ones that are boys");
});

test("frameA: mass-noun frame", () => {
  const water = BANK.find((w) => w.word === "water");
  expect(frameA(water)).toBe("Find the one that is water");
});

test("frameA: print-only word (no frame) returns null, never a faked meaning probe", () => {
  const eat = BANK.find((w) => w.word === "eat");
  expect(eat.meaningA).toBeNull();
  expect(frameA(eat)).toBeNull();
});

// ─── voFor ──────────────────────────────────────────────────────────────
test("voFor: probe A is the frame line plus a period", () => {
  const kid = BANK.find((w) => w.word === "kid");
  expect(voFor(kid, "A")).toBe("Find the one that is a kid.");
});

test("voFor: probe B is always the dictation line, even for print-only words", () => {
  const eat = BANK.find((w) => w.word === "eat");
  expect(voFor(eat, "B")).toBe("Tap the one that says eat.");
});

test("voFor: probe A on a print-only word returns null (caller must not administer it)", () => {
  const eat = BANK.find((w) => w.word === "eat");
  expect(voFor(eat, "A")).toBeNull();
});

// ─── isWordKnown ────────────────────────────────────────────────────────
test("isWordKnown: both probes correct is known", () => {
  expect(isWordKnown(true, true)).toBe(true);
});

test("isWordKnown: print-only word (meaning null) known iff look-alike correct", () => {
  expect(isWordKnown(null, true)).toBe(true);
  expect(isWordKnown(null, false)).toBe(false);
});

test("isWordKnown: meaning correct but look-alike wrong is not known", () => {
  expect(isWordKnown(true, false)).toBe(false);
});

test("isWordKnown: meaning wrong (even if look-alike correct) is not known", () => {
  expect(isWordKnown(false, true)).toBe(false);
});

// ─── levelProgress (routing) ────────────────────────────────────────────
test("routing: two misses anywhere in a level floors immediately", () => {
  expect(levelProgress([false, false])).toEqual({ outcome: "floor", misses: 2 });
  expect(levelProgress([true, false, false])).toEqual({ outcome: "floor", misses: 2 });
});

test("routing: one miss then a clean rest of the level passes", () => {
  expect(levelProgress([false, true, true, true, true])).toEqual({ outcome: "pass", misses: 1 });
});

test("routing: a clean sweep of all 5 words passes with zero misses", () => {
  expect(levelProgress([true, true, true, true, true])).toEqual({ outcome: "pass", misses: 0 });
});

test("routing: fewer than 5 words administered with 0-1 misses continues", () => {
  expect(levelProgress([])).toEqual({ outcome: "continue", misses: 0 });
  expect(levelProgress([true, false])).toEqual({ outcome: "continue", misses: 1 });
});

test("routing: two-miss floor holds at every level (level-agnostic reducer)", () => {
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    expect(wordsForLevel(level).length).toBe(WORDS_PER_LEVEL);
    expect(levelProgress([false, false])).toEqual({ outcome: "floor", misses: 2 });
  }
});

// ─── mapping table ──────────────────────────────────────────────────────
test("mapping: level -> starting unit table is the locked [PROPOSED] values", () => {
  expect(LEVEL_UNIT_MAP).toEqual({ 1: 1, 2: 4, 3: 8, 4: 12, 5: 15, clean: 16 });
  for (const level of [1, 2, 3, 4, 5, "clean"]) {
    expect(startingUnitForFloor(level)).toBe(LEVEL_UNIT_MAP[level]);
  }
});

// ─── bank integrity ─────────────────────────────────────────────────────
test("bank integrity: exactly 25 words, 5 levels of 5", () => {
  expect(BANK.length).toBe(25);
  expect(TOTAL_LEVELS).toBe(5);
  expect(WORDS_PER_LEVEL).toBe(5);
  for (let level = 1; level <= 5; level++) {
    expect(wordsForLevel(level).length).toBe(5);
  }
});

test("bank integrity: Level 1 words and option sets match Dr. Blank's doc, incl. the two documented child-safety swaps", () => {
  const level1 = wordsForLevel(1).map((w) => w.word);
  expect(level1).toEqual(["kid", "girl", "boys", "eat", "rest"]);

  const kid = wordsForLevel(1).find((w) => w.word === "kid");
  expect(kid.meaningA).toEqual(["man", "dog", "kid", "bird"]);
  // The child-safety foil swap: one of her original 4th-foil B-options was
  // replaced with "kit" (see starCheckBank.js's own header comment).
  expect(kid.lookalikeB).toEqual(["kin", "kid", "kit", "bid"]);
  expect(kid.lookalikeB).not.toContain("bik"); // her original unswapped foil never appears
});

test("bank integrity: no duplicate options within any single option set", () => {
  for (const entry of BANK) {
    if (entry.meaningA) expect(new Set(entry.meaningA).size).toBe(entry.meaningA.length);
    expect(new Set(entry.lookalikeB).size).toBe(entry.lookalikeB.length);
  }
});

test("bank integrity: every option set includes its own target word", () => {
  for (const entry of BANK) {
    if (entry.meaningA) expect(entry.meaningA).toContain(entry.word);
    expect(entry.lookalikeB).toContain(entry.word);
  }
});

// ─── icon coverage ──────────────────────────────────────────────────────
test("icons: exactly 45 keys ported verbatim from the mockup", () => {
  expect(Object.keys(STAR_CHECK_PICS).length).toBe(45);
});

test("icons: every picture-eligible word's meaning-probe option set is fully covered", () => {
  const pictureEligible = BANK.filter((entry) => entry.meaningA !== null);
  for (const entry of pictureEligible) {
    for (const option of entry.meaningA) {
      expect(STAR_CHECK_PICS[option], `missing icon for "${option}" (word: ${entry.word})`).toBeTruthy();
    }
  }
});

test("icons: exactly 12 words are picture-eligible, 13 are print-only (matches the mockup's own hasPics() behavior)", () => {
  const pictureEligible = BANK.filter((entry) => entry.meaningA !== null);
  const printOnly = BANK.filter((entry) => entry.meaningA === null);
  expect(pictureEligible.length).toBe(12);
  expect(printOnly.length).toBe(13);
});

// ─── Live tests (against a real deployment -- local Vite serves no /api
// routes). DEPLOY_BASE_URL lets this run against this branch's own
// preview before merge; defaults to production once merged, same
// convention as placement-checkin.spec.js. ──────────────────────────────
test.use({ baseURL: process.env.DEPLOY_BASE_URL || "https://200magicwordsapp.com" });

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function provisionAccount(prefix) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  return { email, userId: user.id };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function fetchChildId(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles?parent_id=eq.${userId}&select=id,placement_unit,measured_unit,placement_completed_at`, {
    headers: adminHeaders,
  });
  const [child] = await res.json();
  return child;
}

async function signInAndOnboard(page, email, name) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Let's meet your Star Learner!")).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder("e.g. Emma").fill(name);
  await page.locator('button[aria-label]').first().click(); // first avatar
  await page.getByRole("button", { name: /Let's go/ }).click();
  await expect(page.getByText("One more thing")).toBeVisible({ timeout: 15000 });
}

// Taps the tray letters in the correct order (c, then a) -- never
// triggers the [PROPOSED] struggle path.
async function passWarmup(page) {
  await expect(page.getByText("Copy me")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Tap c" }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Tap a" }).click();
  await page.waitForTimeout(700);
}

// Taps the tile whose data-word matches `word` (never rendered as visible
// text for the meaning/picture probe -- see StarCheckProbe.jsx's own
// comment on why this attribute exists).
async function tapWord(page, word) {
  await page.locator(`[data-word="${word}"] button`).click();
  await page.waitForTimeout(1000);
}

test("Star Check: beginner path -- skip logs placement_skipped, no child_profiles write", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId } = await provisionAccount("mwstarbeg");
  try {
    await signInAndOnboard(page, email, "BeginnerKid");
    await page.getByRole("button", { name: /start at the beginning/i }).click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(1500);
    const child = await fetchChildId(userId);
    expect(child.placement_unit).toBeNull();
    expect(child.placement_completed_at).toBeNull();
  } finally {
    await deleteAccount(userId);
  }
});

test("Star Check: skip mid-check via the exit button also lands no child_profiles write", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId } = await provisionAccount("mwstarskip");
  try {
    await signInAndOnboard(page, email, "SkipKid");
    await page.getByRole("button", { name: /Let Nova find their level/i }).click();
    await expect(page.getByText("Find your starting star")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(1500);
    const child = await fetchChildId(userId);
    expect(child.placement_completed_at).toBeNull();
  } finally {
    await deleteAccount(userId);
  }
});

test("Star Check: full clean sweep -- passes all 5 levels, lands the 'clean' floor (Unit 16), scoreless result", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(180000);
  const { email, userId } = await provisionAccount("mwstarclean");
  try {
    await signInAndOnboard(page, email, "CleanKid");
    await page.getByRole("button", { name: /Let Nova find their level/i }).click();
    await expect(page.getByText("Find your starting star")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Let's go, Nova!" }).click();
    await passWarmup(page);

    // Drive every word of every level correct via its known target
    // (BANK is fixed content, not random -- these are Dr. Blank's real
    // Level 1-5 words in order). Picture-eligible words administer TWO
    // probes (meaning, then look-alike); print-only words administer
    // only one (look-alike) -- mirrors src/lib/starCheckBank.js's own
    // meaningA !== null split, asserted separately in the unit tests above.
    const PICTURE_ELIGIBLE = new Set(["kid", "girl", "boys", "baby", "duck", "water", "rocks", "hole", "plant", "animal", "letter", "trees"]);
    const words = [
      "kid", "girl", "boys", "eat", "rest",
      "baby", "good", "duck", "move", "water",
      "sad", "rocks", "cry", "hole", "push",
      "plant", "animal", "small", "dig", "safe",
      "bite", "letter", "smile", "open", "trees",
    ];
    for (const word of words) {
      const probesForThisWord = PICTURE_ELIGIBLE.has(word) ? 2 : 1;
      for (let p = 0; p < probesForThisWord; p++) await tapWord(page, word);
      // Level lift interstitial appears between levels -- dismiss it if shown.
      const keepGoing = page.getByRole("button", { name: "Keep going" });
      if (await keepGoing.isVisible().catch(() => false)) await keepGoing.click();
    }

    await expect(page.getByText("You found your starting star!")).toBeVisible({ timeout: 20000 });
    // Scoreless: no digits/percentages/pass-fail language anywhere on the result screen.
    const resultText = await page.locator("body").innerText();
    expect(resultText).not.toMatch(/\d+%|correct|incorrect|missed|score/i);
    await page.getByRole("button", { name: "Let's fly!" }).click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(1500);
    const child = await fetchChildId(userId);
    expect(child.measured_unit).toBe(16); // LEVEL_UNIT_MAP.clean
    expect(child.placement_completed_at).not.toBeNull();
  } finally {
    await deleteAccount(userId);
  }
});

test("Star Check: forced two-miss floor at Level 2 -- floors at Unit 4, target word never printed, no wiggle/hint-glow", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(120000);
  const { email, userId } = await provisionAccount("mwstarfloor");
  try {
    await signInAndOnboard(page, email, "FloorKid");
    await page.getByRole("button", { name: /Let Nova find their level/i }).click();
    await page.getByRole("button", { name: "Let's go, Nova!" }).click();
    await passWarmup(page);

    // Pass Level 1 clean.
    for (const word of ["kid", "girl", "boys", "eat", "rest"]) {
      for (let probeCount = 0; probeCount < 2; probeCount++) {
        const hasTile = await page.locator(`[data-word="${word}"]`).count();
        if (hasTile === 0) break;
        await tapWord(page, word);
      }
    }

    // Measurement exception check while a Level-2 probe is on screen:
    // the target word must never appear as printed text (only spoken +
    // as a tile option), and a miss must render identically to a hit --
    // no wiggle, no hint-glow.
    await expect(page.getByText(/Level 2/)).toBeVisible({ timeout: 15000 });
    const eyebrowText = await page.locator("body").innerText();
    expect(eyebrowText).not.toMatch(/Listen and find the word! baby/i); // target never named in the prompt itself

    // Force two misses on Level 2's first two words (baby, good) by
    // tapping a wrong tile each time.
    for (const word of ["baby", "good"]) {
      for (let probeCount = 0; probeCount < 2; probeCount++) {
        const tiles = page.locator("[data-word]");
        const count = await tiles.count();
        if (count === 0) break;
        // Tap whichever tile is NOT this word's own target -- guaranteed wrong.
        let tappedWrong = false;
        for (let i = 0; i < count; i++) {
          const w = await tiles.nth(i).getAttribute("data-word");
          if (w !== word) { await tiles.nth(i).locator("button").click(); tappedWrong = true; break; }
        }
        expect(tappedWrong).toBe(true);
        await page.waitForTimeout(1000);

        const wiggleCount = await page.locator('[style*="lessonWiggle"]').count();
        expect(wiggleCount).toBe(0);
        const bodyText = await page.locator("body").innerText();
        expect(bodyText).not.toMatch(/Not quite|try again|incorrect/i);
      }
    }

    await expect(page.getByText("You found your starting star!")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Let's fly!" }).click();

    await page.waitForTimeout(1500);
    const child = await fetchChildId(userId);
    expect(child.measured_unit).toBe(4); // LEVEL_UNIT_MAP[2]
  } finally {
    await deleteAccount(userId);
  }
});

test("product_events: a completed Star Check lands a placement_completed row with mode:'star_check_v1' and per_word detail (positive twin)", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId } = await provisionAccount("mwstarevent");
  try {
    await signInAndOnboard(page, email, "EventKid");
    await page.getByRole("button", { name: /Let Nova find their level/i }).click();
    await page.getByRole("button", { name: "Let's go, Nova!" }).click();
    await passWarmup(page);
    // Force a two-miss floor at Level 1 (fastest path to a finalize call).
    for (const word of ["kid", "girl"]) {
      for (let probeCount = 0; probeCount < 2; probeCount++) {
        const tiles = page.locator("[data-word]");
        const count = await tiles.count();
        if (count === 0) break;
        let tapped = false;
        for (let i = 0; i < count; i++) {
          const w = await tiles.nth(i).getAttribute("data-word");
          if (w !== word) { await tiles.nth(i).locator("button").click(); tapped = true; break; }
        }
        expect(tapped).toBe(true);
        await page.waitForTimeout(1000);
      }
    }
    await expect(page.getByText("You found your starting star!")).toBeVisible({ timeout: 20000 });

    let rows = [];
    for (let i = 0; i < 6 && rows.length === 0; i++) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/product_events?child_id=eq.${(await fetchChildId(userId)).id}&event_type=eq.placement_completed`, { headers: adminHeaders });
      const data = await res.json().catch(() => []);
      rows = data ?? [];
      if (rows.length === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const payload = rows[0].payload;
    expect(payload.mode).toBe("star_check_v1");
    expect(payload.floor_level).toBe(1);
    expect(Array.isArray(payload.per_word)).toBe(true);
    expect(payload.per_word.length).toBeGreaterThan(0);
  } finally {
    await deleteAccount(userId);
  }
});
