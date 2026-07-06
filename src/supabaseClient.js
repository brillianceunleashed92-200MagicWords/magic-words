import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loudly instead of silently falling back to the production project.
// There used to be a hardcoded prod URL/anon-key fallback here — every local
// run with no .env configured silently wrote to the live production
// Supabase project as a result (documented gap, CLAUDE.md "Known soft
// spot"). Missing env vars are now a hard startup error: set
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in .env.local (see .env.example),
// or Vercel Environment Variables in production.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[supabase] Missing env vars — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is undefined. " +
    "Copy .env.example to .env.local and fill in real values, or set Vercel Environment Variables in production."
  );
}

// feat/auth-r1 Phase 1 — PKCE flow, isolated as its own change before any
// feature code. Required for the password-reset/update-password flow
// (Phase 3): the recovery redirect lands with a `code` query param that
// only PKCE's flow (via detectSessionInUrl, on by default) exchanges for
// a session automatically. The implicit flow's #access_token hash
// fragment approach still works for normal sign-in, but PKCE is
// Supabase's own current recommendation for SPAs and is required for the
// recovery link to establish a session client-side with no backend route
// (this app has none) — confirmed against current Supabase docs, not
// assumed from memory.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
});