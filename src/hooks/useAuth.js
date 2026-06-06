import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [session, setSession]         = useState(undefined);
  const [profile, setProfile]         = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError]     = useState(null);

  useEffect(() => {
    let initialResolved = false;

    // Hard fallback — if INITIAL_SESSION never fires, stop spinning after 5s
    const timeout = setTimeout(() => {
      if (!initialResolved) {
        console.error('[useAuth] INITIAL_SESSION timed out after 5s');
        setSession(null);
        setAuthLoading(false);
      }
    }, 5000);

    // onAuthStateChange fires INITIAL_SESSION synchronously with any stored session
    // from localStorage — this is the correct way to restore auth on reopen.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'INITIAL_SESSION') {
          clearTimeout(timeout);
          initialResolved = true;
          setSession(newSession ?? null);
          setAuthLoading(false);
        } else {
          setSession(newSession ?? null);
          setAuthError(null);
        }
        if (!newSession) {
          setProfile(null);
          sessionStorage.removeItem('mw_session_plan_v2');
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
    user:       session?.user ?? null,
    isLoggedIn: !!session,
    isLoading:  authLoading,
    authError,
    signOut,
  };
}
