import { QueryClient } from '@tanstack/react-query';

// Server-state cache shared by every Candy Galaxy query hook. `words` is
// near-static content (staleTime set per-query, not here) while progress/
// sparks/streaks are per-user and refetch on window focus like normal.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
