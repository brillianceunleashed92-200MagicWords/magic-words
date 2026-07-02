import { useMutation } from '@tanstack/react-query';

// Opens the Stripe customer billing portal (api/create-portal-session.js)
// for an existing Family subscriber to manage/cancel their plan.
export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async ({ userId }) => {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
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
    mutationFn: async ({ userId, email, interval }) => {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, interval }),
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
