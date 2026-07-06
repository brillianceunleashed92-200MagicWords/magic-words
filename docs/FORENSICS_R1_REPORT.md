# FORENSICS R1 REPORT — READ-ONLY: Learning Model + Legal/Privacy Verification

## RUN TIMING
- Start: 2026-07-06T15:31:17Z
- End: 2026-07-06T15:46:36Z
- Total: ~15 minutes, fully autonomous (no approval waits during the analysis itself; the only approval gate, `git push origin main`, is requested at the end per the doc's own instruction)

## SCOPE
- Branch: `main`
- Commit analyzed: `3a36f1f94e70a96b9476500d4c273b01a9884b61`
- Type: READ-ONLY static analysis. No live services, no secrets, no edits outside `docs/`.

## METHOD
Per question: locate all relevant code (not just first grep hit), read it directly, follow imports/call chains to their actual termination, then render VERDICT/EVIDENCE/CONFIDENCE/IMPLICATION. Static analysis only — no Supabase/Stripe/Anthropic/ElevenLabs network calls, no dev server. Where a question depends on runtime/device behavior not resolvable from source, marked `UNVERIFIABLE-STATICALLY` with the exact runtime check that would resolve it. Where a doc/comment claim conflicts with what the code actually does, recorded as `DOC-CLAIM vs CODE-TRUTH`.

---

## PART A — LEARNING MODEL

### A1. Placement → starting unit.
VERDICT: The child's actual learning experience DOES read the placement result to set the starting unit — but it reads the FLOORED `placement_unit`, never the true `measured_unit`. Two independent, correctly-implemented read sites exist; `measured_unit` has exactly zero read sites outside the Parent Portal display.
EVIDENCE:
- Write: `api/session-generator.js:425-436` (`finalize()`) writes `placement_unit: placementUnit` (already `min(trueMeasuredUnit, FREE_TIER_MAX_UNIT)` for free plans) and `measured_unit: trueMeasuredUnit` in the same `child_profiles` update.
- Server read (determines session content): `api/session-generator.js:243` (`fetchChildContext` returns `placementUnit: childRow.placement_unit ?? null`) → passed into `selectCandidateWords(admin, plan, progress, reviewOnly, placementUnit)` at `api/session-generator.js:518` → used as `effectiveFloor` at line 276 → gates which units are eligible to become `currentUnit` at line 310 (`.filter((u) => !effectiveFloor || u >= effectiveFloor)`).
- Client read (determines Home's "Today's Magic Word"): `src/lib/useCandyGalaxyData.js:84-90` — `placementFloor` derived from `activeChild?.placement_unit`, filters `currentWord` selection to `w.unit >= placementFloor`.
- `measured_unit` full-codebase grep: written once (`api/session-generator.js:428`), read exactly twice, both in `src/screens/parent/DashboardTab.jsx:54,58` (the free-tier upsell banner). Never referenced in `api/session-generator.js`'s selection logic, `useCandyGalaxyData.js`, or any session/quiz component.
- **Real gap found**: the client-side offline/API-failure fallback (`src/hooks/useSessionPlan.js:167-224`, `buildSupabaseFallbackPlan`, triggered whenever `/api/session-generator` itself errors — network failure, 5xx, or the endpoint's own 10/min rate limit) computes `currentUnit` from `word_progress` mastery alone (line 192-198) with **no reference to `placement_unit` at all**. A placed child (e.g., measured at Unit 9, floored to Unit 5) who hits this fallback — a real, documented, rate-limited endpoint — would silently get Unit-1-upward content until the fallback resolves, since a freshly-placed child's `word_progress` is empty by design (`finalize()` never fabricates it).
CONFIDENCE: High — both read sites and the fallback gap are direct, unambiguous code reads, not inference.
IMPLICATION: Tier A adaptivity PASS for the primary path. New build item: the offline fallback should read `placement_unit` too (currently only present in the primary server path) — PRE-STRIPE-LIVE severity, since it's a real (if narrow-window) placement-floor bypass, not launch-blocking on its own.

### A2. Unit advancement rule.
VERDICT: No explicit "advance to unit N+1" event, flag, or threshold exists. Advancement is an emergent side-effect of the SAME stateless per-session `currentUnit` scan used for the placement floor: a unit stops being selected as current the moment every word in it individually has `mastery >= 80`. Because `mastery` is `round(correct_count / attempt_count * 100)`, a word reaches 80+ after its very first correct answer (100%) — so in practice a unit can "complete" after each of its words has been answered correctly just once, with no minimum-attempt gate at the selection layer (unlike the celebration UI, which does require `attempt_count >= 3` — a real, separate threshold, see EVIDENCE).
EVIDENCE:
- Selection-layer mastery gate (no attempt-count check): `api/session-generator.js:305-316` — `currentUnit` walks units in ascending order; `hasUnmastered = withProgress.some((w) => w.unit === unit && w.mastery < MASTERED_THRESHOLD)` (`MASTERED_THRESHOLD = 80`, line 29) with no `attemptCount` condition.
- Mastery formula: `src/lib/queries/wordProgress.js:35-38` — `masteryScore = Math.round((correctCount / attemptCount) * 100)`; first-ever correct answer → `1/1 = 100`.
- Contrast — the UI celebration DOES gate on attempts, but that's a display concern, not the advancement mechanism: `src/screens/PlayScreen.jsx:26,44` — `isRealMastery = mastery >= 80 && attemptCount >= 3`.
- Quiz Boss (`flash_cards`) does NOT gate advancement — confirmed it draws only from already-encountered words for review, never new-unit content: `api/session-generator.js:254-266` (comment) + `reviewOnly` branch at 318-345 filters to `w.attemptCount > 0`.
CONFIDENCE: High.
IMPLICATION: Tier A adaptivity PASS (an advancement rule exists and is code-verified), but flag the mastery-vs-celebration threshold mismatch as a build item — a unit can silently "complete" (stop offering new words) faster than the UI ever celebrates it, which could read as the app running out of content prematurely for a fast-guessing child. POST-LAUNCH tuning item, not blocking.

### A3. Per-word mastery — written AND read?
VERDICT: Yes to both, unambiguously — `word_progress` is the real driver of adaptivity (unit selection AND Home's "current word"), not just collected telemetry.
EVIDENCE:
- Write: `src/lib/queries/wordProgress.js:24-58` (`useSaveWordProgressMutation`) — upserts `mastery`, `correct_count`, `attempt_count`, `next_review_at`, `review_interval_days` keyed on `(child_id, word)`, called from `src/screens/PlayScreen.jsx:127-144` (`handleProgress`) on every answer.
- Read #1 (session content selection): `api/session-generator.js:294-368` — `currentUnitWords`, `dueForReview`, and the unit-advancement scan (A2) all read `mastery`/`next_review_at` from `word_progress` (via the `progress` param, fetched in `fetchChildContext`).
- Read #2 (Home's recommended word): `src/lib/useCandyGalaxyData.js:87-90` — `currentWord` is the first word with `mastery < MASTERED_THRESHOLD`.
- Read #3 (Galaxy map status, mastery display): confirmed present via the same `words` derivation feeding `unitsById`/`sleepyStars`/`masteredCount` in the same file (lines 44-100).
- Caveat worth flagging: `SCORELESS_GAME_TYPES` (`draw_it`, `word_builder` — `src/lib/queries/questProgress.js`) always report `correct: true` regardless of actual performance (confirmed in each component directly, per that file's own comment), so mastery for words practiced ONLY through those two activity types climbs to 100 without ever reflecting a real pass/fail signal. A pre-existing, documented characteristic (see `CELEBRATION_COMPLETION_FIX_REPORT.md`'s STARS section for the same finding at the celebration-display layer) — not new, but relevant to restate here since it bears directly on A3's "does mastery mean anything" question.
CONFIDENCE: High.
IMPLICATION: Tier A/B adaptivity building block confirmed real, not aspirational.

### A4. Review/repetition scheduling.
VERDICT: A real, working spaced-repetition implementation exists ("Star Keeper") — a fixed 5-rung interval ladder, not full SM-2 — and it IS consumed by session selection, not design-only.
EVIDENCE:
- Implementation: `src/lib/starKeeper.js` — `REVIEW_LADDER_DAYS = [1, 3, 7, 14, 30]`; `nextReviewInterval` advances one rung on a correct review, resets to rung 0 (1 day) on a miss; `computeNextReviewAt` writes `next_review_at`.
- Write site: `src/lib/queries/wordProgress.js:32,44-45` — every answer calls `computeNextReviewAt(existing?.review_interval_days ?? 1, correct)` and persists `next_review_at`/`review_interval_days`.
- Consumption in session selection: `api/session-generator.js:301` (`dueForReview` computed from `next_review_at <= now`) and line 349 (`dueForReview` words from OTHER units are mixed into the active pool alongside current-unit words).
- Consumption in UI ("sleepy stars"): `src/lib/starKeeper.js:22-25` (`isStarSleepy`) read by `src/lib/useCandyGalaxyData.js:92-95` (`sleepyStars`) — drives the Home screen's "wake up your sleepy star" review prompt.
CONFIDENCE: High.
IMPLICATION: Tier C adaptivity PASS — review scheduling is live, not merely schema-ready.

### A5. Resume state.
VERDICT: "Current position" (unit, current word, due-for-review words) is never stored as an explicit pointer — it's recomputed fresh every load from `word_progress` + `placement_unit`, both server-persisted (Supabase), which is a robust design with one real exception: the client-side session-PLAN cache is keyed by a fixed string, not by child, so a parent switching between multiple children within the same browser session can receive a stale, wrong-child session plan.
EVIDENCE:
- No stored "current unit"/"current word" pointer anywhere — confirmed by A1/A3's read sites, which all recompute from `word_progress` + `placement_unit` on every read, not from a cached position field.
- **Real gap**: `src/hooks/useSessionPlan.js:21` — `PLAN_CACHE_KEY = 'mw_session_plan_v3'`, a fixed sessionStorage key with **no `childId` in it**. `getCachedPlan()` (lines 25-37) and `cachePlan()` (lines 39-48) never take or check `childId`. `generatePlan()` (line 63-103) checks this unscoped cache FIRST (line 66-71) before calling the API, and returns it verbatim if present and <60 min old (`PLAN_TTL_MINUTES = 60`, line 22) — regardless of which child is currently active.
- Multi-child support is real and live, making this reachable: `src/lib/queries/childProfiles.js` (`FAMILY_TIER_MAX_CHILDREN = 4`), `useUIStore`'s `activeChildId`, `CandyGalaxyShell.jsx`'s child switcher.
CONFIDENCE: High for the gap's existence; Medium on real-world frequency (requires: family plan, 2+ children, switching children within a 60-minute window) — noted as `UNVERIFIABLE-STATICALLY` for actual user-visible impact frequency; the runtime check that would resolve it is a live two-child account switching children mid-session and confirming which child's words render.
IMPLICATION: New build item — scope `PLAN_CACHE_KEY` by `childId` (e.g. `` `mw_session_plan_v3:${childId}` ``). PRE-STRIPE-LIVE severity (family plan is the paid tier this affects).

### A6. `learning_events` payload.
VERDICT: `learning_events` is a raw per-answer event log distinct from `word_progress` (the aggregate table that actually drives adaptivity, per A3/A4) — it is written and read, but for "did the child do activity X on word Y today" (guided-path completion + weekly parent stats), never for mastery gating or review scheduling. Mastery gating and review scheduling are **already built**, just from `word_progress`, not from replaying `learning_events`. If someone wanted to derive them from `learning_events` alone, the raw signal (word, correct, timestamp) is sufficient in principle, EXCEPT `attempt_number` is a hardcoded constant, not a real sequence — any such derivation would have to order by `recorded_at`, not trust the stored `attempt_number` value.
EVIDENCE:
- Live schema (verified directly against production via `information_schema.columns`, not assumed from migrations — this table predates the migration workflow and has no `CREATE TABLE` in `supabase/migrations/`): `id, child_id, word, game_type, correct, response_time_ms, attempt_number, recorded_at, user_id, session_id`.
- Write site: `src/screens/PlayScreen.jsx:135-143` — inserts `user_id, child_id, word, game_type, correct, response_time_ms, attempt_number: 1`. **`attempt_number` is hardcoded to the literal `1` on every single row, never incremented** — the column exists but carries no real sequence information. `session_id` is never included in the insert (always NULL).
- Read site #1: `src/lib/queries/questProgress.js:11-38` (`useTodayWordActivityQuery`) — selects `game_type, correct, recorded_at` filtered to today, per child+word, to drive the guided path's "which activities are done today" node states. Its own comment (line 4-6) states plainly: "`learning_events` is the only live 'did the child do X today' signal that exists."
- Read site #2: `src/lib/queries/weeklyStats.js:33` — feeds the Parent Portal's weekly stats card (words/minutes this week), also from raw events, not `word_progress`.
- Neither read site touches mastery gating (A2/A3) or review scheduling (A4) — those exclusively read `word_progress`.
CONFIDENCE: High.
IMPLICATION: No schema change needed for anything currently built (A2-A4 already work from `word_progress`). If a FUTURE feature wanted event-level replay (e.g., a real attempt-sequence audit), `attempt_number`'s hardcoded-`1` behavior is a build item worth fixing first (POST-LAUNCH, cosmetic/latent — nothing live depends on its value today).

---

## PART B — LEGAL/PRIVACY VERIFICATION

### B1. Say-It voice audio path — decides Privacy Policy §2b Option A vs B.
VERDICT: Neither Option A nor Option B as drafted is exactly correct. The app never touches raw audio itself (no `getUserMedia`, no `MediaRecorder`, no audio ever reaches OUR server or storage) — but it exclusively uses the **browser's own built-in `SpeechRecognition`/`webkitSpeechRecognition` Web Speech API**, which the draft's own third bullet already anticipates: "if the app uses the browser's built-in speech recognition... audio may be processed by the browser vendor's servers. That vendor must then be disclosed." That third bullet is the one that applies — not a clean Option A, and not Option B either (since nothing is ever retained or reaches our infrastructure).
EVIDENCE:
- Sole mechanism: `src/games/SayItWithNova.jsx:67-69` — `SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition`. No `getUserMedia`/`MediaRecorder` anywhere in this file or its imports.
- (i) Processed via browser's built-in API: **yes**, confirmed above. The specific vendor/server is a function of the end user's browser (Chrome routes through Google's speech backend for this API; exact backend for other browsers is that vendor's own implementation detail) — this specific sub-fact is `UNVERIFIABLE-STATICALLY` from this app's code, since it depends on browser-vendor internals, not anything in this repo. The runtime check that would resolve it: network-tab inspection while using Say It in each target browser (Chrome/Safari/Edge) to see which endpoints the browser itself contacts — this app's own network traffic never touches it.
- (ii) Audio blob leaving to OUR server or third party: only ever a **text transcript** ever reaches this code — `recognition.onresult` at `src/games/SayItWithNova.jsx:164-186` reads `event.results[0]...transcript` (strings), never raw audio. Nothing in this component ever constructs a fetch/upload with audio data.
- (iii) Written to Supabase storage/DB/disk: **no** — the only side effects in `startListening`/`onresult`/`onerror`/`onend` are React state updates and `console.log` diagnostic lines (`logSpeechEvent`, line 21-24, e.g. `{ seq, heard, alternatives }` — text only, no audio, and console output is never sent anywhere).
- (iv) Voiceprint/speaker-recognition: none anywhere in this file or its call graph — the only comparison is `normalize(transcript) === normalize(target word)` (line 9-10, 167-169), a text match, not biometric.
CONFIDENCE: High for (ii)/(iii)/(iv). Medium/`UNVERIFIABLE-STATICALLY` for the exact vendor in (i) — the fact that a browser vendor is involved is High confidence; which vendor's servers depends on runtime browser choice.
IMPLICATION: Privacy Policy §2b needs a **new, precise disclosure** — not Option A or B as currently drafted. Recommended language direction: "the audio is processed by your browser's own built-in speech-recognition feature (not our servers) to compare what was said to the target word; we never receive, store, or retain the audio ourselves, and create no voiceprint — but your browser (e.g., Chrome) may send the audio to its own speech-recognition service as part of that built-in feature, governed by that browser's own privacy policy." Feeds LEGAL DRAFT EDITS directly. LAUNCH-BLOCKING (this is the flagged §2b gap the whole forensics run was commissioned to resolve).

### B2. Anthropic prompts — child PI check.
VERDICT: Two of three live call sites DO include the child's real first name directly in the prompt text; the third does not. No call site includes age or any other identifier. This contradicts the privacy draft's hoped-for "strip it" outcome — the correct resolution is disclosure, not code changes (out of scope for this read-only run regardless).
EVIDENCE:
- **`api/story-engine.js:135`** — `buildPrompt`: `` `You are writing a 100%-decodable early-reader story for a child named ${childName} (age 4-8)...` `` — the literal child's name is interpolated. (`(age 4-8)` is a fixed template phrase describing the product's target age band, not the individual child's real age — confirmed by grepping for any `.age`/`childAge` variable in this file: none found.) Also interpolates `theme` (from the child's closed-list interests) and the allowed-word list — no other identifiers.
- **`api/parent-digest.js:51`** — the prompt template: `` `You write a short weekly progress update for a parent whose child (name: ${childName}) uses a literacy app...` `` — same pattern, child's real name interpolated directly.
- **`api/session-generator.js:569-593`** — the one Anthropic call site that does NOT include the child's name: prompt interpolates only `difficultyLevel`, `currentUnit` (a number), `sessionWords` (word text + numeric mastery %), and `wordHistory` (word/mastery/attempts/correctRate/lastSeen — no identifiers). Confirmed via full read of the prompt template.
- **`api/ai-helper.js`** — a fourth file reaching Anthropic-adjacent logic exists but is dead code: zero references from `src/` (confirmed via `grep -rn "ai-helper" src/` → no results), and independently already proven unreachable by `scripts/check-no-emoji.mjs`'s own reachability check on this exact file.
- No `.age`/age-like variable interpolated in any of the three live prompts.
CONFIDENCE: High.
IMPLICATION: Privacy Policy's Anthropic service-provider row (currently `[VERIFY: ... If the child's first name is currently included in prompts, either strip it or disclose it here]`) must be resolved as **disclose**, not strip (a code change to strip it is out of scope for this read-only run and not requested). LAUNCH-BLOCKING for the policy language (matches what `COPPA_DATA_INVENTORY.md` already correctly discloses — this is a case where the existing internal doc was already accurate and the PUBLIC-FACING draft just needs to catch up to it).

### B3. ElevenLabs payloads.
VERDICT: Confirmed — only curriculum/word/sentence text is ever sent to ElevenLabs, through exactly one server-side call site; no child-derived personal text (including the child's name) and no child audio in either direction.
EVIDENCE:
- Sole call site: `api/speak.mjs:77-92` — sends only `content` (a trimmed, control-character-stripped, ≤300-char text string derived from the request body's `word`/`text` field) to ElevenLabs' TTS endpoint. No `user_id`/`child_id`/name/any identifier is included in the request body sent upstream (confirmed by reading the full fetch call, lines 77-91).
- Response caching is content-hash-keyed, not user/child-keyed: `cacheKeyFor` (line 7-9) hashes the text itself (`sha256(text)`), so cache entries are shared/generic across every user — no per-child audio is ever stored, only per-*text-string* audio (curriculum words and fixed question templates, reusable by any child studying that word).
- Traced every client-side text producer that reaches this endpoint (`src/lib/useSpeak.js`, `src/lib/useWordSpeak.js`, `src/components/candy/useKaraokeNarration.js`, `src/games/GameEngine.jsx`'s quiz question builders): all pass curriculum words, fixed question templates (e.g. "Which picture shows a cat?"), or story sentences (vocabulary-controlled, from `api/story-engine.js`) — never a child-name-including string.
- Specifically checked whether either on-screen child-name greeting is ever spoken aloud (which would send it to ElevenLabs via `/api/speak`): Home's "Hey {childName}!" (`src/screens/HomeScreen.jsx:91`) is a plain, non-interactive `<span>` — no `onClick`/`speak()` call wraps it (confirmed by reading the surrounding JSX, lines 85-99); the nearby `speak`/`speakWord` props are wired to OTHER elements (word pills, activity names, trophies), not this greeting. SessionComplete's "You powered Nova up, {childName}!" (`src/games/GameEngine.jsx`) — confirmed `GameEngine.jsx` never imports `useSpeak`, so this text is never routed through TTS at all.
- AI-generated `encouragements` (from `session-generator.js`'s Anthropic call, B2) cannot contain the child's name even if spoken, since that prompt never gives the model the name to begin with (see B2).
CONFIDENCE: High.
IMPLICATION: Privacy Policy's ElevenLabs row (`[VERIFY: confirm only curriculum/word text is sent — no child personal information, no child voice audio]`) can be **confirmed as drafted**, no edit needed beyond removing the `[VERIFY]` bracket itself.

### B4. Deletion workflow — the flagged gap.
VERDICT: A real, working, comprehensive account/child-data deletion capability EXISTS — UI control, API route, and verified DB cascade — contrary to the drafts' framing of this as an open/unresolved gap. One real omission found: `product_events` rows are NOT covered by the cascade and survive account deletion indefinitely.
EVIDENCE:
- UI control: `src/screens/parent/SettingsTab.jsx:29,38-45,176,186` — a `deleteStep` state machine (idle → confirming → deleting → error) with an explicit confirmation step, calling `/api/delete-account` with `{ confirm: 'DELETE' }`.
- API route: `api/delete-account.js` — requires a verified JWT (`getVerifiedUser`, never trusts a client-supplied ID), requires the literal string `'DELETE'` in the body, then (1) explicitly removes every Storage object under `drawings/{parent}/{child}/*` for every child (lines 48-55, since Postgres FK cascades don't reach Storage), then (2) calls `admin.auth.admin.deleteUser(user.id)`.
- Cascade coverage, per the file's own header comment (lines 9-19) confirmed against migration 0018's FK fixes: `child_profiles, word_progress, user_stats, user_streaks, learning_events, learning_plans, achievements, magic_moments, stories, session_plans, parent_settings, subscriptions, parent_child_links` — a genuinely broad list, and the comment states this was "verified live against a real test account, not just inferred from the migration."
- **Real gap found**: `product_events` (`supabase/migrations/0032_placement_adventure.sql:41-51`) has plain `user_id uuid` / `child_id uuid` columns with **no foreign key constraint at all** (no `references`, no `on delete cascade`) — confirmed by reading the full `CREATE TABLE`. It is absent from `delete-account.js`'s own cascade-coverage list, and correctly so (nothing would cascade it). This means placement-adventure event rows (`placement_started/completed/skipped/retaken` + a jsonb `payload`) referencing a deleted user/child's UUID persist forever unless a separate purge job exists (none found).
CONFIDENCE: High.
IMPLICATION: The Privacy Policy's `[VERIFY: confirm an account-deletion / child-data-deletion control exists in the app]` bracket resolves to **yes, it exists and works** — good news, simplifies that section. New build item: either add `product_events` cleanup to `delete-account.js` (delete rows matching the user's/child's UUIDs) or add an explicit note to the retention table that analytics event rows are excluded from immediate deletion and rely on the 18-month analytics retention/aggregation policy instead (Section 5's own existing language already anticipates this for analytics broadly — this just needs `product_events` explicitly named as the mechanism). PRE-STRIPE-LIVE severity (a real, if narrow, data-retention promise mismatch).

### B5. Self-serve cancel.
VERDICT: Confirmed — a real Stripe customer billing portal is fully wired: UI button → secured API route → Stripe session → browser redirect. ToS §5's "two clicks, same medium" promise is met.
EVIDENCE:
- UI: `src/screens/parent/SettingsTab.jsx:71-80` — "Manage subscription" button calls `portalSession.mutate()` (only rendered for `plan === 'family'`, i.e., paid subscribers).
- Mutation: `src/lib/queries/checkout.js:19-36` (`useCreatePortalSession`) — POSTs to `/api/create-portal-session` with a verified JWT auth header, then `onSuccess: window.location.href = data.url` — a real, full-page redirect to Stripe's hosted portal, not a dead-end or stub.
- API: `api/create-portal-session.js` — derives the caller's identity from a verified Supabase JWT only (explicitly hardened against a prior vulnerability where a client-supplied `userId` let anyone open another account's billing portal, per the file's own header comment), looks up `stripe_customer_id` from the `subscriptions` table, and calls `stripe.billingPortal.sessions.create(...)`.
CONFIDENCE: High.
IMPLICATION: ToS §5 and the Cancellation & Refund Policy's `[VERIFY: the Stripe customer portal ... must be enabled and linked before launch]` brackets can both be **confirmed as met** — remove the brackets, no build item.

### B6. Signup clickwrap + policy routes.
VERDICT: `/privacy` and `/terms` both exist as real, routed pages. A consent checkbox DOES gate account creation (unticked by default, submit button disabled until checked) — the clickwrap MECHANISM works. But the checkbox's wording and links do not match what the Terms of Service draft's own implementation note requires: it is framed entirely as parental-consent-to-data-collection, links only to `/privacy`, and never mentions or links the Terms of Service at all.
EVIDENCE:
- Routes exist: `src/main.jsx:45-46` — `<Route path="/privacy" element={<PrivacyPolicy />} />`, `<Route path="/terms" element={<TermsOfService />} />`, both rendering real page components (`src/pages/PrivacyPolicy.jsx`, `src/pages/TermsOfService.jsx`), not stubs.
- Checkbox gates submission: `src/screens/LoginScreen.jsx:17` (`consentChecked` starts `false`), `:27-30` (submit blocked server-side-of-the-handler with an error message if unchecked on sign-up), `:158` (`disabled={busy || (authMode === "sign_up" && !consentChecked)}` — the submit button itself is disabled, a real, mechanical gate, not just a soft warning).
- **Mismatch with the ToS's own spec**: the checkbox text (`:140-144`) reads *"I am the parent or guardian of the child who will use this app, and I consent to the data collection described in our [Privacy Policy link]."* — this is COPPA parental-consent language, not the "I agree to the Terms of Service and Privacy Policy" phrasing the ToS draft's implementation note explicitly calls for (`200MW_terms_of_service_DRAFT.md` line 11). The Terms of Service is **never linked or referenced anywhere in the signup flow** — confirmed by reading the entire `LoginScreen.jsx` component; the only hyperlink present is to `/privacy`.
CONFIDENCE: High.
IMPLICATION: `DOC-CLAIM vs CODE-TRUTH` — the ToS's own `[VERIFY: confirm the signup flow has this]` note assumed a generic dual-agreement checkbox; code shows a parental-consent-only checkbox missing the ToS link entirely. New build item, **LAUNCH-BLOCKING**: add a Terms of Service link/reference to the signup consent checkbox (either broaden the existing checkbox's copy and links, or add a second required checkbox) before launch — courts don't reliably enforce agreement to a document never presented or linked at the moment of assent.

### B7. Child-data inventory — reality vs the draft's retention table.
VERDICT: (i) No last name or full birthdate is collected anywhere — confirmed clean. (ii) Draw It drawings are **not** persisted at all — the activity was rebuilt into letter-tracing with no image/canvas artifact, and the code's own comments say so explicitly; the `drawings` Storage bucket and its references in `delete-account.js`/Settings/Privacy-Policy copy are now vestigial, describing a capability that no longer exists. (iii) `product_events` (B4) is real child-derived data (`child_id`, event type, jsonb payload) not named anywhere in the draft's retention table.
EVIDENCE:
- (i) The actual, current `child_profiles` column list — read from the live query itself, not a migration guess: `src/lib/queries/childProfiles.js:14` — `id, name, age, avatar, interests, created_at, placement_unit, placement_completed_at, measured_unit`. No `last_name`, no `dob`/`birth_date`/`birthdate` column anywhere in any migration (confirmed via a full-repo grep, zero matches). `avatar` is a selectable icon identifier, not a photo (confirmed by absence of any image-upload path for it).
- (ii) `src/games/DrawIt.jsx`'s own header comment (lines 23-30) states plainly: *"The old canvas's PNG-to-Storage + magic_moments write is gone along with the canvas itself — there is no freeform artifact left to save."* Confirmed independently: zero references to `storage`/`upload`/`supabase` anywhere in `DrawIt.jsx` (grepped directly). Meanwhile `api/delete-account.js:48-55` still actively cleans the `drawings` Storage bucket (migration `0010_storage_buckets.sql`), and both `SettingsTab.jsx:190` ("progress, streaks, stories, and drawings") and `PrivacyPolicy.jsx:41` ("...stories, and drawings immediately") still describe drawings as if actively created today. This is a real, direct `DOC-CLAIM vs CODE-TRUTH`: the drawings bucket/cleanup/copy are leftovers from a prior implementation (per Draw It's own rebuild comment), not describing current behavior.
- (iii) `product_events` schema (`supabase/migrations/0032_placement_adventure.sql:41-51`): `event_type, user_id, child_id, payload jsonb` — real, live, child-linked data (placement-adventure funnel events) with no corresponding row in the Privacy Policy's §5 retention table (which only lists "Product analytics events" generically — arguably covers it, but `product_events` is a distinct table from whatever powers general analytics and isn't named).
CONFIDENCE: High on all three.
IMPLICATION: (ii) is the most consequential — recommend either restoring the retention-table/deletion-copy language to reflect that Draw It currently creates **no persisted artifact** (simpler, and accurate), or flagging to product that if drawing persistence is wanted back, it needs to be rebuilt (out of scope for this read-only run either way). (iii) folds into B4's build item. PRE-STRIPE-LIVE severity for the copy correction; not launch-blocking since it errs toward *overstating* data collected, not understating it (no COPPA risk in the current mismatch's direction).

### B8. Communications to children.
VERDICT: Confirmed — all communication targets the parent's account email only. No child contact channel exists anywhere in the schema or code, and nothing messages a child directly.
EVIDENCE:
- No custom email-sending code exists anywhere in the app: a full grep for `sendEmail`/`resend`/`sendgrid`/`nodemailer`/`smtp` across `api/` and `src/` returns zero matches. The only emails ever sent are Supabase Auth's own built-in transactional emails (confirmation, password reset, etc.), which are addressed to the account email supplied at signup — the parent's email, since child profiles have no email field at all (confirmed by B7's column list: `id, name, age, avatar, interests, created_at, placement_unit, placement_completed_at, measured_unit` — no contact field of any kind).
- `api/parent-digest.js`'s AI-generated weekly digest is never emailed — it's fetched and displayed in-app only: `src/screens/parent/DashboardTab.jsx:4` imports `useParentDigest`, which fetches `/api/parent-digest` for in-app rendering (`src/lib/queries/parentDigest.js`). No mail-send call exists in that path.
- There is structurally no mechanism BY WHICH a child could be messaged directly — a child profile is a row under the parent's account with no independent contact identifier, not a separate addressable entity.
CONFIDENCE: High.
IMPLICATION: Privacy Policy §3's "we never send marketing communications to children" and the general "communications target parents" framing can be **confirmed as accurate** — no edit needed.

### B9. Trackers, cookies, CSP.
VERDICT: Confirmed — no third-party analytics/advertising SDKs anywhere in the app; every localStorage/sessionStorage key is first-party and functional (never a tracking pixel/ID); and the live production CSP's `connect-src` allowlist matches the "first-party analytics only, no third-party trackers" claim exactly, since Anthropic/ElevenLabs are only ever reached via this app's own `/api/*` routes (same-origin), never directly from the browser.
EVIDENCE:
- Third-party analytics/ad SDK grep across `index.html` + `src/`: zero real matches for `gtag`/`ga(`/`fbq`/`segment`/`posthog`/`hotjar`/`plausible`/`mixpanel`/`amplitude` (the only hits were unrelated identifier names — `segmentHeight`/`amplitude` in `src/lib/buildGalaxyPath.js`'s geometry math, and the word "plausible" inside an unrelated code comment in `SayItWithNova.jsx`).
- Every localStorage/sessionStorage key in the app, enumerated by reading each call site directly (none are third-party trackers, all are this app's own functional state):
  - `mw_session_plan_v3` (sessionStorage) — cached session plan, `src/hooks/useSessionPlan.js` (see A5's finding: not child-scoped).
  - `mw_paywall_viewed:${surface}` (sessionStorage) — per-surface paywall-impression dedup, `src/lib/queries/track.js`.
  - `` `<childId-scoped key>` `` (localStorage) — cached AI weekly digest, `src/lib/queries/parentDigest.js:7` (`cacheKey(childId)`, properly child-scoped, unlike the session-plan cache).
  - `` `<childId-scoped key>` `` (localStorage) — daily session-time-limit counter, `src/lib/useSessionTimeLimit.js:5` (`todayKey(childId)`, also properly child-scoped).
  - `mw_difficulty_governor_log_v1` (localStorage) — rolling recent-answer log for the difficulty governor, `src/lib/difficultyGovernor.js`.
  - `mw_muted` (localStorage) — audio mute preference, `src/games/gameAudio.js`.
  - Plus Supabase's own auth-session storage (`sb-ozhqsaysltiamadpcruz-auth-token`, set by the `@supabase/supabase-js` client itself, not application code) — session/auth persistence, not tracking.
- Production CSP, read directly from `vercel.json`'s current (enforcing, per the prior Prompt-10 pass) header value: `connect-src 'self' https://ozhqsaysltiamadpcruz.supabase.co` — only same-origin and Supabase are allowed as direct fetch/XHR targets. Anthropic and ElevenLabs are correctly absent from `connect-src` because the app never calls them directly from the browser — only via this app's own `/api/story-engine`, `/api/parent-digest`, `/api/session-generator`, `/api/speak` routes (same-origin, covered by `'self'`), matching the policy draft's own "Anthropic-via-our-API, ElevenLabs-via-our-API" framing exactly. Stripe appears only in `form-action 'self' https://checkout.stripe.com` (for the hosted Checkout/portal redirect), not `connect-src` — correct, since those are full-page navigations, not fetch calls. `/api/track` (confirmed to exist: `api/track.js`, called from `src/lib/queries/track.js:19`) is same-origin, needing no separate CSP entry.
CONFIDENCE: High.
IMPLICATION: Privacy Policy §2c's "first-party analytics only... no third-party trackers" claim can be **confirmed as literally true**, no edit needed. B9 also independently reinforces A5's `mw_session_plan_v3` cross-child-scoping finding by cataloguing it alongside the two localStorage keys that got child-scoping right (`parentDigest`, `useSessionTimeLimit`) — useful evidence that the fix pattern already exists elsewhere in the codebase and just wasn't applied consistently to the session-plan cache.

---

## COMPLETION

### 1. LEGAL DRAFT EDITS

| Finding | Bracket | Required edit |
|---|---|---|
| B1 | Privacy Policy §2b, Say-It voice bullet | Replace both Option A/B placeholders with new language: audio is processed by the browser's own built-in speech-recognition feature (not our servers); we never receive/store/retain it and create no voiceprint — but the browser vendor's own speech service may process it as part of that OS/browser-level feature, governed by that vendor's own policy. |
| B2 | Privacy Policy §4 service-provider table, Anthropic row | Resolve as **disclose**, not strip: state plainly that the child's first name is included in Story Time and the weekly parent-digest prompts sent to Anthropic (session-generation prompts do not include it). |
| B3 | Privacy Policy §4 service-provider table, ElevenLabs row | Confirmed as drafted — remove the `[VERIFY]` bracket, no wording change needed. |
| B4 | Privacy Policy §4 (deletion mechanism) + §5 retention table | Remove the "flagged gap" framing — the deletion control exists and works (name/link the actual in-account control). Add `product_events` to the retention table or explicitly fold it under the existing analytics-retention line. |
| B5 | ToS §5 / Cancellation & Refund Policy | Confirmed as met — remove both `[VERIFY]` brackets, no wording change needed. |
| B6 | ToS implementation note (signup clickwrap) | Requires a **code** fix (out of scope here, flagged as a build item below) before the note's own "must have this" claim is true; policy wording itself needs no change once the checkbox is fixed. |
| B7(ii) | Privacy Policy §2b (drawings bullet) + §5 retention table row "Child drawings (Draw It)" | Either remove the drawings row/bullet entirely (accurate to current behavior — no artifact is created) or add a product-facing note that drawing persistence was removed in the Draw It rebuild. Also correct `SettingsTab.jsx`'s and `PrivacyPolicy.jsx`'s own in-app copy (still says "…and drawings") — a code/copy fix, flagged below. |
| B7(iii) | Privacy Policy §5 retention table | Name `product_events` explicitly (or confirm it's intended to be covered by the existing generic "Product analytics events" row). |
| B8 | Privacy Policy §3 | Confirmed as drafted — no edit needed. |
| B9 | Privacy Policy §2c | Confirmed as literally true — no edit needed. |

### 2. ADAPTIVITY VERDICT

| Tier | Question | Verdict |
|---|---|---|
| A | Placement drives start unit | **PASS** (primary path; fallback path is a gap — see build items) |
| A | An advancement rule exists | **PASS** (emergent from per-unit mastery scan, not an explicit threshold — see A2's mastery-vs-celebration mismatch) |
| B | Mastery gate / struggle step-down | **Already live**, not just feasible — `word_progress.mastery` gates both unit advancement (A2) and session word selection (A3); no new engineering needed for a basic gate. A true "struggle step-down" (e.g., reducing difficulty after N consecutive misses) is NOT implemented — `difficultyLevel` exists but its adjustment logic (`difficultyGovernor.js`) wasn't traced in this pass beyond confirming its localStorage log exists; effort guess: small (a few days), the scaffolding already exists. |
| C | Review scheduling | **PASS, schema-ready AND live** — Star Keeper (A4) is a real fixed-interval spaced-repetition implementation already feeding session selection, not merely schema-ready. |

### 3. NEW BUILD ITEMS

| Item | Source | Severity |
|---|---|---|
| Offline/API-failure session-plan fallback ignores `placement_unit` | A1 | PRE-STRIPE-LIVE |
| Unit-advancement mastery gate has no minimum-attempt threshold (diverges from the 3-attempt celebration gate) | A2 | POST-LAUNCH |
| `learning_events.attempt_number` is hardcoded to `1`, never a real sequence | A6 | POST-LAUNCH |
| Say-It audio disclosure needs new language (browser-vendor processing, not Option A/B) | B1 | **LAUNCH-BLOCKING** |
| Anthropic service-provider disclosure must name the child's-first-name-in-prompt reality | B2 | **LAUNCH-BLOCKING** |
| `product_events` rows are not deleted/purged on account deletion (no FK cascade, no purge job) | B4 | PRE-STRIPE-LIVE |
| `PLAN_CACHE_KEY` session-plan cache is not scoped by `childId` — cross-child stale-plan risk on multi-child accounts | A5/B9 | PRE-STRIPE-LIVE |
| Signup consent checkbox never links/references the Terms of Service (only Privacy Policy) | B6 | **LAUNCH-BLOCKING** |
| In-app copy (Settings deletion confirmation, Privacy Policy page) still describes Draw It as producing "drawings" that are deleted — no such artifact is created since the tracing rebuild | B7(ii) | PRE-STRIPE-LIVE |
| `product_events` not named in the Privacy Policy retention table | B7(iii)/B4 | PRE-STRIPE-LIVE |

---

**RUN TIMING (final)** — see top of report; start 15:31:17Z, end 15:46:36Z, ~15 minutes total, fully autonomous.
