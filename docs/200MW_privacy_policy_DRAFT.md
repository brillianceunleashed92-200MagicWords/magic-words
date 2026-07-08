# Privacy Policy — 200 Magic Words

> **DRAFT — FOR ATTORNEY REVIEW. DO NOT PUBLISH.**
> Prepared July 6, 2026. Built to the amended COPPA Rule (16 CFR Part 312, fully enforceable April 22, 2026).
> Placeholder legend: `[FILL: …]` = factual blank Sal completes · `[DECIDE: …]` = business decision · `[VERIFY: …]` = must be confirmed against the actual codebase before publishing · `[COUNSEL: …]` = legal judgment call.

**Effective Date:** [FILL: launch date]
**Operator:** [FILL: legal entity name, e.g., "NextGen Lab Studio LLC"] ("we," "us," "our")
**Address:** [FILL: business mailing address — required by COPPA; a registered-agent or virtual-office address is acceptable]
**Phone:** [FILL: business phone — required by COPPA]
**Email:** [FILL: privacy@200magicwordsapp.com or support address]

This Privacy Policy covers the 200 Magic Words website and web application at 200magicwordsapp.com (the "Service").

---

## The Short Version (Plain English)

200 Magic Words is a reading app made for young children, so we hold ourselves to the strictest children's privacy standard. In plain terms:

- **Parents own the account.** Children use a profile inside a parent's account, under parental consent.
- **We collect the minimum needed to teach**: a first name or nickname, an age, and learning progress. Nothing more.
- **We never sell personal information. We show no ads. We do no targeted advertising — to anyone, ever.**
- **We never share children's information with third parties for their own use.** A small number of vetted service providers process data solely to run the Service for us.
- **You can see or delete your child's information at any time**, and stop us from collecting more.
- **We don't keep data forever.** Retention periods are listed below, and inactive data is deleted on a schedule.

The full details follow.

---

## 1. Who the Service Is For

The Service is a children's literacy program directed to children under 13, used under the supervision of a parent or legal guardian. Adults (18+) create and control accounts; a child uses the Service through a child profile inside the parent's account. We treat all information collected through the child experience as children's personal information protected by the Children's Online Privacy Protection Act ("COPPA").

## 2. Information We Collect

### 2a. From Parents and Guardians
- **Account information:** email address and password. Passwords are handled by our authentication provider and stored only in hashed form — we never see or store your plaintext password.
- **Billing information:** if you purchase a subscription, payment is processed by Stripe, Inc. Your card number goes directly to Stripe; we never receive or store it. We receive only confirmation of payment status and a subscription reference. Stripe's handling of your information is described in Stripe's own privacy policy.
- **Communications:** messages you send to support.

### 2b. From and About Children
With verifiable parental consent (see Section 4), we collect from the child's profile:

- **Profile basics:** the child's first name or nickname and age. [DECIDE: recommend the product prompt say "first name or nickname" and never request a last name — this materially reduces what we hold.]
- **Learning activity data:** placement results (the starting level measured by the Placement Adventure), words practiced, answers given, progress, streaks, rewards earned, and in-app creations such as drawings made in the Draw It activity.
- **Voice (Say-It activity):** [VERIFY against the codebase — publish exactly ONE of the following, whichever is true:]
    - **Option A (target state):** When your child speaks a word in the Say-It activity, the audio is processed only momentarily to evaluate the spoken word. **The audio is not saved, not stored, and is deleted immediately after processing.** We do not create voiceprints and cannot recognize a child by their voice. *(This tracks the COPPA audio-file exception and must match reality exactly.)*
    - **Option B (if audio is transmitted or retained):** [COUNSEL: if audio leaves the device to our server or a third-party speech service, or is retained for any period, that is collection of children's personal information — and voiceprints are now biometric identifiers under the amended Rule. Consent language, the service-provider list, and the retention table must all be updated, and the recipient named.]
    - [VERIFY: if the app uses the browser's built-in speech recognition (e.g., the Web Speech API in Chrome), audio may be processed by the browser vendor's servers. That vendor must then be disclosed as a recipient. Confirm the actual implementation before choosing language.]

We do not knowingly collect from children: last names, contact information, photos or video, precise geolocation, or government identifiers. We do not condition a child's participation on disclosing more information than is reasonably necessary for the activity.

### 2c. Collected Automatically
We operate **first-party analytics only**. When the Service is used, we automatically receive:
- Device and browser type, general (city-level) location inferred from IP address, and IP address for security purposes;
- Session identifiers and product events (which features are used, session length, errors).

**Support-for-internal-operations disclosure (COPPA §312.4/§312.5(c)(7)):** persistent identifiers (such as session cookies and an account identifier) are used solely to: authenticate users and maintain sessions; protect the security and integrity of the Service; personalize the learning level within the Service; and perform first-party analytics to maintain and improve the Service. **Safeguards:** these identifiers are not used to build advertising profiles, are not used to contact any child, are not combined with data from other companies, and are not disclosed to any third party for that party's own use. We use no third-party advertising or analytics trackers.

## 3. How We Use Information

- To provide and operate the Service, including placing the child at the right learning level and adapting content;
- To show parents their child's progress;
- To process subscriptions and send transactional emails (receipts, renewal notices, security notices) to the **parent**;
- To maintain safety and security, prevent fraud and abuse, and debug the Service;
- To improve the Service using aggregated or de-identified information;
- To comply with law.

We **never** use children's personal information for marketing, advertising, ad targeting or retargeting, or profiling for commercial purposes, and we never send marketing communications to children.

## 4. Children's Privacy — Our COPPA Practices

**Parental consent.** Before we collect personal information from a child, we provide the parent a direct notice and obtain verifiable parental consent. [COUNSEL + DECIDE: consent method — see the flagged VPC question in COPPA_DATA_INVENTORY.md. Because we do not disclose children's personal information to third parties for their own use, the "email-plus" method is available for the free tier; a payment-card transaction at subscription is an additional recognized method for paid conversion. The signup flow must implement whichever method counsel approves before launch.]

**No third-party disclosure.** We do not disclose children's personal information to third parties for their own purposes — not for advertising, not for sale, not for "data partnerships," not ever. Because of this, there is no third-party disclosure for a parent to separately consent to. If that ever changed, the amended COPPA Rule would require us to obtain your separate, opt-in consent first, and we would do so. Parents always have the right to consent to our collection and use of their child's information **without** consenting to any disclosure to third parties.

**Service providers** (not "third parties" for their own use) process information on our behalf, only to run the Service, under contractual confidentiality and security obligations, and we obtain written assurances that they can maintain the confidentiality, security, and integrity of the information:

| Provider | Role | What it processes |
|---|---|---|
| Supabase | Database, authentication, file storage | Account and profile data, learning data, [VERIFY: drawings] |
| Vercel | Web hosting and serverless functions | Traffic data incidental to serving the app |
| Stripe | Payment processing (parents only) | Parent billing data — no child data |
| Anthropic | AI generation of learning content and encouragement | [VERIFY: confirm prompts contain NO child personal information — no name, no age. Recommended engineering rule: prompts may include only curriculum words, activity type, and anonymous performance context. If the child's first name is currently included in prompts, either strip it or disclose it here.] |
| ElevenLabs | Text-to-speech audio generation | [VERIFY: confirm only curriculum/word text is sent — no child personal information, no child voice audio] |

**Parental rights.** At any time, a parent may:
1. **Review** the personal information we have collected from their child;
2. **Delete** it and direct us to stop further collection or use;
3. **Revoke consent**, which ends the child profile's use of the Service.

To exercise these rights, email [FILL: privacy email] from the account email address, or use the in-account controls at [VERIFY: confirm an account-deletion / child-data-deletion control exists in the app — this is the flagged deletion-workflow gap; the mechanism named here must actually work before launch]. We will verify that the requester is the child's parent (normally by matching the account email and confirming via that address) and respond within [DECIDE: 30] days. Deleting a child's information may mean the child loses progress and, if collection is refused entirely, can no longer use the Service — we will tell you before completing the request.

## 5. Data Retention Policy

We keep personal information only as long as reasonably necessary for the purpose it was collected, and never indefinitely. [COUNSEL: periods below are proposed defaults for sign-off. Per the amended Rule this schedule must appear in this notice itself, and our internal written retention policy must match it.]

| Data | Purpose | Retention |
|---|---|---|
| Parent account data (email, hashed credentials) | Operate the account | Life of the account + [DECIDE: 30] days after deletion |
| Child profile (first name/nickname, age) | Personalize the Service | While the profile is active; deleted [DECIDE: 24] months after last activity, or immediately on parental request |
| Child learning data (placement, progress, answers, streaks, rewards) | Deliver and adapt instruction; parent reporting | Same as child profile |
| Child drawings (Draw It) | Display within the child's own profile | Same as child profile |
| Child voice audio (Say-It) | Evaluate the spoken word | [VERIFY: **Not retained** — processed transiently and deleted immediately (Option A), or state actual period per Option B] |
| Product analytics events | Maintain and improve the Service | [DECIDE: 18] months, then deleted or aggregated so no individual is identifiable |
| Billing records (parent) | Legal, tax, accounting | As required by law (typically 7 years) |
| Support correspondence | Resolve issues | [DECIDE: 24] months |

When retention ends, data is deleted or de-identified using reasonable measures that protect against unauthorized access during disposal.

## 6. Security

We maintain a written information security program appropriate to the sensitivity of children's data, including: encryption in transit (TLS) for all traffic; row-level security policies so accounts can only access their own data; hashed credential storage; least-privilege handling of server keys; and security review of the application. No system is perfectly secure; if a breach affects your or your child's personal information, we will notify you as required by law.

## 7. Where Information Is Processed

We are a U.S. company and the Service is operated from and hosted in the United States, intended for users in the United States. If you use the Service from elsewhere, you understand your information is processed in the U.S. [COUNSEL: if the business later markets to the EU/UK, GDPR/UK-AADC work is required — out of scope for this policy.]

## 8. Your State Privacy Rights

Depending on your state, you may have additional rights over personal information (access, correction, deletion, portability). Many state laws apply only to businesses above certain size thresholds, which we may not currently meet — but we honor access and deletion requests from any parent or account holder regardless, using the contact below.

## 9. Changes to This Policy

If we make material changes — especially any change to how we collect, use, or disclose children's personal information — we will notify parents by email and, where COPPA requires, obtain fresh verifiable parental consent before the change applies to a child's information. The "Effective Date" above always reflects the current version.

## 10. Contact Us

[FILL: legal entity name]
[FILL: mailing address]
[FILL: phone]
[FILL: privacy email]

Parents may use these contacts for any question, or to exercise any right described in this Policy.
