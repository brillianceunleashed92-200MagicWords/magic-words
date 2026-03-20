import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[supabase] Missing env vars — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is undefined. " +
    "Check your .env file locally, or Vercel Environment Variables in production."
  );
}

// Guard against empty-string URL which creates a permanently broken client
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://ozhqsaysltiamadpcruz.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aHFzYXlzbHRpYW1hZHBjcnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTgyMDUsImV4cCI6MjA4OTM3NDIwNX0.zI-rFuZTCoSRUIY6HE-bukia7-IvIgBdwy7HNAJkxBA");