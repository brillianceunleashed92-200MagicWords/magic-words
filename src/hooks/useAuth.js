import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [session, setSession]     = useState(undefined);
  const [profile, setProfile]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Hard timeout — if Supabase never responds, stop spinning after 5 seconds
    const timeout = setTimeout(() => {
      console.error('[useAuth] Supabase getSession timed out after 5s');
      setSession(null);
      setAuthLoading(false);
    }, 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        setSession(session ?? null);
        setAuthLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('[useAuth] getSession error:', err);
        setSession(null);
        setAuthLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session ?? null);
        setAuthError(null);
        if (!session) {
          setProfile(null);
          sessionStorage.removeItem('mw_session_plan');
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    profile,
    user:      session?.user ?? null,
    isLoggedIn: !!session,
    isLoading:  authLoading,
    authError,
    signOut,
  };
}