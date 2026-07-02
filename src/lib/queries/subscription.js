import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { FREE_TIER_MAX_CHILDREN, FAMILY_TIER_MAX_CHILDREN } from './childProfiles';

// No row = free tier (subscriptions rows only ever get created by
// api/stripe-webhook.js on a real checkout — see migration 0009).
export function useSubscriptionQuery(userId) {
  return useQuery({
    queryKey: ['subscription', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { plan: 'free', status: null, current_period_end: null };
    },
  });
}

export function maxChildrenForPlan(plan) {
  return plan === 'family' ? FAMILY_TIER_MAX_CHILDREN : FREE_TIER_MAX_CHILDREN;
}

// Phase 2 Step 6 — free tier plays Units 1-5, Family unlocks 6-18. Word
// `unit` values are 1-indexed (see supabase words seed).
export const FREE_TIER_MAX_UNIT = 5;

export function isUnitLocked(unit, plan) {
  return plan !== 'family' && unit > FREE_TIER_MAX_UNIT;
}
