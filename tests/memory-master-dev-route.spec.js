import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// MEMORY_MASTER_R1 Phase 4 -- the flagged dev route itself. This worktree's
// .env.local sets VITE_MEMORY_MASTER_ENABLED="true" so the Playwright
// webServer's dev build ships the module (see MemoryMasterDevRoute.jsx's
// own comment on import.meta.env inlining at server start -- toggling the
// flag off to test the 404 path needs a server restart, done separately as
// part of Phase 6's live walk, not here).

test("the flagged route renders the module when the flag is on", async ({ page }) => {
  await page.goto("/memory-master-dev");
  await expect(page.getByText("Memory Master", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Word Journey", { exact: false })).toBeVisible();
});

test("entering the module reaches the intro screen", async ({ page }) => {
  await page.goto("/memory-master-dev");
  await page.getByText("Read it. Remember it. Write it.", { exact: false }).click();
  await expect(page.getByText("Read it. Remember it. Write it exactly.", { exact: false })).toBeVisible();
});

test("the practice corner is reachable from home and is off-path (shows the answer on a miss)", async ({ page }) => {
  await page.goto("/memory-master-dev");
  await page.getByText("Practice corner", { exact: false }).click();
  await expect(page.getByText("Fix this sentence", { exact: false })).toBeVisible();
  // First item's wrong option ("some", lowercase) -- practice is allowed to
  // show the fix on a miss, unlike any real trial screen.
  await page.getByRole("button", { name: "some", exact: true }).click();
  await expect(page.getByText("Look - it goes like this", { exact: false })).toBeVisible();
});

// Structural proof (not a runtime trace, to avoid false positives from
// legitimate single-letter WORDS like "A"/"I" in tap-to-hear): the custom
// keyboard component that drives every keystroke in this module has no
// access to a speak function at all, so a per-letter TTS call is not just
// unused but structurally impossible from this component.
test("no per-letter TTS: the custom Keyboard component never calls speak() and has no speak prop", () => {
  const source = readFileSync("src/screens/memorymaster/Keyboard.jsx", "utf8");
  expect(source).not.toMatch(/\bspeak\s*\(/);
  expect(source).not.toMatch(/\bspeak\b\s*[,}]/); // no `speak` destructured from props either
});
