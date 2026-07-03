import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

// Both endpoints derive the caller's identity from a verified Supabase
// JWT server-side (security hardening — previously trusted a
// client-supplied `userId` in the request body, which let anyone request
// a billing-portal session for, or attach a checkout to, an arbitrary
// account by just knowing/guessing its UUID). The server now ignores any
// userId in the body entirely.
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}` };
}

// Opens the Stripe customer billing portal (api/create-portal-session.js)
// for an existing Family subscriber to manage/cancel their plan.
export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `create-portal-session returned ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}

// Starts a Stripe Checkout Session (api/create-checkout-session.js) and
// redirects the browser to it — Stripe's own hosted page handles card
// entry, not this app (never touches raw card data).
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async ({ email, interval }) => {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ email, interval }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `create-checkout-session returned ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}
