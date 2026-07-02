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
