import PolicyPage, { H2, P, UL, LI } from './PolicyPage';

// LEGAL_PAGES_R1 — rendered verbatim from docs/200MW_refund_policy_PUBLISH.md.
// See PrivacyPolicy.jsx's header comment for the token-substitution and
// counsel-redline conventions; identical here.
const EMAIL = 'DrMarionsFormula@gmail.com';
const EFFECTIVE_DATE = 'July 6, 2026';

export default function RefundPolicy() {
  return (
    <PolicyPage title="Cancellation & Refund Policy" effectiveDate={EFFECTIVE_DATE}>
      <P>
        We want cancelling to be as easy as subscribing. No phone calls, no chat
        queues, no hoops. This policy is part of our Terms of Service.
      </P>

      <H2 id="how-to-cancel">How to Cancel</H2>
      <P>
        <strong>Online (fastest):</strong> Log in → <strong>Settings → Manage
        subscription</strong> → Cancel. This opens your secure billing portal; two
        clicks and you're done, with an email confirming the cancellation.
      </P>
      <P>
        <strong>By email:</strong> Send a request to {EMAIL} from your account's
        email address. We'll process it within 3 business days and confirm by
        email.
      </P>

      <H2 id="what-happens-when-you-cancel">What Happens When You Cancel</H2>
      <UL>
        <LI>Your subscription stays active until the <strong>end of the billing period you already paid for</strong> — your child keeps full access until then.</LI>
        <LI><strong>No further charges</strong> after that. Auto-renewal simply stops.</LI>
        <LI>We don't prorate or refund the unused part of a billing period, except as described below or where the law requires.</LI>
        <LI>Your account remains on the free tier afterward. Your child's progress is kept per our Privacy Policy's retention schedule, so you can resubscribe later without losing it — or delete everything instantly with the <strong>Delete account</strong> control in Settings.</LI>
      </UL>

      <H2 id="refunds">Refunds</H2>
      <UL>
        <LI><strong>First purchase guarantee:</strong> if 200 Magic Words isn't right for your family, email us within 7 days of your <strong>first</strong> payment and we'll refund it in full — no questions asked.</LI>
        <LI><strong>Annual plans:</strong> a full refund is available within 14 days of the initial annual charge. Annual <strong>renewals</strong> are refundable if requested within 7 days of the renewal charge.</LI>
        <LI><strong>Billing errors and duplicates:</strong> always refunded promptly — just email us.</LI>
        <LI>Refunds go back to the original payment method, typically within 5–10 business days depending on your bank.</LI>
      </UL>

      <H2 id="renewals-and-price-changes">Renewals and Price Changes</H2>
      <UL>
        <LI>Subscriptions renew automatically at the price shown at checkout until you cancel.</LI>
        <LI><strong>Annual subscribers</strong> receive a reminder email 30 days before each renewal.</LI>
        <LI>If a price ever changes, we'll email you at least 30 days in advance, and the new price applies only from your next renewal — cancel before then and you'll never pay it.</LI>
      </UL>

      <H2 id="questions">Questions</H2>
      <P>{EMAIL} — a human reads every message, usually within one business day.</P>
    </PolicyPage>
  );
}
