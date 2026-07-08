import { useCallback } from 'react';
import { supabase } from '../../supabaseClient';

// Prompt 9 launch analytics — the one client-originated event
// (paywall_viewed). Fire-and-forget: a tracking call failing must never
// affect the actual UI the parent is looking at, so this never throws and
// never shows an error state.
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

// Exported (not module-private) — FEAT_QUICK_WINS_R1's streak-freeze
// grant/use events need a childId in the body (api/track.js verifies
// ownership server-side, same pattern as PlayScreen.jsx's inline
// scaffold_down fetch), which paywall_viewed never needed.
export async function track(eventType, payload, childId) {
  const auth = await authHeader();
  if (!auth) return;
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ eventType, payload, ...(childId ? { childId } : {}) }),
    });
  } catch {
    // Fire-and-forget — a tracking failure is never surfaced to the parent.
  }
}

// Dedup rule: once per browser session per surface (sessionStorage, not
// localStorage — a fresh session should be able to re-report a view, but a
// single visit re-rendering the same banner on every re-render/tab-switch
// should not).
export function usePaywallViewedTracker() {
  return useCallback((surface) => {
    const key = `mw_paywall_viewed:${surface}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    track('paywall_viewed', { surface });
  }, []);
}
