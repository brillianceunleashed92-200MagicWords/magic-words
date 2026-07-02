import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

export function useSparksQuery(userId) {
  return useQuery({
    queryKey: ['sparks', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sparks')
        .select('balance, lifetime_earned')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { balance: 0, lifetime_earned: 0 };
    },
  });
}

// Earn Sparks via the earn_sparks() RPC (security definer) — the client
// can never write user_sparks directly, only request a positive grant.
export function useEarnSparksMutation(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount) => {
      const { data, error } = await supabase.rpc('earn_sparks', { amount });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['sparks', userId], data);
    },
  });
}
