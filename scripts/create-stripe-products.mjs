// scripts/create-stripe-products.mjs
// Phase 2 Step 6 — creates the Family plan Product + two Prices ($9.99/mo,
// $79/yr) in Stripe TEST MODE. Idempotent: reuses an existing product
// with the same name and existing prices with the same amount/interval
// instead of creating duplicates on re-run.
//
// Usage: node --env-file=.env.local scripts/create-stripe-products.mjs
//
// Requires STRIPE_SECRET_KEY in the environment — refuses to run against
// a live key as a safety check (this script is for one-time test-mode
// setup, not something that should ever touch production billing).

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error('Missing STRIPE_SECRET_KEY'); process.exit(1); }
if (!key.startsWith('sk_test_')) {
  console.error('STRIPE_SECRET_KEY is not a test-mode key (must start with sk_test_) — refusing to run.');
  process.exit(1);
}

const stripe = new Stripe(key);

const PRODUCT_NAME = '200 Magic Words — Family Plan';

async function findOrCreateProduct() {
  const existing = await stripe.products.search({ query: `name:"${PRODUCT_NAME}" AND active:"true"` });
  if (existing.data.length > 0) {
    console.log(`Reusing existing product: ${existing.data[0].id}`);
    return existing.data[0];
  }
  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'Unlocks Units 6-18 and all 5 game types for every child on the account.',
  });
  console.log(`Created product: ${product.id}`);
  return product;
}

async function findOrCreatePrice(productId, { amount, interval, nickname }) {
  const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = existingPrices.data.find(
    (p) => p.unit_amount === amount && p.recurring?.interval === interval
  );
  if (match) {
    console.log(`Reusing existing price (${nickname}): ${match.id}`);
    return match;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: 'usd',
    recurring: { interval },
    nickname,
  });
  console.log(`Created price (${nickname}): ${price.id}`);
  return price;
}

async function main() {
  const product = await findOrCreateProduct();
  const monthly = await findOrCreatePrice(product.id, { amount: 999, interval: 'month', nickname: 'Family Monthly' });
  const yearly = await findOrCreatePrice(product.id, { amount: 7900, interval: 'year', nickname: 'Family Yearly' });

  console.log('\n--- Add these to .env.local and Vercel ---');
  console.log(`STRIPE_PRICE_FAMILY_MONTHLY=${monthly.id}`);
  console.log(`STRIPE_PRICE_FAMILY_YEARLY=${yearly.id}`);
}

main();
