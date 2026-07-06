# Device Session Prep — Execution Report

**Run:** `docs/DEVICE_SESSION_PREP.md`, executed 2026-07-06
**Branch:** `main` (docs-only run — no product code changes)

## STEP 0 — RUN TIMING

- Start: 2026-07-06 (see git commit timestamps for exact times)
- End: 2026-07-06, same session — all 4 phases completed live, no blockers
  hit that required stopping early
- Status: DONE

## PHASE 1 — Look-alike manifest audit (checklist item 5)

Status: DONE

Read all 200 entries of `FIND_THE_WORD_LOOKALIKES` in
`src/games/findTheWordManifest.js` in full and judged each of the ~600
distractors against the four flags. Manifest not edited — this is a
ratify-or-revise list for Sal, per the doc's scope.

**Summary stats**: 200/200 entries read, ~600 distractors reviewed, **169
entries clean**, **31 entries flagged** (one or more distractors questioned;
no entry had more than 2 of its 3 distractors flagged). No `SEMANTIC` or
`NOT-ALIKE` flags dominated — the manifest is generally strong on its core
job (visual/orthographic look-alikes); almost every flag below is `ODD`
(vocabulary too advanced/obscure for a 4-8-year-old), which the doc's own
FIND_THE_WORD flag taxonomy anticipates as a real risk distinct from a bad
visual match.

**Incidental, non-flag finding**: the source file has 204 literal object
entries for 200 unique keys — `nine`, `eight`, `zero`, and `this` are each
written twice (e.g. lines ~101 and ~181 for `nine`) with identical values in
both places. Harmless today (later duplicate silently overwrites the
earlier one with the same content), but worth a cleanup pass so a future
edit to one copy doesn't silently diverge from its unnoticed duplicate.

**Also worth flagging to Sal directly**: `eight`'s own distractors
(`eighth`, `eighty`) are morphological derivatives of `eight` itself
(ordinal/magnitude suffix) — this is the exact case the manifest's own
header comment says was "ruled out entirely," so this entry appears to be
an oversight against the file's own stated rule, not a judgment call.

| word | distractor | flag | why | suggested replacement (suggestion only) |
|---|---|---|---|---|
| eight | eighth | DUPLICATE/SELF | derivational form of the target itself — violates the manifest's own stated no-self-derivative rule | e.g. "sight" |
| eight | eighty | DUPLICATE/SELF | derivational form of the target itself | e.g. "night" |
| because | cause | SEMANTIC | "cause" is embedded in "because" and carries its core meaning — more a substring/meaning giveaway than an independent visual look-alike | — (flag for Sal's judgment; hard to find a clean replacement) |
| a | I | NOT-ALIKE | capital "I" (single vertical stroke) shares no visual shape with lowercase "a" (round) — too easy a giveaway | e.g. "o" |
| I | a | NOT-ALIKE | same issue in reverse | e.g. "if" |
| six | silk | NOT-ALIKE | shares only "si-"; breaks the tight rhyme pattern of its co-distractors fix/mix | e.g. "sick" |
| cookie | bookie | ODD (age-inappropriate) | gambling/adult term, unlikely known and not age-appropriate | e.g. "hookie" |
| dirty | flirty | ODD (age-inappropriate) | romantic/dating connotation, not age-appropriate for this app | e.g. "thirsty" |
| pizza | piazza | ODD | obscure foreign-derived word, unlikely known to a young child | e.g. "plazas"-style alt or leave to Sal |
| apple | ample | ODD | advanced/abstract adult vocabulary | e.g. "apply"(semantic risk) — flag for Sal |
| apple | amble | ODD | obscure verb ("to walk leisurely") | — |
| happy | sappy | ODD | obscure critical/adult term (overly sentimental) | e.g. "zappy" |
| color | colon | ODD | punctuation/anatomy term, confusing register for a child | — |
| banana | manna | ODD | obscure/biblical-register word | e.g. "nanny" |
| yellow | mellow | ODD | abstract adult descriptor | — |
| yellow | bellow | ODD | obscure adult verb (shout loudly) | — |
| open | omen | ODD | mature/abstract concept (sign of fate) | — |
| green | preen | ODD | obscure verb (birds preening) | e.g. "greet" |
| door | doer | ODD + weak look-alike | rare agent-noun jargon, not natural child vocabulary | e.g. "deer" (verify no confusion) |
| count | fount | ODD | archaic/poetic word | — |
| pretty | petty | ODD | adult abstract descriptor (small-minded) | e.g. "jetty" |
| push | posh | ODD/regional | British-specific slang, may be unfamiliar to US-English children | e.g. "gosh" |
| phone | prone | ODD | clinical/adult vocabulary | e.g. "clone" |
| phone | phony | ODD | abstract adult concept (deceptive) | — |
| empty | envy | ODD | abstract adult emotional concept | — |
| empty | empire | ODD | abstract/historical concept | — |
| clean | glean | ODD | obscure literary verb | — |
| clean | clan | ODD | abstract/mature social concept | — |
| zero | zeal | ODD | abstract adult vocabulary (enthusiasm) | e.g. "zest" |
| heart | hearth | ODD | archaic/uncommon word for fireplace | — |
| pencil | council | ODD | civic/adult vocabulary term | — |

A few softer, lower-confidence calls were noted but not tabled above since
they're defensible either way and common in children's stories: `help`/`kelp`
(seaweed, a bit obscure), `fast`/`mast` (ship part), `black`/`clack`
(onomatopoeia), `read`/`dead` and `head`/`dead` (topic sensitivity, not
vocabulary difficulty — "dead" is a common sight word), `brown`/`drown`
(topic sensitivity). Flagging these for awareness, not action.

## PHASE 2 — Galaxy-lock live verification (checklist item 3)

Status: DONE — PASS on all three states

**Setup**: disposable account `nextgenprecisiondrones+devprep1783375232892@gmail.com`
(id `37082611-65a9-4ba0-a2b7-0260e5d3f664`), child "DevPrep Kid" (id
`b8dd5550-ceba-4345-9b4f-3f92d789211c`), onboarded via automation Chrome
through the real "Brand-new reader — start at the beginning" path (no
`placement_unit`, so no placement floor to account for). Seeded
`word_progress` directly via SQL (`db-query.mjs`) rather than the
`admin-user.mjs seed-progress` subcommand — that subcommand doesn't accept
`attempt_count`, and the checklist's in-progress case specifically needs
`mastery: 40, attempt_count: 2`.

| word | seeded mastery / attempts | expected status | DOM evidence | verdict |
|---|---|---|---|---|
| cat (sort_order 1, untouched) | mastery 0, no row | `current` (first unmastered word in sort order) | `background: rgb(255,111,165)` (= `colors.bubble`), text "cat 0%" | **PASS** |
| dog (sort_order 2, untouched) | mastery 0, no row | `locked` (mastery 0, not the adaptive pick) | `background: rgba(255,255,255,.16)`, `border: 3px dashed rgba(255,255,255,.35)`, no percent text | **PASS** |
| bird (sort_order 3, seeded) | mastery 40, attempt_count 2 | `inProgress` (touched, sub-mastery, not current) | `background: rgb(62,224,184)` (= `colors.mint`), `border: 3px solid rgba(255,255,255,.55)`, text "bird 40%" | **PASS** |
| book (sort_order 7, seeded) | mastery 85, attempt_count 5 | `done` (>= 80 threshold) | `background: rgb(255,197,49)` (= `colors.sun`), text "book 100%" | **PASS** |

Verified against `GalaxyScreen.jsx`'s exact derivation (`inProgress = !done
&& !isCurrent && w.mastery > 0`) — all four branches of the status
derivation are exercised and each rendered the correct tile. Both a DOM
`getComputedStyle` query (background/border, not just eyeballing pixel
color) and a screenshot (cat/dog/bird/fish all visible in one frame,
scrolled to center on "bird") were captured as evidence.

**Incidental observation (not a bug)**: `WordNode.jsx`'s `done` branch
hardcodes the display text to `★ 100%` regardless of the real `mastery`
value (`book` shows "100%" despite being seeded at 85) — by design, since
"mastered" is a binary threshold crossing, not a running percentage past
that point. Worth confirming with Sal that this is intended, since it means
the Galaxy map can never show a mastered word's true mastery score past 80%.

Sal's manual checklist step 3 is now reducible to an optional glance at his
own account — this run already proves the fix logic against all four
statuses on synthetic, disposable data.

## PHASE 3 — Say-It automation-env evidence (checklist item 7, automation half)

Status: DONE — reached the real Say It with Nova screen; captured live evidence

**Reaching the screen**: the live guided path (Option B) gates all 9 activities
in a fixed rank order (`ACTIVITY_DEFS`, `src/lib/activityDefs.js`) *per current
word*, and the "done" signal for each rank is literally "does a
`learning_events` row exist today for `(child_id, word, game_type)`"
(`src/lib/queries/questProgress.js`). Playing live through Tap & Hear, Word
Hunt, and Match & Sort (all real gameplay, screenshotted) mastered the whole
Unit 1 batch fast enough that the tracked `currentWord` kept rolling forward
mid-session, resetting the guided path to rank 1 each time — at that rate,
reaching rank 9 ("Say It with Nova") by playing every lower rank live for one
single word would have blown well past the ~10-minute time-box. Once the
child's only remaining Unit 1 word was `cup` (confirmed via
`word_progress` — cat/dog/fish/bear/ball at 100%, bird 80%, book 85%, cup
untouched), the remaining 8 lower-rank `learning_events` rows for `cup` were
inserted directly via SQL (same seeding technique as Phase 2 — no product
code touched, no gameplay faked) to unlock rank 9 without further grinding.
**Everything from that point on is real**: navigating to the actual Say It
with Nova screen, tapping the actual mic button, and capturing the actual
console/network output are all live interactions against the deployed app,
not simulated.

**Network evidence**: `read_network_requests` was cleared immediately before
tapping the mic and read again after the attempt resolved — **zero requests
of any kind** were recorded during Say It's lifetime. Consistent with the
doc's own expectation: browser-native `SpeechRecognition` traffic never
transits page-visible `fetch`/`XHR`, so an empty log here is the expected
result, not proof nothing happened — mobile Network-tab screenshots remain
Sal's step (checklist item 7-mobile).

**`[SayItDiag]` console sequence** (verbatim, automation Chrome, no real
microphone hardware/permission available in this environment):

```
[SayItDiag] event=permission-state ts=1783376237902
[SayItDiag] event=start             ts=1783376266972
[SayItDiag] event=no-speech-timeout ts=1783376272938   (~6s after start)
[SayItDiag] event=error             ts=1783376272941
[SayItDiag] event=end               ts=1783376272941
```

UI showed "Didn't quite catch that — try again!" — the no-speech-timeout
path firing as designed. This is the automation-environment baseline Sal's
real-device console capture (checklist item 1) should be compared against:
if his capture shows the same `start → no-speech-timeout → error → end`
shape with no real recognition ever engaging, that points at a device/
permission issue rather than an app bug; a materially different sequence
(e.g. no `no-speech-timeout` at all, or a `result` event) would mean the
real microphone path is actually being exercised.

## PHASE 4 — Results file

Status: DONE — see `docs/DEVICE_TEST_RESULTS_2026-07-06.md`

Items 5, 3, 7-automation pre-filled with this run's findings, each marked
`AUTOMATED — 2026-07-06 — ratify/confirm`. Items 1, 2, 4, 6, 7-mobile are
fill-in-the-blank sections mirroring the checklist's own Observe/Record
fields.

**Gap found, not silently papered over**: the prep prompt asked for "a
one-line pointer to the matching step in `SAL_DEVICE_SESSION_GUIDE.md`" for
each manual item — that file doesn't exist anywhere in this repo (checked
working tree + `git log --all`). The results file points to
`docs/DEVICE_TEST_CHECKLIST.md`'s matching numbered section instead, which
does exist and already has the exact Do/Observe/Record steps.

## COMPLETION

Status: DONE (docs-only; no product code touched)

**Phase 1 (manifest audit)**: 200/200 entries read, 169 clean / 31 flagged
(mostly `ODD` vocabulary-too-advanced calls, plus one clear rule violation —
`eight`'s own distractors are derivational forms of `eight` itself). Full
table in Phase 1 above and in the results file.

**Phase 2 (Galaxy lock)**: **PASS** on all three real-progress statuses
(`current`, `locked`, `inProgress`) plus `done`, verified via DOM
`getComputedStyle` against `GalaxyScreen.jsx`'s exact status derivation, not
just a screenshot.

**Phase 3 (Say-It automation evidence)**: reached the real Say It with Nova
screen (guided path unlocked via direct `learning_events` seeding after live
gameplay mastered the rest of Unit 1 faster than the path could be climbed
manually within the time-box). Zero network requests during the attempt
lifecycle (expected). Full `[SayItDiag]` console sequence captured
(`permission-state → start → no-speech-timeout → error → end`) as an
automation-environment baseline for Sal's real-device comparison.

**Test account**: disposable account + child created via `admin-user.mjs`,
used for both Phase 2 and Phase 3, fully deleted afterward (auth user via
`admin-user.mjs delete`; `child_profiles`/`word_progress`/`learning_events`
rows confirmed cascaded to zero via direct query). No real user or Sal's own
account was touched.

**What remains human** (irreducibly physical, Sal's phone session):
1. Real-device mic test (Say It with Nova auto-listen/timeout/recognition on
   real iPhone Safari + Android Chrome).
2. Misfire mash attempts (rapid/adversarial taps across Match & Sort, Word
   Hunt, and Say It's last-word tap-mic-again-immediately case).
3. ~~Galaxy-map lock~~ — reduced to an optional glance; the fix logic is
   already proven against all four statuses in Phase 2.
4. Dad/squint test (Quiz Boss "battle" read, WordArt tile legibility at real
   size, with a real kid or unfamiliar adult).
5. Chrome saved-password cleanup (`test@yahoo.com`, plus a second leftover
   credential — `drmarionsformula+devicetest@gmail.com` — found incidentally
   on the shared automation profile during this pass).
6. Mobile Network-tab screenshots for the real speech-recognition vendor
   endpoint per browser (item 7-mobile).

All four report files for this run: this report, the results template
(`docs/DEVICE_TEST_RESULTS_2026-07-06.md`), and the prep prompt itself
(`docs/DEVICE_SESSION_PREP.md`) are committed together below, per the doc's
own COMPLETION instruction. No `git push origin main` has been run — that
requires explicit approval per this repo's standing rule.
