# FIX R1 — FORENSICS FOLLOW-UP: LAUNCH-BLOCKING + PRE-STRIPE-LIVE FIXES
**Written:** July 6, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/forensics-r1`
**Source of truth:** `docs/FORENSICS_R1_REPORT.md` (commit 3a36f1f findings). This run fixes the LAUNCH-BLOCKING code item (B6) and the four PRE-STRIPE-LIVE items (A1, A5, B4, B7ii). POST-LAUNCH items (A2 min-attempt gate, A6 attempt_number, difficulty step-down) are explicitly OUT of scope — log them in the report's deferred table, touch nothing else.

## STANDING RULES
Autonomous end-to-end per convention. Approval stops: `git push origin main` and any destructive operation. No migrations are expected in this run (no `supabase db push`). Never touch real user rows — all live verification uses disposable test accounts only. Report file at step 0 with a RUN TIMING line, live updates as each phase closes, full gates before merge.

## STEP 0 — SCAFFOLD
Create `docs/FIX_R1_REPORT.md` (RUN TIMING start, branch, base SHA). Create branch `fix/forensics-r1`.

## PHASE 1 — B6: SIGNUP CLICKWRAP MUST COVER THE TERMS OF SERVICE (LAUNCH-BLOCKING)
`src/screens/LoginScreen.jsx` — the existing consent checkbox (state `consentChecked`, submit-disable at :158) currently reads as parental-consent-only and links solely `/privacy`.
- **Preserve the parental-consent language exactly in substance** — it is the live COPPA consent mechanism and must not be weakened. Extend the copy so one checkbox does both jobs, e.g.: *"I am the parent or guardian of the child who will use this app, I consent to the data collection described in our [Privacy Policy], and I agree to the [Terms of Service]."* Both phrases are real links (`/privacy`, `/terms`), opening in a new tab so the signup form state isn't lost.
- Mechanical gate unchanged: box starts unchecked; submit button disabled and handler blocked until checked (sign-up mode only).
- Tests: extend/ add Playwright coverage — (a) sign-up submit disabled while unchecked, (b) both links present with correct hrefs, (c) checking enables submit. Remember the rAF/hidden-tab traps for any animation waits.

## PHASE 2 — A1: OFFLINE/FALLBACK SESSION PLAN MUST RESPECT THE PLACEMENT FLOOR (PRE-STRIPE-LIVE)
`src/hooks/useSessionPlan.js` `buildSupabaseFallbackPlan` (:167-224) computes `currentUnit` from `word_progress` alone, ignoring `placement_unit` — a freshly-placed child hitting the fallback (API error/5xx/rate limit) gets Unit-1 content.
- Apply the same floor semantics as the server (`api/session-generator.js:276,310`): when the active child's `placement_unit` is present, only units `>= placement_unit` are eligible to become `currentUnit`. The value is already available client-side — `child_profiles` select includes `placement_unit` (`src/lib/queries/childProfiles.js:14`); thread it into the fallback rather than adding a new fetch.
- Test: unit-level test of the fallback builder — empty `word_progress` + `placement_unit: 5` must yield a Unit-5 plan, not Unit 1; `placement_unit: null` preserves current behavior.

## PHASE 3 — A5: SCOPE THE SESSION-PLAN CACHE BY CHILD (PRE-STRIPE-LIVE)
`src/hooks/useSessionPlan.js` — `PLAN_CACHE_KEY = 'mw_session_plan_v3'` is not child-scoped; on multi-child (family/paid) accounts, switching children within the 60-min TTL can serve the wrong child's plan.
- Follow the codebase's own established pattern (`src/lib/queries/parentDigest.js` `cacheKey(childId)`, `src/lib/useSessionTimeLimit.js` `todayKey(childId)`): key becomes `` `mw_session_plan_v4:${childId}` ``; `getCachedPlan`/`cachePlan`/`generatePlan` take `childId` and never read a key for a different child. Delete the legacy unscoped `mw_session_plan_v3` key on first run (one-line cleanup).
- Test: cache written for child A is not returned for child B; legacy key is ignored/removed.

## PHASE 4 — B4: DELETE `product_events` ON ACCOUNT DELETION (PRE-STRIPE-LIVE)
`api/delete-account.js` — `product_events` has no FK (migration 0032) and survives deletion. After the existing Storage cleanup and **before** `auth.admin.deleteUser`:
- Delete `product_events` rows where `user_id = user.id` OR `child_id` is in the account's child-profile ids (fetch the child ids first, as the storage cleanup already does). Log the deleted-row count to the report.
- Update the route's header-comment coverage list to include `product_events`.
- Verification (preview, per convention via the branch's `DEPLOY_BASE_URL`): create a disposable test account → complete enough of the placement flow to generate `product_events` rows → run deletion through the real Settings UI → confirm, using the same verification approach as prior hardening runs, that zero `product_events` rows remain for that user/child and sign-in fails. Real user rows are never touched.

## PHASE 5 — B7(ii): REMOVE THE FALSE "DRAWINGS" CLAIMS (PRE-STRIPE-LIVE, COPY-ONLY)
Draw It no longer persists any artifact (its own header comment, DrawIt.jsx:23-30), but two user-facing strings still promise drawings are stored/deleted:
- `src/screens/parent/SettingsTab.jsx:190` — deletion confirmation copy: drop "and drawings" (keep the rest verbatim).
- `src/pages/PrivacyPolicy.jsx:41` — same minimal removal. **Do NOT rewrite these legal pages** — full counsel-approved text lands in a later pass; this is only the removal of a factually false claim. Leave `api/delete-account.js`'s drawings-bucket cleanup in place (harmless, and correct if legacy objects exist).

## PHASE 6 — DOCS: EXTEND THE DEVICE CHECKLIST (1 minute)
Append a step 7 to `docs/DEVICE_TEST_CHECKLIST.md`: *"Say-It browser check (B1 runtime item): with DevTools Network tab open, run one Say-It attempt in Chrome and Safari; note which external endpoints the BROWSER itself contacts for speech recognition (the app's own traffic will show none). Screenshot per browser."*

## PHASE 7 — OPTIONAL, GATED: B2 NAME-SWAP (execute ONLY if the kickoff message contains `NAME-SWAP: YES`; otherwise skip and mark SKIPPED in the report)
Goal: stop sending the child's first name to Anthropic while preserving personalized output. In `api/story-engine.js:135` and `api/parent-digest.js:51`, replace `${childName}` in the prompt with the literal token `[CHILD]` plus an instruction that `[CHILD]` is the child's name and must appear verbatim wherever the name would; after the model responds, the server substitutes the real name for every `[CHILD]` occurrence before persisting/returning. Add a guard: if the response contains zero `[CHILD]` tokens where one is expected, log a warning (do not fail the request). Verify with one real generation per endpoint on preview and eyeball story quality. If quality degrades, revert this phase and note it — the privacy policy's disclosure path already covers the status quo.

## GATES → SHIP
Full suite: build, lint, complete Playwright run (re-run any provisioning-flake failures in isolation before calling regression), plus the new tests above. Then: merge to main → **approval stop** → `git push origin main` → production verify (signup page shows the new checkbox copy with both working links; one smoke pass of Home/session load on a test child) → finalize RUN TIMING → commit this prompt doc + `docs/FIX_R1_REPORT.md` → docs push.

Report ends with: per-phase before/after evidence, gate results, the deferred POST-LAUNCH table (A2, A6, difficulty step-down), and Phase 7 status.
