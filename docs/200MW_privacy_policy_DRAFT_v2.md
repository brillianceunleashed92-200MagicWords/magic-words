# Privacy Policy — 200 Magic Words

> **DRAFT v2 — FOR ATTORNEY REVIEW. DO NOT PUBLISH.**
> Prepared July 6, 2026. Built to the amended COPPA Rule (16 CFR Part 312, fully enforceable April 22, 2026).
> **v2 change note:** every `[VERIFY]` item in v1 has been resolved by read-only code forensics against commit `3a36f1f` (report: FORENSICS_R1_REPORT.md). This draft describes the codebase **as it will exist after the FIX_R1 pass deploys** (analytics-row deletion on account deletion; Terms link added to the signup checkbox) — FIX_R1 is a prerequisite to publishing this policy.
> Remaining placeholders: `[FILL: …]` factual blank · `[DECIDE: …]` business decision (defaults proposed) · `[COUNSEL: …]` legal judgment call.

**Effective Date:** [FILL: launch date]
**Operator:** [FILL: legal entity name] ("we," "us," "our")
**Address:** [FILL: business mailing address — required by COPPA]
**Phone:** [FILL: business phone — required by COPPA]
**Email:** [FILL: privacy@200magicwordsapp.com or support address]

This Privacy Policy covers the 200 Magic Words website and web application at 200magicwordsapp.com (the "Service").

---

## The Short Version (Plain English)

200 Magic Words is a reading app made for young children, so we hold ourselves to the strictest children's privacy standard. In plain terms:

- **Parents own the account.** Children use a profile inside a parent's account, under parental consent.
- **We collect the minimum needed to teach**: a first name or nickname, an age, chosen interests, and learning progress. Nothing more.
- **We never sell personal information. We show no ads. We do no targeted advertising — to anyone, ever.**
- **We never share children's information with third parties for their own use.** A small number of vetted service providers process data solely to run the Service for us, and we tell you exactly which ones and what they see.
- **Your child's voice is never recorded by us.** The speak-aloud activity uses your own browser's built-in speech recognition; only the text of what was recognized reaches us.
- **You can see or delete your child's information at any time** — there's a delete-account control right in your settings — and stop us from collecting more.
- **We don't keep data forever.** Retention periods are listed below.

The full details follow.

## 1. Who the Service Is For

The Service is a children's literacy program directed to children under 13, used under the supervision of a parent or legal guardian. Adults (18+) create and control accounts; a child uses the Service through a child profile inside the parent's account. We treat all information collected through the child experience as children's personal information protected by the Children's Online Privacy Protection Act ("COPPA").

## 2. Information We Collect

### 2a. From Parents and Guardians
- **Account information:** email address and password. Passwords are handled by our authentication provider and stored only in hashed form — we never see or store your plaintext password.
- **Billing information:** if you purchase a subscription, payment is processed by Stripe, Inc. Your card number goes directly to Stripe; we never receive or store it. We receive only confirmation of payment status and a subscription reference.
- **Communications:** messages you send to support.

### 2b. From and About Children
With verifiable parental consent (see Section 4), we collect from the child's profile:

- **Profile basics:** the child's first name or nickname, age, a selectable avatar icon (an in-app illustration, never a photo), and learning interests chosen from a fixed list (used to theme stories and activities). We never request a last name, birthdate, contact information, photos, or location.
- **Learning activity data:** placement results (the starting level measured by the Placement Adventure), words practiced, answers given and response times, mastery and progress, review schedules, streaks, rewards and achievements, session plans, and personalized stories generated for your child (which may include the child's first name in the story text).
- **Voice (Say-It activity):** when your child speaks a word in the Say-It activity, the speech is recognized by **your web browser's own built-in speech-recognition feature — not by our servers.** The Service receives only the resulting text transcript, which it compares to the target word. **We never receive, store, or retain any audio, and we do not create voiceprints or use any biometric recognition.** Because recognition is performed by the browser itself, your browser's vendor (for example, Google in Chrome) may process the audio through its own speech service as part of that built-in browser feature, under that vendor's own privacy policy. The microphone is used only for this activity and only with your device's permission.

We do not condition a child's participation on disclosing more information than is reasonably necessary for the activity.

### 2c. Collected Automatically
We operate **first-party analytics only**. When the Service is used, we automatically receive: device and browser type, IP address (used for security and to infer general, city-level location), session identifiers, and product events (which features are used, session length, placement-flow steps, errors).

**Support-for-internal-operations disclosure (COPPA §312.4/§312.5(c)(7)):** persistent identifiers (such as session cookies and an account identifier) are used solely to: authenticate users and maintain sessions; protect the security and integrity of the Service; personalize the learning level within the Service; and perform first-party analytics to maintain and improve the Service. **Safeguards:** these identifiers are not used to build advertising profiles, are not used to contact any child, are not combined with data from other companies, and are not disclosed to any third party for that party's own use. We use no third-party advertising or analytics trackers of any kind.

## 3. How We Use Information

- To provide and operate the Service, including placing the child at the right learning level and adapting content to their progress;
- To show parents their child's progress, including an in-app weekly summary;
- To process subscriptions and send transactional emails (receipts, renewal notices, security notices) to the **parent** — the Service has no way to email or message a child, because child profiles have no contact information;
- To maintain safety and security, prevent fraud and abuse, and debug the Service;
- To improve the Service using aggregated or de-identified information;
- To comply with law.

We **never** use children's personal information for marketing, advertising, ad targeting or retargeting, or profiling for commercial purposes.

## 4. Children's Privacy — Our COPPA Practices

**Parental consent.** Before we collect personal information from a child, we provide the parent a direct notice and obtain verifiable parental consent. Currently, at signup the parent must affirmatively check a consent statement confirming they are the child's parent or guardian and consent to the data practices in this Policy, and must confirm control of the account email address. [COUNSEL + DECIDE: confirm this checkbox-plus-email-confirmation flow satisfies the "email-plus" method for internal-use-only collection, or specify additions (e.g., delayed confirmation email). Payment-card verification additionally applies at paid conversion. This is the VPC question from COPPA_DATA_INVENTORY.md — the mechanism now exists; the ask is confirming sufficiency. [VERIFY: email confirmation is enabled in production auth settings.]]

**No third-party disclosure.** We do not disclose children's personal information to third parties for their own purposes — not for advertising, not for sale, not ever. Because of this, there is no third-party disclosure for a parent to separately consent to. If that ever changed, the amended COPPA Rule would require your separate, opt-in consent first, and we would obtain it. Parents always have the right to consent to our collection and use of their child's information **without** consenting to any disclosure to third parties.

**Service providers** (not "third parties" for their own use) process information on our behalf, only to run the Service, under contractual confidentiality and security obligations, and we obtain written assurances that they can maintain the confidentiality, security, and integrity of the information:

| Provider | Role | What it processes |
|---|---|---|
| Supabase | Database, authentication, file storage | Account and profile data, learning data |
| Vercel | Web hosting and serverless functions | Traffic data incidental to serving the app |
| Stripe | Payment processing (parents only) | Parent billing data — no child data |
| Anthropic | AI generation of stories, session content, and the weekly parent summary | Curriculum words, activity context, and anonymous performance data. **For personalized stories and the weekly parent summary only, the child's first name is included** so the output can address the child by name; the child's age, contact details, and identifiers are never sent. Anthropic processes this solely to provide the generation service and, under its commercial terms, does not use it to train its models. [COUNSEL: confirm the no-training representation against the current Anthropic commercial terms before publishing.] |
| ElevenLabs | Text-to-speech (the app's spoken voice) | Curriculum words, question templates, and story sentences only — **never the child's name, any personal information, or any child audio.** Generated audio is cached by the text itself, shared across all users. |

**Parental rights.** At any time, a parent may:
1. **Review** the personal information we have collected from their child;
2. **Delete** it and direct us to stop further collection or use;
3. **Revoke consent**, which ends the child profile's use of the Service.

To delete everything immediately, use the in-account control: **Settings → Delete account** (a typed confirmation is required; deletion removes the account, all child profiles, and all associated data, including analytics event rows linked to your account, from our systems). You may also email [FILL: privacy email] from the account email address for any of the rights above; we verify the requester by matching and confirming via the account email and respond within [DECIDE: 30] days. Deleting a child's information means the child loses progress and, if collection is refused entirely, can no longer use the Service — we will tell you before completing an emailed request.

## 5. Data Retention Policy

We keep personal information only as long as reasonably necessary for the purpose it was collected, and never indefinitely. [COUNSEL: periods below are proposed defaults for sign-off. Per the amended Rule this schedule must appear in this notice itself, and our internal written retention policy must match it.]

| Data | Purpose | Retention |
|---|---|---|
| Parent account data (email, hashed credentials) | Operate the account | Life of the account + [DECIDE: 30] days after deletion |
| Child profile (first name/nickname, age, avatar choice, interests) | Personalize the Service | While the profile is active; deleted [DECIDE: 24] months after last activity, or immediately on parental request |
| Child learning data (placement, progress, answers, response times, review schedules, streaks, achievements, session plans, saved stories) | Deliver and adapt instruction; parent reporting | Same as child profile |
| Child voice audio | — | **Never collected or retained** (see Section 2b — recognition happens in your browser; only text reaches us) |
| Product analytics events (feature-usage and placement-flow events) | Maintain and improve the Service | [DECIDE: 18] months, then deleted or aggregated so no individual is identifiable; deleted immediately with the account when you delete your account |
| Billing records (parent) | Legal, tax, accounting | As required by law (typically 7 years) |
| Support correspondence | Resolve issues | [DECIDE: 24] months |

When retention ends, data is deleted or de-identified using reasonable measures that protect against unauthorized access during disposal.

## 6. Security

We maintain a written information security program appropriate to the sensitivity of children's data, including: encryption in transit (TLS) for all traffic; a Content-Security-Policy restricting the application to first-party and required endpoints only; row-level security policies so accounts can only access their own data; hashed credential storage; least-privilege handling of server keys; and security review of the application. No system is perfectly secure; if a breach affects your or your child's personal information, we will notify you as required by law.

## 7. Where Information Is Processed

We are a U.S. company and the Service is operated from and hosted in the United States, intended for users in the United States. If you use the Service from elsewhere, you understand your information is processed in the U.S. [COUNSEL: if the business later markets to the EU/UK, GDPR/UK-AADC work is required — out of scope for this policy.]

## 8. Your State Privacy Rights

Depending on your state, you may have additional rights over personal information (access, correction, deletion, portability). Many state laws apply only to businesses above certain size thresholds, which we may not currently meet — but we honor access and deletion requests from any parent or account holder regardless, using the contact below.

## 9. Changes to This Policy

If we make material changes — especially any change to how we collect, use, or disclose children's personal information — we will notify parents by email and, where COPPA requires, obtain fresh verifiable parental consent before the change applies to a child's information. The "Effective Date" above always reflects the current version.

## 10. Contact Us

[FILL: legal entity name] · [FILL: mailing address] · [FILL: phone] · [FILL: privacy email]

Parents may use these contacts for any question, or to exercise any right described in this Policy.
