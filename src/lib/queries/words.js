import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

// The 200-word curriculum — public-read, effectively static (content only
// changes via a re-seed, never at runtime), so a long staleTime avoids
// re-fetching it on every screen mount.
export function useWordsQuery() {
  return useQuery({
    queryKey: ['words'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('words')
        .select('id, word, type, unit, sort_order, emoji, definition, audio_url, image_url')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
