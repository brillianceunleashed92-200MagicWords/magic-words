import { test, expect } from "@playwright/test";

// FIX R1 Phase 3 (A5) — the session-plan sessionStorage cache used to be a
// single fixed key (mw_session_plan_v3), so a parent switching between
// children on a family account could receive a DIFFERENT child's cached
// plan within the 60-minute TTL. Now scoped by childId (mw_session_plan_v4:
// ${childId}). Exercised via a real browser's sessionStorage through a
// dynamic import of the actual module (Vite dev server serves it directly)
// rather than a full two-child sign-in flow.

const FAKE_PLAN = { quizzes: [1, 2, 3, 4], sessionGoal: "test" };

test("cache written for child A is not returned for child B", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async (plan) => {
    const mod = await import("/src/hooks/useSessionPlan.js");
    mod.cachePlan("child-A", plan);
    return {
      forA: mod.getCachedPlan("child-A"),
      forB: mod.getCachedPlan("child-B"),
      keyA: mod.planCacheKey("child-A"),
      keyB: mod.planCacheKey("child-B"),
    };
  }, FAKE_PLAN);

  expect(result.forA).toEqual(FAKE_PLAN);
  expect(result.forB).toBeNull();
  expect(result.keyA).not.toBe(result.keyB);
});

test("legacy unscoped key is removed and never read", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async (plan) => {
    const mod = await import("/src/hooks/useSessionPlan.js");
    // Simulate a returning user who still has the pre-fix unscoped key.
    sessionStorage.setItem(mod.LEGACY_UNSCOPED_PLAN_CACHE_KEY, JSON.stringify({ plan, generatedAt: Date.now() }));
    // Any cache read (regardless of which child) triggers cleanup.
    mod.getCachedPlan("child-C");
    return {
      legacyStillPresent: sessionStorage.getItem(mod.LEGACY_UNSCOPED_PLAN_CACHE_KEY) !== null,
      cForC: mod.getCachedPlan("child-C"),
    };
  }, FAKE_PLAN);

  expect(result.legacyStillPresent).toBe(false);
  expect(result.cForC).toBeNull();
});
