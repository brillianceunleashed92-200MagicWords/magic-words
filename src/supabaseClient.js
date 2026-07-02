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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);