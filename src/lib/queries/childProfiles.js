import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

export const FREE_TIER_MAX_CHILDREN = 1;
export const FAMILY_TIER_MAX_CHILDREN = 4;

export function useChildProfilesQuery(parentUserId) {
  return useQuery({
    queryKey: ['childProfiles', parentUserId],
    enabled: !!parentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('id, name, age, avatar, interests, created_at, placement_unit, placement_completed_at')
        .eq('parent_id', parentUserId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// maxChildren is passed in by the caller (derived from subscription plan —
// see useSubscriptionQuery) rather than hardcoded here, so the limit stays
// in one place (the plan check) instead of being duplicated.
export function useCreateChildProfileMutation(parentUserId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, avatar, interests }) => {
      const { data, error } = await supabase
        .from('child_profiles')
        .insert({ parent_id: parentUserId, name, avatar, interests })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childProfiles', parentUserId] });
    },
  });
}
