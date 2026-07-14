import { test, expect } from "@playwright/test";

// FIX_EVENTS_PURGE_R1 — proves product_events actually gets purged when an
// account is deleted (migration 0040 added ON DELETE CASCADE on both
// user_id -> auth.users and child_id -> child_profiles; the table
// previously had no FK of any kind, see docs/EVENTS_PURGE_REPORT.md).
// Same production-only convention as placement-checkin.spec.js /
// star-check.spec.js's live tests -- local Vite serves no /api routes.
test.use({ baseURL: process.env.DEPLOY_BASE_URL || "https://200magicwordsapp.com" });

const SUPABASE_URL = "https://ozhqsaysltiamadpcruz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PASSWORD = "TestPass!23456";
const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function provisionAccount(prefix) {
  const email = `nextgenprecisiondrones+${prefix}${Date.now()}@gmail.com`;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { parental_consent: true, parental_consent_at: new Date().toISOString() } }),
  });
  const user = await userRes.json();
  const childRes = await fetch(`${SUPABASE_URL}/rest/v1/child_profiles`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ parent_id: user.id, name: "CascadeKid", interests: [] }),
  });
  const [child] = await childRes.json();
  return { email, userId: user.id, childId: child.id };
}

async function signIn(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json();
  return body.access_token;
}

async function queryEvents(field, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/product_events?${field}=eq.${value}&select=event_type,payload`, { headers: adminHeaders });
  return res.json();
}

async function deleteViaAdminApi(userId) {
  if (!SERVICE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders }).catch(() => {});
}

// Drives a real Star Check to a two-miss floor (fastest path to a real
// placement_completed row with per_word detail) via the real, JWT-authed
// starCheckMode endpoint -- same mechanism STAR_CHECK_R1 verified.
async function generateRealEvents(baseURL, token, childId) {
  async function callStarCheck(body) {
    const res = await fetch(`${baseURL}/api/session-generator`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ childId, starCheckMode: true, ...body }),
    });
    return res.json();
  }
  let state = await callStarCheck({});
  for (const _ of ["kid", "kid", "girl", "girl"]) {
    state = await callStarCheck({ ladderState: state.starCheck.ladderState, answer: false });
  }
  await fetch(`${baseURL}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eventType: "scaffold_down", childId, payload: { word: "cat", activityId: "word_match" } }),
  });
  return state.starCheck;
}

test("product_events: placement_completed (with per_word) and a tracked scaffold_down both land correctly (positive-landing regression, post-FK)", async ({ baseURL }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId, childId } = await provisionAccount("mwcascadeland");
  try {
    const token = await signIn(email);
    const finalState = await generateRealEvents(baseURL, token, childId);
    expect(finalState.done).toBe(true);

    let rows = [];
    for (let i = 0; i < 15 && rows.length < 3; i++) {
      rows = await queryEvents("user_id", userId);
      if (rows.length < 3) await new Promise((r) => setTimeout(r, 1000));
    }
    const types = rows.map((r) => r.event_type).sort();
    expect(types).toEqual(["placement_completed", "placement_started", "scaffold_down"]);
    const completed = rows.find((r) => r.event_type === "placement_completed");
    expect(completed.payload.mode).toBe("star_check_v1");
    expect(Array.isArray(completed.payload.per_word)).toBe(true);
    expect(completed.payload.per_word.length).toBeGreaterThan(0);
  } finally {
    await deleteViaAdminApi(userId);
  }
});

test("product_events: deleting the account via the REAL user-facing path leaves ZERO attributable rows (cascade integrity)", async ({ baseURL }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId, childId } = await provisionAccount("mwcascadedel");
  let deletedViaRealPath = false;
  try {
    const token = await signIn(email);
    await generateRealEvents(baseURL, token, childId);

    // Positive check BEFORE deletion -- events actually landed, not a
    // vacuous "zero rows found either way" pass.
    let beforeRows = [];
    for (let i = 0; i < 15 && beforeRows.length < 2; i++) {
      beforeRows = await queryEvents("user_id", userId);
      if (beforeRows.length < 2) await new Promise((r) => setTimeout(r, 1000));
    }
    expect(beforeRows.length).toBeGreaterThanOrEqual(2);

    // Delete via the REAL deletion path (api/delete-account.js), never
    // the Supabase Admin API directly -- that bypass is exactly what
    // Phase 1 found causes 96% of this table's orphans.
    const deleteRes = await fetch(`${baseURL}/api/delete-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    expect(deleteRes.status).toBe(200);
    deletedViaRealPath = true;

    // Poll for a while -- the migration's FK should make this durably
    // zero regardless of any fire-and-forget write still in flight at
    // delete-time (Phase 1's live-reproduced race).
    let afterRows = [{}];
    for (let i = 0; i < 10 && afterRows.length > 0; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      afterRows = await queryEvents("user_id", userId);
    }
    expect(afterRows).toEqual([]);
    const afterByChild = await queryEvents("child_id", childId);
    expect(afterByChild).toEqual([]);
  } finally {
    if (!deletedViaRealPath) await deleteViaAdminApi(userId);
  }
});

// THE deterministic test of the migration's own guarantee. Phase 1 found
// api/delete-account.js's own app-level purge already works correctly in
// the common case (the test above passes even pre-migration) -- so it
// cannot be the thing that proves this fix. The actual, dominant,
// 96%-of-the-table source of orphans is every deletion that bypasses that
// endpoint entirely (scripts/admin-user.mjs, idor-proof.mjs, every
// self-provisioning Playwright spec, a real support engineer using the
// Supabase dashboard). This test reproduces exactly that: delete via the
// raw Supabase Admin API, never touching api/delete-account.js at all, and
// asserts zero rows survive -- only possible if the FK/cascade itself
// (not any application code) is doing the work. Fails deterministically
// pre-migration (0040), passes deterministically post-migration.
test("product_events: deletion that bypasses application code entirely (raw Admin API, no api/delete-account call) still leaves ZERO attributable rows once the DB-level cascade exists", async ({ baseURL }) => {
  test.skip(!SERVICE_KEY, "requires SUPABASE_SERVICE_ROLE_KEY");
  test.setTimeout(60000);
  const { email, userId, childId } = await provisionAccount("mwcascadebypass");
  const token = await signIn(email);
  await generateRealEvents(baseURL, token, childId);

  let beforeRows = [];
  for (let i = 0; i < 15 && beforeRows.length < 2; i++) {
    beforeRows = await queryEvents("user_id", userId);
    if (beforeRows.length < 2) await new Promise((r) => setTimeout(r, 1000));
  }
  expect(beforeRows.length).toBeGreaterThanOrEqual(2);

  // Bypass api/delete-account.js entirely -- the same raw Admin API call
  // scripts/admin-user.mjs's own `delete` command makes.
  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
  expect(delRes.status).toBe(200);

  const afterRows = await queryEvents("user_id", userId);
  const afterByChild = await queryEvents("child_id", childId);
  expect(afterRows).toEqual([]);
  expect(afterByChild).toEqual([]);
});
