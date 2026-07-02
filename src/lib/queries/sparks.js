import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

export function useSparksQuery(childId) {
  return useQuery({
    queryKey: ['sparks', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sparks')
        .select('balance, lifetime_earned')
        .eq('child_id', childId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { balance: 0, lifetime_earned: 0 };
    },
  });
}

// Earn Sparks via the earn_sparks() RPC (security definer) — the client
// can never write user_sparks directly, only request a positive grant for
// the currently-active child (the RPC resolves child_id server-side from
// the child_id argument, still checking the child belongs to auth.uid()).
export function useEarnSparksMutation(childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount) => {
      const { data, error } = await supabase.rpc('earn_sparks', { amount, p_child_id: childId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['sparks', childId], data);
    },
  });
}
