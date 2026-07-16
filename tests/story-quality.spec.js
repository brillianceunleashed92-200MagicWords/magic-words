import { test, expect } from "@playwright/test";

// FIX_STORY_QUALITY_R1 / FIX_STORY_FOLLOWUP_R1 — a brand-new child's first
// Story Engine story must never be degenerate (bare word permutations).
// This spec only exercises the below-floor routing path (StoryScreen.jsx ->
// story_catalog / the vocab-safe fallback), which needs no api/story-engine
// call and so runs fully against the local dev server + real Supabase, same
// as tests/fill-the-story.spec.js's pattern. The AI-generation path's exact-
// vocabulary validation (api/story-engine.js) is NOT exercised here — that
// endpoint is a Vercel serverless function local `vite` doesn't serve
// (CLAUDE.md); it's verified instead via the live production walk recorded
// in docs/STORY_FOLLOWUP_REPORT.md's VERIFICATION section.
//
// FIX_STORY_FOLLOWUP_R1 changed the expected below-floor behavior: a found
// catalog story is now served VERBATIM (no vocabulary gate — Sal's call,
// curated content's richer read-aloud vocabulary is the methodology, not a
// violation). The vocab-safe fallback template is reached only when no
// catalog row exists for the target word at any tier — updated below into
// two separate cases instead of the old single strict-word-list assertion.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// A genuinely brand-new child: no word_progress seeded at all (mirrors the
// reported incident's account). `placementUnit` controls the floor that
// `currentWord` scans from — units 1-2's words are ALL covered by
// story_catalog today (checked directly against production), unit 3's are
// not, so placementUnit picks which of the two below-floor cases this
// fixture exercises without needing any word_progress rows either way.
async function provisionFreshChild(name, placementUnit) {
  const email = `nextgenprecisiondrones+mwstoryqual${Date.now()}${Math.random().toString(36).slice(2, 6)}@gmail.com`;
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
    body: JSON.stringify({ parent_id: userId, name, age: 5, avatar: "rocket", interests: ["animals"], placement_unit: placementUnit, placement_completed_at: new Date().toISOString() }),
  });
  const [child] = await childRes.json();

  return { email, userId, childId: child.id };
}

async function deleteAccount(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
}

async function fetchWordSet() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/words?select=word`, { headers: adminHeaders });
  const rows = await res.json();
  return new Set(rows.map((r) => r.word.toLowerCase()));
}

async function fetchCatalogRow(word) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/story_catalog?target_word=eq.${word}&select=*`, { headers: adminHeaders });
  const [row] = await res.json();
  return row;
}

async function fetchLatestStory(childId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stories?child_id=eq.${childId}&select=*&order=created_at.desc&limit=1`,
    { headers: adminHeaders }
  );
  const [row] = await res.json();
  return row;
}

async function signInAndOpenStory(page, email) {
  await page.goto("/app");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

  // A brand-new child has zero stories, so isNewStoryDue() is true on the
  // very first Home render — matches the reported incident exactly.
  await expect(page.getByText("New Story Friday!")).toBeVisible({ timeout: 10000 });
  await page.getByText("New Story Friday!").click();

  // Below-floor routing (StoryScreen.jsx) serves catalog/vocab-safe
  // content synchronously (no AI call) — the reader's cover page should
  // appear quickly, well under the AI path's several-second latency.
  await expect(page.getByText("Start reading")).toBeVisible({ timeout: 10000 });
}

test("below-floor child whose target word has a catalog story: served verbatim, richer vocabulary allowed", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId, childId } = await provisionFreshChild("CatalogCheckKid", 1);
  try {
    await signInAndOpenStory(page, email);

    const story = await fetchLatestStory(childId);
    expect(story).toBeTruthy();
    // Unit 1's first word (sort_order 1) is "cat" — checked directly
    // against production, always the case for a placement_unit:1 child
    // with zero word_progress.
    expect(story.target_word).toBe("cat");

    const catalogRow = await fetchCatalogRow("cat");
    expect(catalogRow).toBeTruthy(); // catalog coverage assumption still holds

    // Served verbatim: no vocabulary gate applied to catalog content.
    expect(story.title).toBe(catalogRow.title);
    expect(story.body).toEqual(catalogRow.sentences);
    expect(story.vocabulary_used).toEqual(catalogRow.vocabulary_used);

    // The catalog's own richer vocabulary ("likes", "jumps", "yard", "paw",
    // etc.) is expected to include words outside the strict 200-word list
    // now — that's the whole point of this follow-up. Confirm it actually
    // does (guards against this becoming a false-negative no-op check if
    // the catalog content ever changes to be strictly-in-list).
    const wordSet = await fetchWordSet();
    const tokens = story.body.join(" ").toLowerCase().match(/[a-z']+/g) || [];
    const outOfList = tokens.filter((t) => !wordSet.has(t));
    expect(outOfList.length).toBeGreaterThan(0);
  } finally {
    await deleteAccount(userId);
  }
});

test("below-floor child whose target word has NO catalog story: vocab-safe template, strictly in-list", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId, childId } = await provisionFreshChild("NoCatalogCheckKid", 3);
  try {
    await signInAndOpenStory(page, email);

    const story = await fetchLatestStory(childId);
    expect(story).toBeTruthy();
    // Unit 3's first word (sort_order 17) is "eat" — checked directly,
    // has no story_catalog row at any tier.
    expect(story.target_word).toBe("eat");

    const catalogRow = await fetchCatalogRow("eat");
    expect(catalogRow).toBeFalsy(); // coverage-gap assumption still holds

    // Vocab-safe fallback template — every word must be a real 200-word
    // entry (or the child's name), and no bare target-word/name permutation
    // (the reported bug's "Cat cat.", "Aliya cats." shape).
    const wordSet = await fetchWordSet();
    const childNameLower = "nocatalogcheckkid";
    const tokens = story.body.join(" ").toLowerCase().match(/[a-z']+/g) || [];
    const outOfList = tokens.filter((t) => t !== childNameLower && !wordSet.has(t));
    expect(outOfList, `out-of-list tokens: ${outOfList.join(", ")}`).toEqual([]);

    const targetLower = story.target_word.toLowerCase();
    for (const sentence of story.body) {
      const sentenceTokens = sentence.toLowerCase().match(/[a-z']+/g) || [];
      const hasOtherWord = sentenceTokens.some((t) => t !== targetLower && t !== childNameLower);
      expect(hasOtherWord, `degenerate bare-permutation sentence: "${sentence}"`).toBe(true);
    }
  } finally {
    await deleteAccount(userId);
  }
});
