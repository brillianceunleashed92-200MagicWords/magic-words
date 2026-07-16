// Placement Adventure (Prompt 8) v1 -- INTENTIONALLY UNROUTED as of
// STAR_CHECK_R1 (2026-07-13). PlacementAdventureScreen.jsx itself is
// untouched and still functional (kept in the tree as a rollback
// affordance, per that run's non-negotiables), but CandyGalaxyShell.jsx's
// 'adventure' placementFlow branch now renders StarCheckScreen.jsx (v2,
// mockup O) instead -- neither of v1's two entry points (new-child
// onboarding's PlacementChoiceScreen, or SettingsTab's "Retake placement")
// reaches this screen anymore.
//
// This file previously held 3 UI-driving Playwright specs (beginner-path
// skip, full-persona ladder completion, measurement-exception tone
// parity) that all asserted on PlacementAdventureScreen-only copy/flow
// via the real entry points above. Every one of them would now fail
// against a screen the app no longer routes to -- not because v1 broke,
// but because it's no longer reachable, which is the intended outcome of
// this run. None of the 3 had a "direct API, not UI" half to preserve
// (confirmed by STAR_CHECK_REPORT.md's Phase 1 recon) -- there was
// nothing to split off.
//
// Equivalent (and broader) coverage now lives in tests/star-check.spec.js
// against the real v2 entry points: beginner-path skip, a full clean
// sweep, a forced two-miss floor, the measurement-exception tone-parity
// check, plus unit tests for the item bank/routing/icons that v1 never
// had. Net Playwright test count: -3 here, +6 live specs there (net +3),
// not counting star-check.spec.js's 25 additional pure-function unit
// tests -- coverage did not drop.
//
// The underlying placementMode server path (api/session-generator.js's
// handlePlacement) is untouched and still exercised directly by
// scripts/idor-proof.mjs's forged-token/cross-mode checks.
