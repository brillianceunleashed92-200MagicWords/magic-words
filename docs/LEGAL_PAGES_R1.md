# LEGAL PAGES R1 — PUBLISH THE INTERIM POLICIES
**Written:** July 6, 2026 · **Execute from:** `~/magic-words` · **Branch:** `chore/legal-pages`
**Hard gate: run ONLY after FEAT_AUTH_R1 has merged to main** (verify the `/update-password` route exists on `main`; if not, stop immediately — the policy text describes Google sign-in and password reset, and must not publish before they exist). Content sources, dropped into `docs/` alongside this prompt: `200MW_privacy_policy_PUBLISH.md`, `200MW_terms_of_service_PUBLISH.md`, `200MW_refund_policy_PUBLISH.md`.

## STANDING RULES
Autonomous per convention; approval stop at `git push origin main`; deployment check after push (FIX R1 rule); report `docs/LEGAL_PAGES_REPORT.md` at step 0 with RUN TIMING + live updates.

## PHASE 0 — INPUT STOP (before any code)
Ask Sal, in one prompt, for exactly five answers and record them in the report:
1. Legal entity name as it should appear publicly (e.g., "NextGen Lab Studio LLC")
2. Business mailing address (registered agent / virtual office is fine)
3. Business phone
4. Privacy/support email (e.g., support@200magicwordsapp.com — must be a real, monitored inbox)
5. Is any free trial offered at launch? (yes/no; if yes: length)

**If entity name or mailing address is unavailable, ABORT the run** with a clear note: COPPA requires the operator's name, address, phone, and email in the published notice — these pages cannot go live without them. (An LLC filing + registered-agent address resolves both; that's a Sal task, not a run task.) Do not substitute placeholders and publish anyway.

Compute `{{EFFECTIVE_DATE}}` as today's date. If answer 5 is "no," the trial paragraph stays omitted (the content files already omit it); if "yes," insert into ToS §4, after the auto-renewal paragraph: "**Free trial.** New subscribers receive a [N]-day free trial. The trial converts automatically to a paid subscription at the price shown at checkout unless cancelled before the trial ends; the first charge occurs on day [N+1]. Cancelling during the trial costs nothing."

## PHASE 1 — RENDER THE PAGES (faithful, not creative)
- Substitute the five tokens throughout all three content files.
- Replace the contents of `src/pages/PrivacyPolicy.jsx` and `src/pages/TermsOfService.jsx`, and create `src/pages/RefundPolicy.jsx` + route `/refunds` in `main.jsx`, rendering the documents **verbatim** — headings, bold, bullets, and the two tables (service providers, retention) as real accessible HTML tables. Section anchors (`id`s) on every `##` heading. Match the existing pages' styling conventions; readable line length; no new dependencies (hand-rolled JSX, not a markdown-renderer package, unless one is already installed).
- **Fidelity rule:** do not paraphrase, "improve," shorten, or reconcile the text. If anything in the documents contradicts what the code actually does, STOP on that point and flag it in the report for Sal rather than silently editing either side — the whole value of these pages is that they were code-verified.

## PHASE 2 — WIRE THE SURFACES
- Footer (or equivalent persistent element) links to `/privacy`, `/terms`, `/refunds` on the public landing page and the auth screens at minimum.
- Confirm the signup checkbox's existing `/privacy` and `/terms` links resolve to the new content; add a small "Refund Policy" link near ToS §5's mention if the page component supports intra-doc links.
- **Checkout disclosure (the point-of-sale piece):** locate the screen/component that initiates checkout (follow `src/lib/queries/checkout.js`'s call sites) and add, adjacent to the purchase CTA: "Subscriptions renew automatically until cancelled. Cancel anytime in Settings. See our Refund Policy." with `/refunds` linked. Keep it visually consistent; do not restructure the checkout flow.
- Report note (Sal dashboard task, not automated): Stripe → Settings → Customer emails — ensure receipts are enabled and add the policy URL to the receipt/business settings so the post-purchase email carries cancellation info.

## PHASE 3 — GATES → SHIP
Full suite (CSP walk must cover `/refunds` and pass), build, lint (no new categories). Merge → approval → push → deployment check → production verify: `curl` each of the three URLs and confirm the entity name and effective date render; click through from the signup checkbox links; footer links work; checkout screen shows the disclosure. 

## COMPLETION
Report: the five Phase-0 answers, any fidelity flags, gate results, production evidence (URLs + rendered-text confirmation), and a closing note: **when counsel's redlines arrive, apply them as text edits to these same files, bump the Effective Date, and — if any change alters children's data practices materially — follow the fresh-consent requirement in Privacy Policy §9.** Commit prompt + content docs + report → approval → docs push.
