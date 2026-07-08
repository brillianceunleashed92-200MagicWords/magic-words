# Cover Email to Counsel (v2) — copy/paste and attach the four files

**To:** [counsel]
**Subject:** 200 Magic Words — COPPA data inventory + code-verified policy drafts for pre-launch review

**Attachments:** COPPA_DATA_INVENTORY.md · 200MW_privacy_policy_DRAFT_v2.md · 200MW_terms_of_service_DRAFT_v2.md · 200MW_cancellation_refund_policy_DRAFT_v2.md

---

Hi [name],

200 Magic Words (200magicwordsapp.com) is a subscription reading app for children under 13 — parents hold the account, kids use a profile inside it. We're pre-launch, and payment processing goes live only after your sign-off, so this review is the critical path.

Attached: our COPPA data inventory and drafts of the privacy policy, terms of service, and cancellation/refund policy. The drafts are written to the amended COPPA Rule (enforceable since April 22, 2026) and ROSCA/state auto-renewal standards. Importantly, **every factual claim in these drafts has been verified against the actual codebase** by a static forensics audit (I can share the full report if useful) — so what the policies say the app does is what the app does. The decisions I need from you:

1. **Verifiable parental consent sufficiency.** At signup, the parent must check a consent statement (confirming parent/guardian status and consenting to the data practices) and confirm the account email. We disclose children's data to no third parties for their own use — service providers only — so we believe the email-plus method applies for the free tier, with card-transaction verification additionally at paid conversion. Please confirm this flow is sufficient or specify additions. (This resolves the VPC gap flagged in the inventory.)
2. **Deletion workflow sufficiency.** A self-serve control exists and is verified working: Settings → Delete account (typed confirmation), removing the account, all child profiles, and all associated data including linked analytics rows. Please confirm this satisfies COPPA's parental deletion right, or flag anything it must add.
3. **Child voice — browser-based recognition.** The speak-aloud activity uses the browser's built-in speech recognition: no audio ever reaches our servers or storage, only the text transcript; no voiceprints. The browser vendor (e.g., Google in Chrome) may process the audio as part of that built-in feature. Please review the disclosure language in Privacy Policy §2b and confirm it's the right treatment.
4. **Child's first name in AI prompts.** For personalized stories and the weekly parent summary, the child's first name is sent to Anthropic (a service provider under written terms) so output can address the child by name; nothing else identifying is sent. Disclosed in the §4 provider table — please confirm the disclosure suffices, and whether the no-model-training representation should stay pending confirmation of the vendor terms.
5. **Retention schedule** — proposed periods in Privacy Policy §5; confirm or adjust.
6. **Arbitration** — ToS §14 currently uses Florida courts with a small-claims carve-out; arbitration/class-waiver deliberately omitted pending your recommendation.
7. **Refund windows** — proposed in the refund policy; confirm no state-law issues.
8. **Entity** — policies are drafted for [entity name]; confirm the entity and the address/phone we should publish (COPPA requires both in the notice).
9. **Dr. Blank methodology license** — ToS §7 references our license to the underlying methodology; I'd like the written license reviewed/confirmed as part of this.

One small code change (adding a Terms of Service link to the existing signup consent checkbox) is already scheduled before launch; the drafts assume it.

What's your timeline for redlines, and would a short call help before you start?

Thanks,
Sal
[phone]
