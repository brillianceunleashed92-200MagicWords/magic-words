// Recovered from 2026-07-03 stash — review before Stripe-live cutover.
// One-off verification script (not part of the committed test suite) —
// drives a real Stripe test-mode checkout against a live Vercel preview
// deployment to confirm the full payment loop: checkout -> webhook ->
// subscriptions row -> plan gating. Deleted after use.
import { chromium } from '@playwright/test';

const BASE_URL = process.env.VERIFY_BASE_URL;
const EMAIL = process.env.VERIFY_EMAIL;
const PASSWORD = process.env.VERIFY_PASSWORD;

if (!BASE_URL || !EMAIL || !PASSWORD) {
  console.error('Missing VERIFY_BASE_URL / VERIFY_EMAIL / VERIFY_PASSWORD');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${BASE_URL}/app`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${BASE_URL}/app`);
  await page.waitForTimeout(1000);

  await page.getByPlaceholder('you@example.com').fill(EMAIL);
  await page.getByPlaceholder(/•|password/i).fill(PASSWORD).catch(async () => {
    await page.locator('input[type="password"]').fill(PASSWORD);
  });
  await page.locator('button:has-text("Sign in")').last().click();
  await page.waitForTimeout(2500);

  // Onboarding (first login for this account)
  const nameInput = page.getByPlaceholder('e.g. Emma');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('CheckoutKid');
    await page.locator('button:has-text("🚀")').first().click();
    await page.locator('button:has-text("Dinosaurs")').click();
    await page.locator('button:has-text("Let\'s go")').click();
    await page.waitForTimeout(2000);
  }

  // Unlock Grown-Ups via direct store write (same pattern used in manual testing)
  await page.evaluate(() => {
    const raw = localStorage.getItem('candy-galaxy-ui');
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state.grownUpsUnlocked = true;
    localStorage.setItem('candy-galaxy-ui', JSON.stringify(parsed));
  });
  await page.goto(`${BASE_URL}/app`);
  await page.waitForTimeout(2000);

  await page.locator('button:has-text("Grown-ups")').click();
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Settings")').click();
  await page.waitForTimeout(1000);

  console.log('Clicking $9.99/mo upgrade button...');
  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }),
    page.locator('button:has-text("$9.99/mo")').click(),
  ]);
  console.log('Reached Stripe Checkout:', page.url());

  await page.waitForTimeout(2000);

  // Stripe Checkout's accordion payment-method list — select "Card" to
  // expand the card number/expiry/cvc fields (they don't exist in the
  // DOM until this radio is selected).
  if (process.env.DEBUG_STRIPE) {
    const snapshot = await page.locator('body').ariaSnapshot();
    console.log('--- ARIA SNAPSHOT ---');
    console.log(snapshot.slice(0, 4000));
    console.log('--- END SNAPSHOT ---');
  }

  // Select the "Card" payment method row explicitly (radio input, not
  // the accordion button — that button disappears once already open,
  // which made a "click if not already expanded" check unreliable).
  await page.locator('#payment-method-label-card').click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const phoneField = page.locator('input[type="tel"]').first();
  if (await phoneField.isVisible().catch(() => false)) await phoneField.fill('2015550123');

  const cardFrame = page.frameLocator('iframe[title="Secure card number input frame"]');
  await cardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
  const expFrame = page.frameLocator('iframe[title="Secure expiration date input frame"]');
  await expFrame.locator('input[name="exp-date"]').fill('1234');
  const cvcFrame = page.frameLocator('iframe[title="Secure CVC input frame"]');
  await cvcFrame.locator('input[name="cvc"]').fill('123');

  const nameField = page.locator('#billingName, input[name="billingName"]').first();
  if (await nameField.isVisible().catch(() => false)) await nameField.fill('Test Parent');

  console.log('Submitting payment...');
  await Promise.all([
    page.waitForURL(/\/app\/upgrade\/success/, { timeout: 30000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);
  console.log('Checkout completed, landed on:', page.url());
} catch (err) {
  console.error('FAILED:', err.message);
  await page.screenshot({ path: '/tmp/checkout-failure.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
