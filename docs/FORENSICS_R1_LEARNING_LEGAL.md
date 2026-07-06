# FORENSICS R1 — READ-ONLY CODE FORENSICS: LEARNING MODEL + LEGAL/PRIVACY VERIFICATION
**Written:** July 6, 2026 · **Execute from:** `~/magic-words` · **Type:** READ-ONLY analysis run (deliberately outside the numbered prompt sequence; Prompt 11 remains reserved for Stripe-live cutover)

## MISSION
Answer 15 questions about what the code ACTUALLY does — 6 on the learning/adaptivity model, 9 verifying claims made in the draft privacy policy and terms of service. Findings feed (a) final edits to the legal drafts before they go live, (b) the launch decision on adaptivity gaps, (c) a list of new build items. This run changes nothing; it only reads and reports.

## HARD CONSTRAINTS — READ CAREFULLY, THESE OVERRIDE ALL STANDING AUTONOMY DEFAULTS
1. **READ-ONLY.** Do not edit, create, move, or delete ANY file outside `docs/`. The ONLY writes permitted in this entire run: the report file `docs/FORENSICS_R1_REPORT.md` and the git commit of that report plus this prompt doc. If you find a bug or gap, you record it in the report — you do NOT fix it, no matter how small.
2. **NO live services.** No Supabase queries (no anon key, no service role key), no Stripe API, no network calls, no dev server, no hitting production or previews, no package installs. Static analysis of the working tree only: source, config, and `supabase/migrations/`.
3. **NO secrets.** Never read or print the contents of `.env.local` or any env file. If a question requires knowing whether an env var is used, grep for the variable NAME in source only. The report will be attached to a chat: it must contain zero secrets, zero real user data, and no strings resembling keys — redact if a code excerpt would include one.
4. **Code is truth, prose is not.** Answer every question from implementation, never from `docs/`, comments, or README claims. Where a doc/comment claims X and code shows Y, record the mismatch as `DOC-CLAIM vs CODE-TRUTH`.
5. **If a question cannot be answered statically** (depends on runtime/device behavior), mark it `UNVERIFIABLE-STATICALLY` and specify the exact runtime check that would resolve it (so it can be folded into the pending device-test session).
6. **Approval stop:** request explicit approval before `git push origin main` (standing rule). Everything before that runs autonomously, back-to-back.

## STEP 0 — REPORT SCAFFOLD
Create `docs/FORENSICS_R1_REPORT.md` immediately with: a `RUN TIMING` line (start timestamp; update with end time and total at completion), the branch name and commit SHA analyzed (`git rev-parse HEAD`), and a method note. Append live updates to the report as each question closes.

## METHOD
Per question: locate ALL relevant code (do not stop at the first grep hit), read it, and render a verdict. Suggested starting greps are hints, not boundaries — follow imports and call chains to the end. Known landmarks: Vite + React app in `src/`, Vercel serverless routes in `api/`, schema in `supabase/migrations/`, GameEngine and activity components, Placement Adventure code (HMAC-signed ladder), `[SayItDiag]` instrumentation, tables `word_progress`, `user_stats`, `user_streaks`, `learning_events`, `product_events`, `subscriptions`.

## REPORT FORMAT (every question)
```
### <ID>. <Question title>
VERDICT: <one plain sentence>
EVIDENCE: <file:line references + minimal excerpts — enough to re-find it, no more>
CONFIDENCE: High | Medium | Low (+ why, if not High)
IMPLICATION: <which legal-draft bracket, launch decision, or build item this feeds>
```

---

## PART A — LEARNING MODEL (how the app knows where the learner is)

**A1. Placement → starting unit.** Trace the full flow from Placement Adventure completion: where is `measured_unit` computed and signed, where is it persisted, and — the crux — does the child's actual learning experience READ it to set the starting unit, or is it used only as the upsell/display number? Show the exact read site that determines where a child begins, or prove none exists.

**A2. Unit advancement rule.** What moves a child from unit N to N+1? Find the exact logic: a Quiz Boss score threshold (state the number), mere session completion, time-based, manual, or nothing. Grep starters: `nextUnit`, `advance`, `unlock`, `unit + 1`, Quiz Boss result handling.

**A3. Per-word mastery — written AND read?** Is `word_progress` (or equivalent) actually written on answers? Then the important half: does ANY code path READ per-word mastery to select activities, words, item difficulty, or session composition? A write with no reader = data collected, adaptivity absent.

**A4. Review/repetition scheduling.** Any implementation of spaced repetition, review queues, resurfacing of previously-learned words, star-dimming/Star Keeper mechanics, or interval math (grep: `SM-2`, `interval`, `review`, `dim`, `decay`, `resurface`)? Or is review design-only?

**A5. Resume state.** For a returning child: where is "current position" (unit/day/word/session) stored, and what restores it on next launch? Note any path where a returning user could land somewhere wrong (e.g., state only in localStorage, or recomputed differently than stored).

**A6. `learning_events` payload.** From migrations + write sites: exact columns and what is actually populated per answer event (word, activity type, unit, correct/incorrect, latency, timestamps, identifiers). Conclude: could mastery gating (A3) and review scheduling (A4) be built later from this data WITHOUT a schema change? Yes/no + what's missing.

---

## PART B — LEGAL/PRIVACY VERIFICATION (each maps to a [VERIFY] bracket in the policy drafts)

**B1. Say-It voice audio path — decides Privacy Policy §2b Option A vs B.** Trace microphone use end to end (grep: `SpeechRecognition`, `webkitSpeechRecognition`, `getUserMedia`, `MediaRecorder`, `SayItDiag`, any STT vendor). Answer precisely: (i) is audio processed via the browser's built-in speech API — and therefore by the browser vendor's servers (name which API)? (ii) does any audio blob ever leave the device to OUR server or any third party? (iii) is audio ever written to Supabase storage, DB, or disk, even transiently? (iv) any voiceprint/speaker-recognition capability anywhere?

**B2. Anthropic prompts — child PI check.** Enumerate EVERY call site that reaches the Anthropic API (client or serverless). For each: reconstruct the prompt template and list every user-derived variable interpolated into it. Verdict: does any prompt contain the child's name, age, or anything identifying? If yes, quote the interpolation site.

**B3. ElevenLabs payloads.** Enumerate every ElevenLabs call site. Confirm only curriculum/word/sentence text is sent — no child-derived text (name in encouragements?), and no child audio in either direction.

**B4. Deletion workflow — the flagged gap.** Does any account-deletion or child-data-deletion capability exist: UI control, API route, or admin script? If something exists, list exactly which tables and storage objects it deletes and which it MISSES (cross-check against B7's inventory). If nothing exists, say so plainly.

**B5. Self-serve cancel.** Is a Stripe customer portal (grep: `billingPortal`, `portal`) or equivalent in-app cancellation wired up — route, button, session creation? ToS §5 promises two-click online cancel; verify or flag as build item.

**B6. Signup clickwrap + policy routes.** Does the signup form gate account creation behind an unticked "I agree to the Terms of Service and Privacy Policy" checkbox with links? Do `/privacy` and `/terms` routes exist (even as stubs)? Excerpt the signup JSX around the submit path.

**B7. Child-data inventory — reality vs the draft's retention table.** From migrations + all write sites: enumerate every table, column, and storage bucket holding child-derived data. Explicitly answer: (i) is a LAST name or full birthdate collected anywhere (draft promises first name/nickname + age only)? (ii) are Draw It drawings persisted — where? (iii) anything child-derived the draft's §5 retention table does not cover?

**B8. Communications to children.** Confirm all email/notification paths target the parent's account email only — nothing collects a child contact channel or messages a child directly.

**B9. Trackers, cookies, CSP.** Grep the entire app + `index.html` + any injected scripts for third-party analytics/advertising SDKs (`gtag`, `ga(`, `fbq`, `segment`, `posthog`, `hotjar`, `plausible`, pixels). Enumerate every cookie and localStorage/sessionStorage key the app sets and its purpose. Confirm the production CSP allowlist (vercel.json/headers config) matches: only Supabase, Anthropic-via-our-API, ElevenLabs-via-our-API, Stripe, and `/api/track`. The privacy draft claims "first-party analytics only, no third-party trackers" — verify it's literally true.

---

## COMPLETION
End the report with three summary tables:
1. **LEGAL DRAFT EDITS** — each B-finding → the exact bracket in the privacy/ToS/refund drafts it resolves → required edit (e.g., "§2b: publish Option A" or "§2b: Option B + add vendor row").
2. **ADAPTIVITY VERDICT** — Tier A (placement drives start unit: PASS/FAIL; an advancement rule exists: PASS/FAIL), Tier B candidates (mastery gate / struggle step-down: feasible now? effort guess), Tier C (review scheduling: schema-ready per A6?).
3. **NEW BUILD ITEMS** — every gap discovered, one line each, severity-tagged (LAUNCH-BLOCKING / PRE-STRIPE-LIVE / POST-LAUNCH). Recorded only — nothing fixed in this run.

Then: finalize RUN TIMING, `git add docs/FORENSICS_R1_LEARNING_LEGAL.md docs/FORENSICS_R1_REPORT.md`, commit with message `forensics(r1): read-only learning-model + legal verification report`, **STOP and request approval before `git push origin main`**. Remind Sal to attach `FORENSICS_R1_REPORT.md` to the chat as a file.
