import PolicyPage, { H2, H3, P, UL, OL, LI, Table } from './PolicyPage';

// LEGAL_PAGES_R1 — rendered verbatim from docs/200MW_privacy_policy_PUBLISH.md,
// Sal's Phase-0 answers substituted for {{ENTITY}} {{ADDRESS}} {{PHONE}}
// {{EMAIL}} {{EFFECTIVE_DATE}}. Do not paraphrase or edit this content
// directly — counsel redlines land as text edits to the PUBLISH source
// file, applied here the same way, with an Effective Date bump.
//
// ADDRESS and PHONE are still pending from Sal (see docs/LEGAL_PAGES_REPORT.md
// Phase 0) — placeholders below, NOT shipped to production until real
// values are supplied (this run stops before merge/push for exactly that
// reason).
const ENTITY = 'Dr Marions Formula LLC';
const ADDRESS = '[Address pending — Sal to provide]';
const PHONE = '[Phone pending — Sal to provide]';
const EMAIL = 'DrMarionsFormula@gmail.com';
const EFFECTIVE_DATE = 'July 6, 2026';

export default function PrivacyPolicy() {
  return (
    <PolicyPage title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <P>
        <strong>Operator:</strong> {ENTITY} ("we," "us," "our") · {ADDRESS} · {PHONE} · {EMAIL}
      </P>
      <P>
        This Privacy Policy covers the 200 Magic Words website and web application at
        200magicwordsapp.com (the "Service").
      </P>

      <H2 id="short-version">The Short Version (Plain English)</H2>
      <P>
        200 Magic Words is a reading app made for young children, so we hold ourselves
        to the strictest children's privacy standard:
      </P>
      <UL>
        <LI><strong>Parents own the account.</strong> Children use a profile inside a parent's account, under parental consent.</LI>
        <LI><strong>We collect the minimum needed to teach</strong>: a first name or nickname, an age, chosen interests, and learning progress. Nothing more.</LI>
        <LI><strong>We never sell personal information. We show no ads. We do no targeted advertising — to anyone, ever.</strong></LI>
        <LI><strong>We never share children's information with third parties for their own use.</strong> A small number of vetted service providers process data solely to run the Service for us, and we tell you exactly which ones and what they see.</LI>
        <LI><strong>Your child's voice is never recorded by us.</strong> The speak-aloud activity uses your own browser's built-in speech recognition; only the text of what was recognized reaches us.</LI>
        <LI><strong>You can see or delete your child's information at any time</strong> — there's a Delete account control right in Settings — and stop us from collecting more.</LI>
        <LI><strong>We don't keep data forever.</strong> Retention periods are listed below.</LI>
      </UL>
      <P>The full details follow.</P>

      <H2 id="section-1">1. Who the Service Is For</H2>
      <P>
        The Service is a children's literacy program directed to children under 13, used
        under the supervision of a parent or legal guardian. Adults (18+) create and
        control accounts; a child uses the Service through a child profile inside the
        parent's account. We treat all information collected through the child
        experience as children's personal information protected by the Children's
        Online Privacy Protection Act ("COPPA").
      </P>

      <H2 id="section-2">2. Information We Collect</H2>
      <H3 id="section-2a">2a. From Parents and Guardians</H3>
      <UL>
        <LI><strong>Account information:</strong> email address and password. Passwords are handled by our authentication provider and stored only in hashed form — we never see or store your plaintext password. Password-reset links are sent only to the account email.</LI>
        <LI><strong>Google sign-in (optional):</strong> if you choose to create or access your parent account with Google, we receive from Google your name, email address, and a Google account identifier, used only to create and secure your account. Google's own handling of your sign-in is governed by Google's privacy policy. Children never have accounts or sign-ins of any kind — Google sign-in applies to parents only.</LI>
        <LI><strong>Billing information:</strong> if you purchase a subscription, payment is processed by Stripe, Inc. Your card number goes directly to Stripe; we never receive or store it. We receive only confirmation of payment status and a subscription reference.</LI>
        <LI><strong>Communications:</strong> messages you send to support.</LI>
      </UL>

      <H3 id="section-2b">2b. From and About Children</H3>
      <P>With verifiable parental consent (see Section 4), we collect from the child's profile:</P>
      <UL>
        <LI><strong>Profile basics:</strong> the child's first name or nickname, age, a selectable avatar icon (an in-app illustration, never a photo), and learning interests chosen from a fixed list (used to theme stories and activities). We never request a last name, birthdate, contact information, photos, or location.</LI>
        <LI><strong>Learning activity data:</strong> placement results (the starting level measured by the Placement Adventure), words practiced, answers given and response times, mastery and progress, review schedules, streaks, rewards and achievements, session plans, and personalized stories generated for your child (which may include the child's first name in the story text).</LI>
        <LI><strong>Voice (Say-It activity):</strong> when your child speaks a word in the Say-It activity, the speech is recognized by <strong>your web browser's own built-in speech-recognition feature — not by our servers.</strong> The Service receives only the resulting text transcript, which it compares to the target word. <strong>We never receive, store, or retain any audio, and we do not create voiceprints or use any biometric recognition.</strong> Because recognition is performed by the browser itself, your browser's vendor (for example, Google in Chrome) may process the audio through its own speech service as part of that built-in browser feature, under that vendor's own privacy policy. The microphone is used only for this activity and only with your device's permission.</LI>
      </UL>
      <P>We do not condition a child's participation on disclosing more information than is reasonably necessary for the activity.</P>

      <H3 id="section-2c">2c. Collected Automatically</H3>
      <P>
        We operate <strong>first-party analytics only</strong>. When the Service is used,
        we automatically receive: device and browser type, IP address (used for
        security and to infer general, city-level location), session identifiers, and
        product events (which features are used, session length, placement-flow
        steps, errors).
      </P>
      <P>
        <strong>Support-for-internal-operations disclosure:</strong> persistent
        identifiers (such as session cookies and an account identifier) are used
        solely to: authenticate users and maintain sessions; protect the security and
        integrity of the Service; personalize the learning level within the Service;
        and perform first-party analytics to maintain and improve the Service.{' '}
        <strong>Safeguards:</strong> these identifiers are not used to build
        advertising profiles, are not used to contact any child, are not combined
        with data from other companies, and are not disclosed to any third party for
        that party's own use. We use no third-party advertising or analytics
        trackers of any kind.
      </P>

      <H2 id="section-3">3. How We Use Information</H2>
      <UL>
        <LI>To provide and operate the Service, including placing the child at the right learning level and adapting content to their progress;</LI>
        <LI>To show parents their child's progress, including an in-app weekly summary;</LI>
        <LI>To process subscriptions and send transactional emails (receipts, renewal notices, password-reset links, security notices) to the <strong>parent</strong> — the Service has no way to email or message a child, because child profiles have no contact information;</LI>
        <LI>To maintain safety and security, prevent fraud and abuse, and debug the Service;</LI>
        <LI>To improve the Service using aggregated or de-identified information;</LI>
        <LI>To comply with law.</LI>
      </UL>
      <P>
        We <strong>never</strong> use children's personal information for marketing,
        advertising, ad targeting or retargeting, or profiling for commercial purposes.
      </P>

      <H2 id="section-4">4. Children's Privacy — Our COPPA Practices</H2>
      <P>
        <strong>Parental consent.</strong> Before we collect personal information from
        a child, we obtain verifiable parental consent: at account creation (whether
        by email/password or Google sign-in), the parent must affirmatively confirm
        that they are the child's parent or legal guardian and that they consent to
        the data practices described in this Policy, and must control the account
        email address. A child profile cannot be created or used without this
        consent.
      </P>
      <P>
        <strong>No third-party disclosure.</strong> We do not disclose children's
        personal information to third parties for their own purposes — not for
        advertising, not for sale, not ever. Because of this, there is no
        third-party disclosure for a parent to separately consent to. If that ever
        changed, we would obtain your separate, opt-in consent first, as the COPPA
        Rule requires. Parents always have the right to consent to our collection
        and use of their child's information <strong>without</strong> consenting to
        any disclosure to third parties.
      </P>
      <P>
        <strong>Service providers</strong> (not "third parties" for their own use)
        process information on our behalf, only to run the Service, under
        contractual confidentiality and security obligations, and we obtain
        assurances that they can maintain the confidentiality, security, and
        integrity of the information:
      </P>
      <Table
        headers={['Provider', 'Role', 'What it processes']}
        rows={[
          ['Supabase', 'Database, authentication, file storage', 'Account and profile data, learning data'],
          ['Vercel', 'Web hosting and serverless functions', 'Traffic data incidental to serving the app'],
          ['Stripe', 'Payment processing (parents only)', 'Parent billing data — no child data'],
          ['Anthropic', 'AI generation of stories, session content, and the weekly parent summary', <>Curriculum words, activity context, and anonymous performance data. <strong>For personalized stories and the weekly parent summary only, the child's first name is included</strong> so the output can address the child by name; the child's age, contact details, and identifiers are never sent. Under Anthropic's commercial terms, API inputs and outputs are not used to train Anthropic's models.</>],
          ['ElevenLabs', 'Text-to-speech (the app’s spoken voice)', <>Curriculum words, question templates, and story sentences only — <strong>never the child's name, any personal information, or any child audio.</strong> Generated audio is cached by the text itself, shared across all users.</>],
        ]}
      />
      <P><strong>Parental rights.</strong> At any time, a parent may:</P>
      <OL>
        <LI><strong>Review</strong> the personal information we have collected from their child;</LI>
        <LI><strong>Delete</strong> it and direct us to stop further collection or use;</LI>
        <LI><strong>Revoke consent</strong>, which ends the child profile's use of the Service.</LI>
      </OL>
      <P>
        To delete everything immediately, use the in-account control:{' '}
        <strong>Settings → Delete account</strong> (a typed confirmation is required;
        deletion removes the account, all child profiles, and all associated data,
        including analytics event rows linked to your account, from our systems).
        You may also email {EMAIL} from the account email address for any of the
        rights above; we verify the requester by matching and confirming via the
        account email and respond within 30 days. Deleting a child's information
        means the child loses progress and, if collection is refused entirely, can
        no longer use the Service — we will tell you before completing an emailed
        request.
      </P>

      <H2 id="section-5">5. Data Retention Policy</H2>
      <P>
        We keep personal information only as long as reasonably necessary for the
        purpose it was collected, and never indefinitely:
      </P>
      <Table
        headers={['Data', 'Purpose', 'Retention']}
        rows={[
          ['Parent account data (email, hashed credentials)', 'Operate the account', 'Life of the account + 30 days after deletion'],
          ['Child profile (first name/nickname, age, avatar choice, interests)', 'Personalize the Service', 'While the profile is active; deleted 24 months after last activity, or immediately on parental request'],
          ['Child learning data (placement, progress, answers, response times, review schedules, streaks, achievements, session plans, saved stories)', 'Deliver and adapt instruction; parent reporting', 'Same as child profile'],
          ['Child voice audio', '—', <><strong>Never collected or retained</strong> (see Section 2b — recognition happens in your browser; only text reaches us)</>],
          ['Product analytics events (feature-usage and placement-flow events)', 'Maintain and improve the Service', '18 months, then deleted or aggregated so no individual is identifiable; deleted immediately with the account when you delete your account'],
          ['Billing records (parent)', 'Legal, tax, accounting', 'As required by law (typically 7 years)'],
          ['Support correspondence', 'Resolve issues', '24 months'],
        ]}
      />
      <P>
        When retention ends, data is deleted or de-identified using reasonable
        measures that protect against unauthorized access during disposal.
      </P>

      <H2 id="section-6">6. Security</H2>
      <P>
        We maintain an information security program appropriate to the sensitivity
        of children's data, including: encryption in transit (TLS) for all traffic;
        a Content-Security-Policy restricting the application to first-party and
        required endpoints only; row-level security policies so accounts can only
        access their own data; hashed credential storage; least-privilege handling
        of server keys; and ongoing security review of the application. No system is
        perfectly secure; if a breach affects your or your child's personal
        information, we will notify you as required by law.
      </P>

      <H2 id="section-7">7. Where Information Is Processed</H2>
      <P>
        We are a U.S. company and the Service is operated from and hosted in the
        United States, intended for users in the United States. If you use the
        Service from elsewhere, you understand your information is processed in the
        U.S.
      </P>

      <H2 id="section-8">8. Your State Privacy Rights</H2>
      <P>
        Depending on your state, you may have additional rights over personal
        information (access, correction, deletion, portability). We honor access
        and deletion requests from any parent or account holder regardless of
        state, using the contact below.
      </P>

      <H2 id="section-9">9. Changes to This Policy</H2>
      <P>
        If we make material changes — especially any change to how we collect, use,
        or disclose children's personal information — we will notify parents by
        email and, where COPPA requires, obtain fresh verifiable parental consent
        before the change applies to a child's information. The Effective Date
        above always reflects the current version.
      </P>

      <H2 id="section-10">10. Contact Us</H2>
      <P>{ENTITY} · {ADDRESS} · {PHONE} · {EMAIL}</P>
      <P>Parents may use these contacts for any question, or to exercise any right described in this Policy.</P>
    </PolicyPage>
  );
}
