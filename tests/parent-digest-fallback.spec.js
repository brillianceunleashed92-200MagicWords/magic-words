import { test, expect } from "@playwright/test";
import handler from "../api/parent-digest.js";

// FIX_PARENT_SURFACE_R1 -- the deterministic fallback() (used whenever
// ANTHROPIC_API_KEY is unset or the AI call fails) is what makes
// DECISION 1's truthfulness rule testable without depending on a live
// Claude call: "hasn't started" may only be said when there is genuinely
// zero activity across learning_events, placement/check-in, AND story
// reads. Plain Node assertions, no browser/page needed, same pattern as
// session-plan-fallback.spec.js.
const { fallback } = handler;

test("zero activity across the board still says hasn't started", () => {
  const { digest } = fallback("Aliya", [], { storiesReadThisWeek: 0, placementCompletedThisWeek: false, placementUnit: null });
  expect(digest).toMatch(/hasn't started/i);
});

test("placement + story read only (the reported incident) never says hasn't started, acknowledges both truthfully", () => {
  const { digest } = fallback("Aliya", [], { storiesReadThisWeek: 1, placementCompletedThisWeek: true, placementUnit: 3 });
  expect(digest).not.toMatch(/hasn't started/i);
  expect(digest).not.toMatch(/waiting for their (very )?first session/i);
  expect(digest).toMatch(/Unit 3/);
  expect(digest).toMatch(/story/i);
});

test("placement only, no story read, still acknowledged truthfully", () => {
  const { digest } = fallback("Aliya", [], { storiesReadThisWeek: 0, placementCompletedThisWeek: true, placementUnit: 7 });
  expect(digest).not.toMatch(/hasn't started/i);
  expect(digest).toMatch(/Unit 7/);
});

test("story read only, no placement, still acknowledged truthfully", () => {
  const { digest } = fallback("Aliya", [], { storiesReadThisWeek: 2, placementCompletedThisWeek: false, placementUnit: null });
  expect(digest).not.toMatch(/hasn't started/i);
  expect(digest).toMatch(/2 stories/);
});

test("real word practice still takes precedence over the activity-only framing (unchanged path)", () => {
  const { digest } = fallback("Aliya", [{ word: "cat", mastery: 80 }], { storiesReadThisWeek: 1, placementCompletedThisWeek: true, placementUnit: 3 });
  expect(digest).toMatch(/practiced 1 word/);
});

test("dinnerCards are always present and non-empty regardless of activity shape", () => {
  const { dinnerCards } = fallback("Aliya", [], {});
  expect(Array.isArray(dinnerCards)).toBe(true);
  expect(dinnerCards.length).toBeGreaterThan(0);
});
