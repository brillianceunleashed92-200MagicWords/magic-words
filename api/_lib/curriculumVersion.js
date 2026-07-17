// CURRICULUM_REPLACE_R1 follow-up — resolves which curriculum edition is
// live (public.app_config.active_curriculum_version) instead of every
// `words`/`word_progress` query implicitly reading whatever rows exist
// (migration 0040 added the column; nothing read it until this file).
//
// Deliberately NOT module-level-cached: this file is required by a Vercel
// serverless function, and a warm container can stay alive across many
// requests — caching the resolved value at module scope would mean an
// operator flipping the flag could silently keep serving the old
// curriculum to whichever containers happened to already have it cached,
// for an unbounded time. Resolved once per incoming request instead (see
// session-generator.js's handler, which calls this once and threads the
// result through every function that needs it) — cheap (one indexed
// single-row lookup) and always current.
async function getActiveCurriculumVersion(admin) {
  const { data, error } = await admin
    .from('app_config')
    .select('value')
    .eq('key', 'active_curriculum_version')
    .single();
  if (error || !data) {
    throw new Error(
      `[curriculumVersion] active_curriculum_version not found in app_config: ${error?.message ?? 'no row'}`
    );
  }
  return data.value;
}

module.exports = { getActiveCurriculumVersion };
