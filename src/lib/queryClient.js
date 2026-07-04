import { QueryClient, MutationCache } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

// Postgres foreign_key_violation SQLSTATE — surfaces when a mutation
// writes a row referencing parent_id/user_id for an auth.users row that
// no longer exists. Confirmed live: a browser can hold a locally-
// valid-looking JWT for an account deleted server-side (heavy
// test-account churn during development, but a real risk for any
// account deleted while a session is open elsewhere) — the JWT decodes
// fine client-side, so nothing rejects the request until Postgres's own
// FK check does, deep inside whatever mutation happened to run first.
// Global catch here (rather than per-mutation try/catch) means every
// current and future mutation gets this handling for free, not just the
// one that happened to surface it first.
const FK_VIOLATION = '23503';

// Session/auth code (src/hooks/useAuth.js) listens for this to show a
// friendly "please sign in again" message — a plain window event instead
// of a prop/import cycle since this module can't depend on a React hook.
function handleInvalidSession() {
  window.dispatchEvent(new CustomEvent('mw:invalid-session'));
  supabase.auth.signOut();
}

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
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error?.code === FK_VIOLATION) handleInvalidSession();
    },
  }),
});
