import { supabase } from '../supabaseClient';

// CURRICULUM_REPLACE_R1 follow-up — resolves which curriculum edition is
// live (public.app_config.active_curriculum_version) instead of every
// `words`/`word_progress` query implicitly reading whatever rows exist
// (migration 0040 added the column; nothing read it until this file).
//
// Module-level cache, deliberately: unlike the server-side resolver
// (api/_lib/curriculumVersion.js), a browser tab is a single page load,
// not a long-lived warm container reused across unrelated users/requests
// — caching for "this load" is exactly the scope the task asked for, and
// avoids re-querying app_config on every words/word_progress fetch. A
// full page reload always re-resolves, so an operator's flag flip is
// visible on next load, never permanently stale.
let cached = null;
let pending = null;

export async function getActiveCurriculumVersion() {
  if (cached) return cached;
  if (!pending) {
    pending = supabase
      .from('app_config')
      .select('value')
      .eq('key', 'active_curriculum_version')
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          throw error ?? new Error('active_curriculum_version not found in app_config');
        }
        cached = data.value;
        return cached;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

// Test-only escape hatch — resets the module-level cache between test
// cases so a test can simulate a fresh page load with a different flag
// value, without this module's cache leaking state across tests.
export function __resetCurriculumVersionCacheForTests() {
  cached = null;
  pending = null;
}
