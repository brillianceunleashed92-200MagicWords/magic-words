import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

const STORY_STALE_DAYS = 6; // "New Story Friday" — surface a new story card once the newest is >6 days old

// FIX_STORY_QUALITY_R1 -- below this many real-mastered words, the
// freeform Story Engine has too little vocabulary to personalize from (a
// brand-new child's pool is [] -> a 1-word allowed set once the target
// word is added) and must not call the AI at all -- see StoryScreen.jsx's
// mount effect, which serves story_catalog / the local deterministic
// template instead below this floor.
export const MIN_MASTERED_WORDS_FOR_GENERATION = 4;

async function insertStoryRow(childId, { title, sentences, targetWord, vocabularyUsed }) {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      child_id: childId,
      title,
      body: sentences,
      target_word: targetWord,
      vocabulary_used: vocabularyUsed ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Fire-and-forget scaffold-down telemetry, same event type + endpoint
// PlayScreen.jsx already uses for a different degraded-experience trigger
// (api/track.js's EVENT_SCHEMAS.scaffold_down accepts {word, activityId},
// no schema change needed) -- reused here rather than adding a new
// product_events type, per the 0035/0036 lesson that an unlisted type
// bounces silently off the CHECK constraint behind a 200.
async function reportStoryFallback(word) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    await fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ eventType: 'scaffold_down', payload: { word, activityId: 'story_engine' } }),
    });
  } catch (err) {
    console.error('[story-engine fallback telemetry]', err.message);
  }
}

export function useStoriesQuery(childId) {
  return useQuery({
    queryKey: ['stories', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, body, target_word, vocabulary_used, created_at, read_at, audio_url')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// True once the newest story is missing or older than STORY_STALE_DAYS —
// drives the Home "New Story Friday" card. Generation itself is on-demand
// (no cron), per the master prompt.
export function isNewStoryDue(stories) {
  if (!stories?.length) return true;
  const newest = new Date(stories[0].created_at);
  const ageDays = (Date.now() - newest.getTime()) / 86400000;
  return ageDays > STORY_STALE_DAYS;
}

// Generates a story via api/story-engine.js, then persists it. childName/
// interests/masteredWords are passed in by the caller (already loaded via
// useCandyGalaxyData) rather than this hook re-fetching them.
export function useGenerateStoryMutation(childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childName, interests, masteredWords, targetWord }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/story-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ childName, interests, masteredWords, targetWord }),
      });
      if (!response.ok) throw new Error(`story-engine returned ${response.status}`);
      const { story, validation } = await response.json();

      if (story.isFallback) reportStoryFallback(story.targetWord);

      const data = await insertStoryRow(childId, {
        title: story.title,
        sentences: story.sentences,
        targetWord: story.targetWord,
        vocabularyUsed: story.vocabularyUsed,
      });

      return { row: data, validation, isFallback: !!story.isFallback };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', childId] });
    },
  });
}

// FIX_STORY_QUALITY_R1 -- serves pre-authored story_catalog (or the
// deterministic local template) content through the same `stories` row
// shape, with NO api/story-engine call at all -- used when the child's
// mastered-word pool is below MIN_MASTERED_WORDS_FOR_GENERATION. Not a
// "failure" path (no reportStoryFallback call): this is the intended
// route for a sparse-vocabulary child, not a degraded outcome.
export function useServeCatalogStoryMutation(childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, sentences, targetWord, vocabularyUsed }) =>
      insertStoryRow(childId, { title, sentences, targetWord, vocabularyUsed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', childId] });
    },
  });
}

export function useMarkStoryReadMutation(childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId) => {
      const { error } = await supabase
        .from('stories')
        .update({ read_at: new Date().toISOString() })
        .eq('id', storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', childId] });
    },
  });
}
