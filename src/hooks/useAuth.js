// src/hooks/useAuth.js
// Drop-in auth management hook — replaces scattered auth logic in App.jsx
// Handles: session persistence, loading state, redirect logic, profile fetch

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [session, setSession]       = useState(undefined); // undefined = loading, null = logged out
  const [profile, setProfile]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError]   = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = row not found (new user)
      setProfile(data || null);
    } catch (err) {
      console.error('[useAuth] fetchProfile failed:', err.message);
      // Non-fatal — app still works without profile
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setAuthLoading(false);
    }).catch(() => {
      setSession(null);
      setAuthLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        setAuthError(null);

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          // Clear any cached session data
          sessionStorage.removeItem('mw_session_plan');
        }
        if (event === 'TOKEN_REFRESHED') {
          console.log('[useAuth] Token refreshed silently');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      setAuthError('Sign out failed. Please try again.');
    }
  }, []);

  return {
    session,
    profile,
    user: session?.user ?? null,
    isLoggedIn: !!session,
    isLoading: authLoading,           // true only during initial check
    authError,
    signOut,
  };
}