# LEGAL PAGES REPORT — Publish the Interim Policies

## RUN TIMING
- Start: 2026-07-06T20:30:06Z
- End: 2026-07-06T21:25:59Z
- Total: ~56 minutes.
- Branch: `chore/legal-pages`
- Base SHA: `03cefff` (main, includes the feat/auth-r1 merge — `/update-password` route confirmed present, hard gate satisfied)

## HARD GATE CHECK
Confirmed before starting: `/update-password` route exists on `main` (`src/main.jsx:53`, `src/pages/UpdatePassword.jsx` present). Content source files confirmed present: `docs/200MW_privacy_policy_PUBLISH.md`, `docs/200MW_terms_of_service_PUBLISH.md`, `docs/200MW_refund_policy_PUBLISH.md`.

## PHASE 0 — INPUT STOP

**The five answers, and how each was resolved:**
1. **Legal entity name**: `Dr Marions Formula LLC` — provided.
2. **Business mailing address**: **not available**. Per the doc's own hard rule ("If entity name or mailing address is unavailable, ABORT the run... Do not substitute placeholders and publish anyway"), flagged this explicitly to the user rather than silently proceeding. User's explicit decision (via direct question, not assumed): do the reversible rendering/wiring work on this branch with a clearly-marked `[Address pending — Sal to provide]` placeholder, run every gate, but **stop before Phase 3's merge/push** — nothing legally incomplete goes live. This is the standing plan for the rest of this run.
3. **Business phone**: not provided in this exchange either. Same resolution as address — `[Phone pending — Sal to provide]` placeholder, same stop-before-publish gate.
4. **Privacy/support email**: `DrMarionsFormula@gmail.com` — provided. (Note for Sal, recorded rather than silently acted on: the doc's own example suggested a branded address like `support@200magicwordsapp.com`; a `@gmail.com` inbox works today but is worth revisiting before real launch volume.)
5. **Free trial at launch?**: not explicitly answered. Defaulted to **no** (the content files already omit the trial paragraph by default, and no confirmation of a trial was given) — flagged here rather than silently assumed, so Sal can correct it if a trial is actually planned.

`{{EFFECTIVE_DATE}}` = **2026-07-06** (today).

**Standing gate for this run**: Phases 1-2 (render + wire) and Phase 3's gates (build/lint/tests) proceed normally on `chore/legal-pages`. Phase 3's actual **merge to main / push to production is held** until Sal supplies the mailing address (and phone, if still missing) — this report's COMPLETION section will say NOT SHIPPED with the precise missing pieces, not a false "done."

## PHASE 1 — Render the pages
**Fidelity check performed before writing any code**: read all three `*_PUBLISH.md` source files in full and cross-checked every factual claim against this session's own prior forensics work (`FORENSICS_R1_REPORT.md`, `FIX_R1_REPORT.md`, `FEAT_AUTH_R1`) rather than assuming they were accurate. Found **zero contradictions** — the content had already been aligned with the forensics findings (e.g., no mention of Draw It "drawings" being persisted, matching B7(ii)'s fix; the Say-It §2b language matches B1's browser-vendor-processing finding precisely; the service-provider table's Anthropic/ElevenLabs rows match B2/B3 exactly; the retention table's "deleted immediately with the account" language for analytics events matches FIX R1's `product_events` deletion fix; the Settings → Manage subscription / billing-portal description matches the real `create-portal-session.js` wiring). No STOP-and-flag needed this phase.

**Token substitution**: `{{ENTITY}}` → "Dr Marions Formula LLC", `{{EMAIL}}` → "DrMarionsFormula@gmail.com", `{{EFFECTIVE_DATE}}` → "July 6, 2026", `{{ADDRESS}}` → `[Address pending — Sal to provide]`, `{{PHONE}}` → `[Phone pending — Sal to provide]` (the last two per the Phase 0 resolution above — clearly visible placeholders, not silently omitted or fabricated). No free-trial paragraph inserted (Phase 0 answer 5 defaulted to no).

**Implementation**:
- `src/pages/PolicyPage.jsx` — updated: removed the now-stale "DRAFT — placeholder content" banner (no longer accurate once real content ships), added an `effectiveDate` prop, and exported shared `H2`/`H3`/`P`/`UL`/`OL`/`LI`/`Table` building blocks — hand-rolled JSX per the doc's "no new dependencies" instruction, used identically by all three pages so heading/table/list styling stays consistent.
- `src/pages/PrivacyPolicy.jsx` — full replacement, verbatim content, `id` attributes on every `##`-level heading (`short-version`, `section-1` through `section-10`), the service-provider and retention tables rendered as real `<table>` elements via the shared `Table` component.
- `src/pages/TermsOfService.jsx` — full replacement, verbatim content, `id`s on all 16 numbered sections, `/refunds` linked from §5 and §15 exactly where the source text references the Refund Policy.
- `src/pages/RefundPolicy.jsx` — new file, verbatim content, `id`s on all 4 sections.
- `src/main.jsx` — added `RefundPolicy` lazy import + `<Route path="/refunds" .../>`.

**Verification**: `npm run build` clean (new `RefundPolicy` chunk, code-split like the other policy pages). Screenshotted all three pages live in local dev — clean rendering, placeholders clearly visible, tables render correctly with real borders/headers, matches the existing dark-theme styling convention exactly.

## PHASE 2 — Wire the surfaces
- **Landing page footer**: no footer existed at all before this — created `src/pages/landing/sections/Footer.jsx` (Privacy Policy / Terms of Service / Refund Policy links) and added it to `Landing.jsx` after `ClosingCTA`.
- **Auth screens**: new `AuthFooterLinks` component in `LoginScreen.jsx`, rendered under all three modes (`sign_in`, `sign_up`, `reset_request`).
  - **Bug found and fixed during visual verification, not shipped broken**: the first version placed the links row as a sibling inside a `display:flex` wrapper with no `flexDirection` set (defaults to `row`) — the links rendered beside the card, not below it. Screenshotted, caught, fixed by adding `flexDirection: "column"` to both of `LoginScreen.jsx`'s outer wrappers (they had different indentation, so a single `replace_all` only caught one of the two — fixed both explicitly after checking). Re-verified live: links now correctly appear centered below the card in every mode.
- **Signup checkbox links confirmed resolving to the new content**: `/privacy` and `/terms` already linked from the B6 consent checkbox (`feat/auth-r1`); with this phase's real page content now live at those routes, the links resolve to real policy text instead of the old placeholder-draft copy.
- **Refund Policy cross-links**: added directly in Phase 1's `TermsOfService.jsx` content (§5 and §15, exactly where the source markdown references the Refund Policy) rather than as a separate Phase 2 step.
- **Checkout disclosure**: found the actual purchase CTA by following `src/lib/queries/checkout.js`'s only call site — `src/screens/parent/UpgradeBanner.jsx` (both subscription buttons, `$9.99/mo` and `$79/yr`). Added the exact disclosure text from the doc, linked to `/refunds`, directly below the existing `checkout.isError` block — checkout flow itself (the `useCreateCheckoutSession` mutation, button handlers) untouched.
- **Sal dashboard task, recorded not automated**: Stripe → Settings → Customer emails — confirm receipts are enabled and add the policy URL to the receipt/business settings so the post-purchase email carries cancellation info. Not something this run can do (no Stripe dashboard access, and Stripe settings changes are out of scope for an autonomous run regardless).

`npm run build` clean after all of the above, including the flexDirection fix.

## PHASE 3 — Gates → ship

**Build/lint**: `npm run build` clean throughout (new `RefundPolicy`/`PolicyPage` chunks). `npm run lint`: 162 problems, identical to `feat/auth-r1`'s own closing baseline — zero new errors in any file this run touched (the one hit in `Landing.jsx`, `'motion' is defined but never used`, is a pre-existing false positive confirmed present in the file **before** any of this run's edits, via a direct before/after diff — not caused by this run).

**Full local suite** (everything except the CSP walk, which needs a real deployment — see below): **40/40 passed** (6.0m).

**Two real regressions found and fixed during this phase, not shipped broken**:
1. `smoke.spec.js`'s existing B6-checkbox test broke: the new `AuthFooterLinks` (Phase 2) rendered a *second* "Privacy Policy"/"Terms of Service" link pair on the sign-up screen, alongside the B6 checkbox's own links, causing a Playwright strict-mode violation (two elements matched one locator). Fixed by not rendering `AuthFooterLinks` in `sign_up` mode specifically — the checkbox already covers those links there; the footer covers `sign_in` and `reset_request`, where no such links previously existed.
2. Visual verification caught the footer-links row rendering *beside* the auth card instead of below it, in both `LoginScreen.jsx` render branches — the outer wrapper was `display:flex` with no `flexDirection` (defaults to row). Fixed by adding `flexDirection: "column"` to both wrappers (they had different indentation, so a single find-and-replace only caught one on the first attempt — found and fixed both explicitly after re-checking).

**A real, non-trivial debugging thread on the CSP walk itself, resolved correctly rather than papered over**: `tests/csp-walk.spec.js`'s new `/refunds` check failed consistently (3 isolated re-runs, plus once inside the full suite) with "element not found," even at a bumped 20-second timeout. Investigated properly rather than just inflating the timeout further:
- Manually reproduced the exact 4-page navigation sequence live, twice (once unauthenticated, once with a real signed-in session matching the test's own fixture) — the page rendered correctly and instantly both times, with zero console errors.
- Wrote a minimal, isolated Playwright repro of just the navigation + locator — passed in 2.7 seconds.
- Re-read the test file's own top-level `test.use({ baseURL: DEPLOY_BASE_URL || "https://200magicwordsapp.com" })` — **this test targets production (or an explicit preview URL) by design, never local dev**, per its own header comment (a Prompt-10-era convention, since CSP headers are only served by Vercel). Since `chore/legal-pages` hadn't been pushed anywhere yet at that point, `/refunds` genuinely didn't exist at the URL being tested — not a bug in any of this run's code, just the test correctly detecting that nothing had been deployed yet.
- **Resolution**: reverted the speculative 20000ms timeout bump (wrong diagnosis, left in the file would have been a misleading comment), committed the branch's code, pushed `chore/legal-pages` to origin (a feature-branch push for preview-deployment purposes — **not** `git push origin main`, no approval-gated action taken), waited for the resulting Vercel preview, then re-ran the CSP walk with `DEPLOY_BASE_URL` pointed at that preview: **passed, 0 real violations** (15 filtered as the documented Vercel preview-toolbar artifact from Prompt 10's own CSP work) — confirming `/refunds`, `/privacy`, `/terms`, and `/update-password` all render correctly and CSP-clean on a real deployment.

**Not done — deliberately, per the standing gate from Phase 0**: no merge to `main`, no `git push origin main`. `chore/legal-pages` is pushed to `origin` only as a feature branch (already-standard practice this session for preview-based verification), fully gated and ready, waiting on Sal's mailing address and phone number before the actual ship step.

## COMPLETION

### Status: NOT SHIPPED — reversible work complete, merge/push to main held pending Sal

Everything short of the actual publish step is done and gated on this branch:
- All three policies rendered verbatim, faithfully, with zero content contradictions found against the codebase.
- All surfaces wired (footer, auth screens, signup checkbox cross-links, checkout disclosure).
- Full local suite green (40/40) plus a real-deployment CSP walk (0 violations) on a pushed preview.
- Two real regressions (a duplicate-link test break, a footer layout bug) and one real debugging thread (the CSP walk's baseURL-targets-production behavior) found and resolved properly, not glossed over.

**What's blocking the actual ship**: Sal's business mailing address and phone number. Per this run's own hard rule (and the user's explicit choice when asked), the branch stops here — no merge to `main`, no `git push origin main`. `chore/legal-pages` is pushed to `origin` as a feature branch only, for preview-testing purposes.

### Phase 0 — the five answers
1. Legal entity name: `Dr Marions Formula LLC` — provided.
2. Mailing address: **not available** — placeholder `[Address pending — Sal to provide]` shipped to the branch, clearly visible, not silently omitted.
3. Business phone: not available — same placeholder treatment, `[Phone pending — Sal to provide]`.
4. Support email: `DrMarionsFormula@gmail.com` — provided (noted for Sal: a branded address like `support@200magicwordsapp.com` is worth considering before real launch volume, but the Gmail address works today).
5. Free trial at launch: not explicitly answered — defaulted to no (matches the content files' own default; flagged here rather than silently assumed).

### Fidelity flags
None. All three `*_PUBLISH.md` source files were checked line-by-line against this session's own prior forensics/fix work (`FORENSICS_R1_REPORT.md`, `FIX_R1_REPORT.md`, `FEAT_AUTH_R1`) before writing any JSX, and every factual claim already matched the real, current code behavior — no STOP-and-flag was needed.

### Gate results
Build clean. Lint: no new errors (162 problems, matching `feat/auth-r1`'s own closing count; the one `Landing.jsx` hit is a pre-existing false positive, confirmed via before/after diff). Full local suite 40/40. CSP walk: 0 real violations against a real deployed preview of this branch (`https://magic-words-iijlmus68-brillianceunleashed92-6054s-projects.vercel.app`), covering `/privacy`, `/terms`, `/refunds`, and `/update-password` alongside the full existing activity/Galaxy/Parent-Portal/checkout walk.

### Production evidence
Not applicable yet — nothing has shipped to `main`/production this run, by design. The preview URL above is the closest equivalent evidence: a real Vercel deployment of this exact branch, CSP-clean, all three policy pages confirmed rendering (via the CSP walk's own `getByRole` heading assertions, which passed) and visually verified via screenshot during Phase 1/2 in local dev.

### Closing note for the next pass (per the doc's own instruction)
When counsel's redlines arrive: apply them as text edits to the same three `src/pages/*.jsx` files (and their `docs/200MW_*_PUBLISH.md` sources, for the paper trail), bump each page's `EFFECTIVE_DATE` constant, and — if any change alters children's data practices materially — follow the fresh-consent requirement in Privacy Policy §9 (re-consent required before the change applies to a child's information already collected).

**Immediate next step for Sal**: supply the mailing address and phone number, then this branch merges and ships in the same session — no further rendering/wiring work needed, just the two placeholder swaps plus the standard merge → approval → push → deployment-check → production-verify sequence this session has used throughout.
