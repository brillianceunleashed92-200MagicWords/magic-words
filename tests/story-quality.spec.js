import { test, expect } from "@playwright/test";

// FIX_STORY_QUALITY_R1 — a brand-new child's first Story Engine story must
// never be degenerate (bare word permutations, out-of-list vocabulary).
// This spec only exercises the below-floor routing path (StoryScreen.jsx ->
// story_catalog / the vocab-safe fallback), which needs no api/story-engine
// call and so runs fully against the local dev server + real Supabase, same
// as tests/fill-the-story.spec.js's pattern. The AI-generation path's exact-
// vocabulary validation (api/story-engine.js) is NOT exercised here — that
// endpoint is a Vercel serverless function local `vite` doesn't serve
// (CLAUDE.md); it's verified instead via the live production walk recorded
// in docs/STORY_QUALITY_REPORT.md's VERIFICATION section.

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "TestPass!23456";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// A genuinely brand-new child: no word_progress seeded at all (mirrors the
// reported incident's account, placed at Unit 1 minutes earlier with zero
// real-mastered words).
async function provisionFreshChild() {
  const email = `nextgenprecisiondrones+mwstoryqual${Date.now()}@gmail.com`;
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
    body: JSON.stringify({ parent_id: userId, name: "VocabCheckKid", age: 5, avatar: "rocket", interests: ["animals"], placement_unit: 1, placement_completed_at: new Date().toISOString() }),
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

async function fetchLatestStory(childId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stories?child_id=eq.${childId}&select=*&order=created_at.desc&limit=1`,
    { headers: adminHeaders }
  );
  const [row] = await res.json();
  return row;
}

test("brand-new child's first Story Engine story is never degenerate", async ({ page }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY to provision a test account");
  test.setTimeout(60000);

  const { email, userId, childId } = await provisionFreshChild();
  try {
    const wordSet = await fetchWordSet();

    await page.goto("/app");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Ready to fly?")).toBeVisible({ timeout: 20000 });

    // A brand-new child has zero stories, so isNewStoryDue() is true on
    // the very first Home render — matches the reported incident exactly.
    await expect(page.getByText("New Story Friday!")).toBeVisible({ timeout: 10000 });
    await page.getByText("New Story Friday!").click();

    // Below-floor routing (StoryScreen.jsx) serves catalog/vocab-safe
    // content synchronously (no AI call) — the reader's cover page should
    // appear quickly, well under the AI path's several-second latency.
    await expect(page.getByText("Start reading")).toBeVisible({ timeout: 10000 });

    const story = await fetchLatestStory(childId);
    expect(story).toBeTruthy();
    expect(story.audio_url === null || typeof story.audio_url === "string").toBe(true);

    const childNameLower = "vocabcheckkid";
    const tokens = story.body.join(" ").toLowerCase().match(/[a-z']+/g) || [];
    const outOfList = tokens.filter((t) => t !== childNameLower && !wordSet.has(t));
    expect(outOfList, `out-of-list tokens: ${outOfList.join(", ")}`).toEqual([]);

    // Degenerate-pattern guard: every sentence must contain at least one
    // token that isn't the target word, the child's name, or a bare
    // repeat of the target word (the reported bug's "Cat cat.", "Aliya
    // cats." shape) — i.e. real sentence structure, not word soup.
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
