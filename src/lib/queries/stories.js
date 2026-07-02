import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

const STORY_STALE_DAYS = 6; // "New Story Friday" — surface a new story card once the newest is >6 days old

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
      const response = await fetch('/api/story-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childName, interests, masteredWords, targetWord }),
      });
      if (!response.ok) throw new Error(`story-engine returned ${response.status}`);
      const { story, validation } = await response.json();

      const { data, error } = await supabase
        .from('stories')
        .insert({
          child_id: childId,
          title: story.title,
          body: story.sentences,
          target_word: story.targetWord,
          vocabulary_used: story.vocabularyUsed,
        })
        .select()
        .single();
      if (error) throw error;

      return { row: data, validation, isFallback: !!story.isFallback };
    },
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
