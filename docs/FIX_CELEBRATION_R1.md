# 200 MAGIC WORDS — FIX_CELEBRATION_R1: STAR-IGNITION FIRING BETWEEN ANSWERS
**Written:** July 7, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/celebration-timing`
Diagnose-then-fix. Includes two riders: a repo provenance reconciliation (Phase 0.5) and the Sal-approved orphan test-account cleanup (Phase 6).

**Bug report (Sal, production screenshot, July 7 ~3:39 PM ET):** at `/app`, a tier-2 mastery celebration modal — `"ball" star ignited!` +15 XP, "One more word lighting up your galaxy. Tap to continue." — rendered on an otherwise EMPTY screen (bare gradient, no lesson chrome, no path visible). Reported as celebrations firing "randomly between correct answers," post-Package-B deploy.

**Two competing explanations — the whole run is choosing between them with evidence:**
- **H-BY-DESIGN**: Package B stopped one-tap roll-forward, so words now accumulate attempts within a session and legitimately cross `isRealMastery` (≥80 AND ≥3 attempts) mid-session far more often than ever before. Each crossing fires the tier-2 ignition. The celebration is correct per the current rules; its *frequency and placement* are the problem (and the bare-gradient render says placement is broken regardless).
- **H-REGRESSION**: B's reader changes broke crossing detection — duplicate fires on refetch/remount, a stale cached baseline making an already-crossed word "cross" again, or the celebration firing for a word other than the one just answered.

## RULES
1. Report `docs/CELEBRATION_FIX_REPORT.md` at STEP 0 with RUN TIMING, live updates, committed in the first commit. **FINAL STATUS's last line self-certifies the post-production-walk docs push.**
2. No fix until the mechanism is demonstrated (forensics + reproduction). A no-fix verdict with evidence is a successful run — but this time there is a screenshot with a word and a timestamp, so the forensics should at minimum establish what fired and why.
3. Never write to Sal's real accounts. Read-only queries on the real account are permitted solely to learn state; reproduce on disposables (`nextgenprecisiondrones+*`, consent metadata) and replicate state synthetically.
4. Approval stops: `git push origin main`, the Phase 6 batch delete, anything else destructive. Deployment check after every push. Candy tokens, errorless, no emoji, no red/X, no phonics.
5. **Every finding in this run adds a TRAPS entry to the report** — Sal's standing request: bugs get documented so they are not re-encountered. The next Master Doc roll ingests them.

## PHASE 0 — REPORT + RECON
Read: the component that renders the star-ignition modal (find it — likely near `LevelUpCelebration.jsx` / the tier-2 path in the completion pipeline), where it mounts (screen-scoped or a root-level portal?), what triggers it (a "crossed now" comparison? against what baseline — fresh query data vs. cached?), `useCandyGalaxyData`'s post-B derivations, `PlayScreen.handleProgress` → `onSessionEnd` flow, and DESIGN_BRIEF §6 + CLAUde.md's "mastery is the reward" sizing rule.

## PHASE 0.5 — PROVENANCE RECONCILIATION (report-only, no changes)
The recovery audit surfaced evidence of work outside any documented run: migrations `0032`–`0034` (0034 = `launch_analytics`, paywall/checkout events — no report on record), `story-time-chrome.spec.js` from an undocumented branch, and `mwstorytime*` test accounts created July 7 at 17:10/18:13. Produce a table: every commit on main since Package A's merge SHA and every migration ≥0032 — what it did, which run/report accounts for it, or UNDOCUMENTED. List all remote branches and their last-commit dates. If an active parallel workstream is evident, report it; touch nothing.

## PHASE 1 — FORENSICS (read-only, before any reproduction)
1. Identify the account: query `learning_events` for `word = 'ball'` in a window around 2026-07-07 19:39 UTC. If ambiguous, ask Sal which account/child was playing.
2. For that child+word, pull the full ordered event history: `recorded_at`, `game_type`, `correct`, `attempt_number` (now wired — reliable for today's rows if they postdate B's production deploy; record the deploy timestamp and confirm), plus the `word_progress` row (mastery, attempt_count, correct_count, next_review_at).
3. Adjudicate: did "ball" cross `isRealMastery` at that moment (attempt_count reaching ≥3 with ≥80%)? 
   - Crossed exactly then, one fire → H-BY-DESIGN (frequency/placement problem).
   - Already real-mastered earlier, or <3 attempts, or evidence of multiple fires per crossing → H-REGRESSION.
4. Explain the bare gradient: from the component reading in Phase 0, determine how this modal can render with no screen behind it (route transition? portal outliving its screen? modal firing on Galaxy/Home from a refetch?). This must be answered regardless of verdict.

## PHASE 2 — REPRODUCE
On a disposable seeded to mirror the forensic state: play a word to its 3rd attempt and observe the ignition count and placement. Then hunt the regression paths explicitly: complete a crossing, navigate away and back (remount), pull-to-refresh/invalidate — assert zero additional fires. Capture where in the UI lifecycle the modal appears relative to the qualifying answer.

## PHASE 3 — FIX (pre-specified per verdict; deviations = UNRESOLVED + proposal, never improvised)
- **If H-REGRESSION**: fix at the demonstrated layer, plus a durable idempotency guard — an ignition fires at most once per word per crossing; a remount/refetch never re-fires. If a stored flag is the right guard and requires schema, STOP and report the migration for approval (migration before code, per standing rule).
- **If H-BY-DESIGN**: implement this containment, pre-approved: (a) the ignition renders ONLY anchored to the qualifying answer's own celebration beat inside the activity — never during route transitions, never on a bare screen; (b) if the crossing is detected asynchronously after that moment has passed (post-refetch), the ignition defers to the Session Complete screen (folded into its summary), not popped mid-navigation; (c) at most one ignition per word per day. Per-question celebrations stay §6-sized; this changes placement and rate, not the design language.
- **Either way**: the bare-gradient render path gets closed.

## PHASE 4 — TESTS
New spec: word crosses at attempt 3 → exactly one ignition, anchored to the answer (or Session Complete per the deferral rule); remount/refetch after crossing → zero fires. Suite baseline **65** — only add.

## PHASE 6 — ORPHAN TEST-ACCOUNT CLEANUP (Sal-approved rider)
From the recovery audit's list (`mwnoemoji*`, `mwstorytime*`, `mwrm*`, `mwsmokesignup*`, `idora*`/`idorb*`, `mwftw*`/`mwftseat*`, `candygalaxy20260701`, plus any other rows matching known disposable fixture patterns): enumerate with created-at dates; EXCLUDE anything created by a currently-running workstream (the two newest `mwstorytime*` rows — confirm with Sal whether that workstream is live before touching them) and anything not clearly matching a disposable pattern (ambiguous → list, don't delete). Present the final kill list, get one explicit confirmation, batch cascade-delete, verify zero orphan rows per account, report before/after counts.

## PHASE 7 — GATES, VERIFY, SHIP
Full gates (build + sync checks incl. mastery-predicate-sync, no-emoji, Playwright `workers:1`, idor-proof — celebration reads progress data, so it runs). Preview walk: the crossing journey live, plus a navigation-heavy pass proving no stray fires. Merge `--no-ff` → approval → push → deployment check → production walk (replay the "ball" scenario shape on a fresh disposable) → cleanup → report DONE with end timing → **docs push, self-certified in FINAL STATUS**.

## REPORT (docs/CELEBRATION_FIX_REPORT.md)
### RUN TIMING
### PROVENANCE RECONCILIATION — the Phase 0.5 table
### FORENSICS — the "ball" event history and the adjudication
### VERDICT — H-BY-DESIGN vs H-REGRESSION, with the exact mechanism and lines
### FIX — what shipped, per the pre-specified branch taken
### CLEANUP — accounts deleted, exclusions, before/after
### VERIFICATION — tests vs 65 baseline, gates, walks
### TRAPS — every reusable lesson from this run, phrased as standing rules
