import PolicyPage, { H2, P } from './PolicyPage';

// LEGAL_PAGES_R1 — rendered verbatim from docs/200MW_terms_of_service_PUBLISH.md.
// See PrivacyPolicy.jsx's header comment for the token-substitution and
// counsel-redline conventions; identical here. No free-trial paragraph
// inserted (Sal's Phase-0 answer 5: no trial confirmed at launch).
const ENTITY = 'Dr Marions Formula LLC';
const ADDRESS = '[Address pending — Sal to provide]';
const PHONE = '[Phone pending — Sal to provide]';
const EMAIL = 'DrMarionsFormula@gmail.com';
const EFFECTIVE_DATE = 'July 6, 2026';

export default function TermsOfService() {
  return (
    <PolicyPage title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <P>
        These Terms of Service ("Terms") are an agreement between you and {ENTITY}{' '}
        ("200 Magic Words," "we," "us") governing your use of the 200 Magic Words
        website and application at 200magicwordsapp.com (the "Service").{' '}
        <strong>By creating an account or using the Service, you agree to these
        Terms and to our Privacy Policy.</strong> If you do not agree, do not use
        the Service.
      </P>

      <H2 id="section-1">1. Who May Use the Service</H2>
      <P>
        You must be at least 18 and legally able to enter this agreement to create
        an account. You may create your account with an email address and
        password, or by signing in with Google; either way, these Terms and the
        parental-consent requirements in Section 2 apply in full. The learning
        experience is designed for children, who may use the Service{' '}
        <strong>only</strong> through a child profile inside a parent or legal
        guardian's account, with that parent's consent and supervision. You are
        responsible for all activity under your account, including your child's
        use, and for keeping your login credentials secure. The Service is offered
        for personal, non-commercial, household use in the United States.
      </P>

      <H2 id="section-2">2. Parental Consent for Children's Data</H2>
      <P>
        Before a child profile can be used, we require verifiable parental consent
        as described in our Privacy Policy, which explains exactly what we collect
        from children, how we use it, and your rights to review and delete it.
        Your rights over your child's information are set out there and are not
        limited by anything in these Terms.
      </P>

      <H2 id="section-3">3. Your License to Use the Service</H2>
      <P>
        We grant you a limited, personal, non-exclusive, non-transferable,
        revocable license to use the Service for its intended purpose. You agree
        not to: share, resell, or sublicense access; copy, scrape, or download
        curriculum content, audio, artwork, or software except as the Service
        allows; reverse engineer or attempt to extract source code; probe,
        disrupt, overload, or circumvent security or access controls or usage
        limits; use automated tools to access the Service; misrepresent your
        identity or a child's age; or use the Service in violation of law.
      </P>

      <H2 id="section-4">4. Subscriptions, Billing, and Auto-Renewal</H2>
      <P>
        <strong>Plans and pricing.</strong> The Service offers a free tier and paid
        subscription plans. The plan, price, and billing period are stated at
        checkout.
      </P>
      <P>
        <strong>AUTO-RENEWAL — PLEASE READ.</strong> Paid subscriptions{' '}
        <strong>automatically renew</strong> at the end of each billing period
        (monthly or annual, as selected at checkout), and the payment method you
        provide will be <strong>charged the then-current price at the start of
        each new period, until you cancel</strong>. You may cancel at any time as
        described in Section 5, and cancellation stops all future charges. By
        subscribing, you expressly consent to these recurring charges. We will
        send a confirmation of your subscription terms after purchase, including
        how to cancel. Annual subscribers receive a reminder email 30 days before
        each renewal.
      </P>
      <P>
        <strong>Price changes.</strong> We may change subscription prices with at
        least 30 days' advance email notice; changes take effect at your next
        renewal. If you don't agree, cancel before the renewal and you won't be
        charged the new price.
      </P>
      <P>
        <strong>Payment processing.</strong> Payments are processed by Stripe.
        Failed renewal payments may be retried; if payment cannot be collected, we
        may downgrade the account to the free tier.
      </P>
      <P><strong>Taxes.</strong> Prices may be subject to applicable taxes, shown at checkout where required.</P>

      <H2 id="section-5">5. Cancellation and Refunds</H2>
      <P>
        You can cancel <strong>online, in a couple of clicks</strong>: log in →{' '}
        <strong>Settings → Manage subscription</strong>, which opens your secure
        billing portal where you can cancel immediately. You may also cancel by
        emailing {EMAIL} from your account address, which we will process within 3
        business days. Cancellation takes effect at the end of the current paid
        period: you keep access until then, and no further charges occur. Refunds
        are governed by our{' '}
        <a href="/refunds" style={{ color: '#4ECDC4' }}>Cancellation &amp; Refund Policy</a>,
        which is part of these Terms — in short: a full refund is available within
        7 days of your first purchase; otherwise payments are non-refundable and
        we do not prorate partial periods, except where required by law.
      </P>

      <H2 id="section-6">6. Content Generated for Your Family</H2>
      <P>
        The Service creates personalized content for your child — for example,
        stories generated around your child's chosen interests, which are saved to
        the child's profile so they can be revisited. That personalized content
        belongs with your family: we host, store, and display it solely to operate
        and provide the Service to your account, we do not use it for marketing,
        and it is deleted per the Privacy Policy's retention schedule or on your
        request. Should the Service add features that let your family save its own
        creations, this section covers those the same way. You are responsible for
        anything you submit through your account (e.g., support messages) being
        lawful.
      </P>

      <H2 id="section-7">7. Our Intellectual Property</H2>
      <P>
        The Service — including the 200 Magic Words name, the Nova character and
        the Candy Galaxy world, curriculum, word sequences, activities, artwork,
        animations, audio, software, and design — is owned by us or our licensors
        and protected by intellectual-property law. The learning methodology is
        based on the work of Dr. Marion Blank and is used under license. No rights
        are granted except the limited license in Section 3. Feedback you send us
        may be used without obligation.
      </P>

      <H2 id="section-8">8. Educational Disclaimer</H2>
      <P>
        The Service is a <strong>supplemental</strong> educational tool. Every
        child learns differently, and <strong>we do not promise any particular
        educational outcome, reading level, or timeline</strong>. The Service does
        not provide diagnosis, evaluation, therapy, or special-education services,
        and is not a substitute for assessment by qualified professionals.
        Placement results and progress reports are informational estimates
        generated by the Service, not clinical or educational evaluations. If you
        have concerns about your child's reading development, consult your
        child's teacher, pediatrician, or a reading specialist.
      </P>

      <H2 id="section-9">9. Third-Party Services</H2>
      <P>
        The Service relies on third-party providers (hosting, payments, AI content
        generation, speech synthesis) as described in the Privacy Policy. Optional
        Google sign-in is provided by Google and governed by Google's own terms.
        Speech recognition in the Say-It activity is performed by your own web
        browser's built-in feature, governed by your browser vendor's terms. We
        are not responsible for outages or acts of providers beyond our
        reasonable control, though we choose and oversee them with care.
      </P>

      <H2 id="section-10">10. Disclaimer of Warranties</H2>
      <P>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE FULLEST EXTENT
        PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
        INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
        NON-INFRINGEMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION. Some states
        do not allow certain warranty disclaimers, so parts of this section may
        not apply to you.
      </P>

      <H2 id="section-11">11. Limitation of Liability</H2>
      <P>
        TO THE FULLEST EXTENT PERMITTED BY LAW: (a) WE ARE NOT LIABLE FOR
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOST
        DATA, PROFITS, OR GOODWILL; AND (b) OUR TOTAL LIABILITY FOR ALL CLAIMS
        RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (i) THE AMOUNTS YOU
        PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR (ii) $100. Nothing in
        these Terms limits liability that cannot be limited by law, and nothing
        limits your non-waivable rights as a consumer or your rights regarding
        your child's personal information.
      </P>

      <H2 id="section-12">12. Indemnification</H2>
      <P>
        You will indemnify us against third-party claims arising from your
        violation of these Terms or misuse of the Service, except to the extent
        caused by us.
      </P>

      <H2 id="section-13">13. Termination</H2>
      <P>
        You may stop using the Service at any time, and a self-serve{' '}
        <strong>Delete account</strong> control in Settings removes your account
        and data as described in the Privacy Policy. We may suspend or terminate
        accounts that violate these Terms, abuse the Service, or create risk for
        us or other users; where practical we will warn you first. On
        termination, Sections 6–12 and 14–15 survive.
      </P>

      <H2 id="section-14">14. Governing Law and Disputes</H2>
      <P>
        These Terms are governed by the laws of the State of Florida, without
        regard to conflict-of-law rules. Disputes will be resolved in the state or
        federal courts located in Pasco County, Florida, and both parties consent
        to that venue. Either party may instead bring an individual claim in
        small-claims court.
      </P>

      <H2 id="section-15">15. General</H2>
      <P>
        These Terms plus the Privacy Policy and{' '}
        <a href="/refunds" style={{ color: '#4ECDC4' }}>Cancellation &amp; Refund Policy</a>{' '}
        are the entire agreement for the Service. If a provision is unenforceable,
        the rest remain in effect. Our failure to enforce a provision is not a
        waiver. You may not assign these Terms; we may assign them in connection
        with a merger, acquisition, or sale of assets, with notice to you. Notices
        to you may be sent to your account email.
      </P>
      <P>
        <strong>Changes to these Terms.</strong> We may update these Terms; for
        material changes we will email account holders at least 14 days before
        they take effect. Continued use after the effective date is acceptance.
        Changes affecting children's personal information additionally follow the
        consent requirements in the Privacy Policy.
      </P>

      <H2 id="section-16">16. Contact</H2>
      <P>{ENTITY} · {ADDRESS} · {EMAIL} · {PHONE}</P>
    </PolicyPage>
  );
}
