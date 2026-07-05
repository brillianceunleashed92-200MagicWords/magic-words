import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  // Several specs provision their own Supabase test account via the admin
  // API (smoke, fill-the-story, tracing) — `fullyParallel: false` only
  // serializes tests *within* a file, so separate spec files still ran as
  // separate parallel workers by default, contending on account
  // provisioning and intermittently stalling (docs/FILL_THE_STORY_REPORT.md
  // NOTES). Pinning `workers: 1` here (not a `--workers=1` CLI flag the
  // gate would have to remember to pass) is the least invasive fix for a
  // suite this size — splitting provisioning vs. non-provisioning specs
  // into separate Playwright "projects" would remove the contention while
  // running the no-emoji-live spec in parallel, but adds real config
  // surface for a marginal speed gain on a 7-spec suite.
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5183",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5183",
    url: "http://localhost:5183",
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
