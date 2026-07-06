import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

export function useMagicMomentsQuery(childId) {
  return useQuery({
    queryKey: ['magicMoments', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('magic_moments')
        .select('id, kind, payload, created_at, shared_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Prompt 7 Part 6: Draw It's letter-tracing rebuild (Prompt 5) removed
// the old freeform canvas, and with it the only "content" a tracing
// completion produced (a drawn artifact) — this restores a lightweight
// content source for the Parent Portal's Moments feed. No Storage
// upload: there's no artifact to store, just a structured row (word +
// timestamp) that MomentsTab.jsx renders as a "Traced {word}!" card,
// using WordArt's own has_art/typographic fallback for the thumbnail
// rather than duplicating that logic here.
export function useAddTracingMomentMutation(childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (word) => {
      const { error } = await supabase
        .from('magic_moments')
        .insert({ child_id: childId, kind: 'tracing', payload: { word } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['magicMoments', childId] });
    },
  });
}

export function useMarkMomentSharedMutation(childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (momentId) => {
      const { error } = await supabase
        .from('magic_moments')
        .update({ shared_at: new Date().toISOString() })
        .eq('id', momentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['magicMoments', childId] });
    },
  });
}
