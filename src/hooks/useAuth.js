import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { queryClient } from '../lib/queryClient';

// Every piece of app-specific browser storage this codebase writes uses
// this prefix (session plan cache, per-child time-limit counters, parent
// digest cache, difficulty-governor log — see grep across src/lib for
// `mw_*` key constants). Swept on sign-out so a second family member
// signing in on the same shared device never has a stale trace of the
// previous account's cached data sitting in storage.
const APP_STORAGE_PREFIX = 'mw_';

function clearAppStorage(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(APP_STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((k) => storage.removeItem(k));
}

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
          // Fires on explicit sign-out AND on session expiry/invalidation —
          // both cases mean "this browser no longer represents this user,"
          // so both must clear cached data the same way.
          clearAppStorage(sessionStorage);
          clearAppStorage(localStorage);
          queryClient.clear();
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
