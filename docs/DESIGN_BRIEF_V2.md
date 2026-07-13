# DESIGN_BRIEF_V2 — Blank-Overhaul Design Canon

Authored: 2026-07-13 · Locked via DESIGN_BRIEF_V2_R1 (docs-only run)

Dr. Marion Blank reviewed 200 Magic Words and the instructional core is being
redesigned to her method: one word per session taught through a graded trial
ladder, errorless handling, compositional review. This document is the
committed design canon for that redesign. It supersedes `DESIGN_BRIEF.md` (v1)
for all new work.

Pedagogy claims below cite `docs/BLANK_METHOD_SOURCES.md` by section number
(e.g. "Sources §6") rather than restating the claim in different words —
paraphrase-drift on pedagogy is treated as a defect in this doc.

---

## 1. Status and canon

Design canon = mockups F–M, committed byte-identical at
`docs/design/mockups/`. Mockup N (full-experience) is reference only — a
single-shot integration plus a live motion/sound reference, untested; if
anything in N is broken it is not a bug to debug, F–M govern wherever N
disagrees. `DESIGN_BRIEF.md` (v1), `mockup-D`, `mockup-E2`, and all earlier
mockups are superseded.

All designs use the locked Candy Galaxy tokens: no emoji, no red,
`prefers-reduced-motion` honored.

Canon table:

| Mockup | Locks | Status |
|---|---|---|
| F word-journey | 7-stage ladder, pretest, guided completion, per-word celebration | CANON |
| G home-loop | Home v2: journey card states, bonus cap, Polish Your Stars review, function-ladder variant | CANON |
| H grownups | Grown-Ups v2: 4 word states incl. pretest-passed, per-word evidence, prescriptions, why-it-works | CANON |
| I placement | Placement v2: warm-up gate, measurement probes, two-miss floor, scoreless results | CANON |
| J unit-gate | Progress Check: measurement probes, pass constellation celebration, polish path | CANON |
| K story-reader | Karaoke read-along, tap-the-word hunt, comprehension | CANON |
| L galaxy-map | 18 constellations, unit detail sheet, Nova's Playground; region names ILLUSTRATIVE | CANON |
| M first-flight | Hold-to-continue grown-up gate, COPPA-lean setup, Star Seeds gentle start | CANON |
| N full-experience | Single-shot integration + live motion/sound reference; UNTESTED | REFERENCE ONLY |
| D, E2, all earlier | Prior generation | SUPERSEDED |

---

## 2. Non-negotiable rules

- **Anti-phonics survives every new primitive.** Letter tiles are SILENT; the
  whole word speaks only on completion; letter names and letter sounds are
  never spoken anywhere, ever.
- **Teaching vs measurement contract** (extends the standing §5a rule).
  Teaching mode = scaffold present, hint-glow, guided completion, Nova
  assists. Measurement mode (placement, Star Check-In, unit Progress Check) =
  no scaffold, no hints, unassisted, identical neutral feedback for right and
  wrong; measurement Build It lets tiles place freely and scores silently.
  (Sources §6: "Do not offer any assistance.")
- **Sounds attach to actions, never to letters.** No negative or error
  sounds — misses are silent; the hint gets a soft sparkle.
- **One-hero-motion rule per screen.** Transform/opacity only; canvas past
  ~20 particles.
- **No emoji. No red. Reduced-motion honored everywhere.**

---

## 3. The Word Journey ladder (content words)

One word per session, ~30–40 trials (a trial = one child response),
~8–12 minutes. Other words appear only as sentence context and distractors.

1. **Meet It** (2 trials)
2. **Spot It** (6, engineered look-alike distractors)
3. **Know It** (4, pictures)
4. **Almost It** (4, which-frame-can-become-it, includes dead frames)
5. **Build It** (4–5, scaffold shrinks each trial, FINAL BUILD UNASSISTED)
6. **Use It** (4, cloze)
7. **Story** (tap-the-word + shipped comprehension)

**Function-word variant:** skip stage 3 pictures; add Find-It-in-a-sentence +
Use It x2. Grammar formats (Stay 'n Play / Cipher Wiz analogs) deferred to
v2.

---

## 4. Session economy

1 new word/day = the streak quest; completing it unlocks ONE bonus word;
hard cap 2/day. Extra appetite routes to review (Polish Your Stars) +
stories.

---

## 5. Pretest — Is It Known

Every new word opens with one UNASSISTED Build It. Pass = skip forever;
counts as mastered for progression; NO mastery celebration; distinguishable
in the Parent Portal.

Implementation contract for R6 (documented here, NOT built in this run): its
own `product_events` type requires the DB CHECK constraint + `api/track`
allowlist updated in the same change, with a positive-landing test after
migration; the migration takes the next number after what is applied to
production per `supabase/migrations/MIGRATIONS.md` (expected 0039+).

---

## 6. Guided completion (teaching mode only; replaces two-miss-completes)

Miss 1 = current behavior (wiggle/soften + hint-glow). Miss 2 = the trial
transforms: foils fade to ~15% and lock, Nova models the answer aloud, only
the glowing target is tappable; the child ends on their own correct tap;
logged completed-with-help (telemetry and mastery stay honest).

Ladder mercy: 2 guided completions within one ladder → remaining stages
shorten and drop to easier formats (extends scaffold-down v1).

Measurement modes unchanged.

This is the app's translation of Sources §2 rule 5 ("Immediately correct
errors... reading errors → say the correct word, child repeats") and §6.5:
teaching corrects every error and lets the child perform the correct
response; the wrong form is never the last thing practiced.

---

## 7. Mastery redefinition

Ladder completion ending in an unassisted Build It = owned same-day; spaced
review confirms retention; review misses can un-master. Replaces the
80%/3-attempts rule.

Star pacing follows: per-word celebration stays modest; the unit gate owns
the big one.

---

## 8. Unit gate

Quiz Boss becomes a true Progress Check: unassisted, production-weighted,
every unit word; pass → unit-complete constellation celebration; weak → the
named weak words get 4-stop polish journeys (Meet/Spot/Build/Use), no
failure language, parent sees a prescription card. Boss art reuses the
existing asset if present.

(Sources §3, Progress Check row: "hard-scored... Do not offer any
assistance"; Sources §6.4: "Results branch... Pass → advance; weak →
prescribed review period, then return.")

---

## 9. Placement v2

Honest copy ("about 2 minutes", early-end normalized — ships the queued copy
fix). Sequencing warm-up gate doubles as the tap tutorial (mockup I,
`startWarm`/`warmSeq` — a "copy my letters, same order" sequencing check
before any word probe, matching Sources §4's RK Skills Survey gating
sequencing before word items); struggle routes to the Star Seeds gentle
start (mockup M).

Probes mix recognition + MEASUREMENT-MODE Build It + sentence rungs
(mockup I: `initSpot` → `initBuild` → `initSent`); two-miss floor
(`twoMiss()` → `finish(true)`, scoreless early-end copy: "Nova found your
starting star!... the climb stopped there, gently"); scoreless child
results. In measurement-mode Build It every tray tile places into the next
slot regardless of correctness, and scoring happens silently server-side —
the child never sees right/wrong during a probe.

Server ladder, unassisted probes, never-regress display unchanged. Weak
check-ins now ADD review prescriptions (display floor stays).

---

## 10. Reintroduction and review

Compositional carrier sentences built only from the child's owned/prior
words (Sources §5 cross-book observation 3: "carrier sentences... are built
almost entirely from previously taught vocabulary"); cumulative Book-analog
stories per unit; existing spaced `dueForReview` surfaced as the Polish Your
Stars block (mockup G, `startReview`/`rvTrial` — 3 quick trials across due
words, function words reviewed as Detect 'n Select-style sentence finds
per Sources §3).

---

## 11. Celebration economy

Correct tap = puff → word owned = burst → unit gate = constellation
self-draw + chord + double cannon. Pretest pass = none.

---

## 12. Content data contract

Generation is build-chain R1, blocked on CURRICULUM_RECON_R1 — documented
only in this run, not built.

Per-word look-alike distractor sets (~6/word; non-curriculum foils allowed
since the child never reads them aloud) + carrier-sentence banks (~4/word)
constrained to curriculum-cumulative vocabulary. AI-generated behind the
vocab gate; Sal ratifies via pre-approved edit tables.

---

## 13. Component contracts

Derived from the committed mockups (F–M). Each entry: purpose · states · key
data needs · teaching-vs-measurement variant (where applicable) · motion
hooks · audio hooks.

### JourneyMap
- **Purpose:** the per-word 7-stage progress spine and stage launcher
  (mockup F, `renderMap`/`launchStage`).
- **States:** per-stage `locked` / `current` / `done`; a lit path (SVG
  `strokeDashoffset` tied to `done/7`) with Nova positioned at the
  frontier point along the path.
- **Key data needs:** `STAGES` array (id, name, trial count), `done` count,
  path point coordinates.
- **Teaching vs measurement:** N/A — the map itself is navigation, not a
  trial.
- **Motion hooks:** path draw-in on `done` increment; Nova translate-to-point
  on advance.
- **Audio hooks:** none (silent navigation).

### WordIntroCard (Meet It)
- **Purpose:** first exposure — show the word, speak it, then hide it and
  ask the child to find it among 2 distractors (mockup F, `initMeet`).
- **States:** card visible+labeled → tap-to-tuck (card animates away) →
  find-among-3 choice.
- **Key data needs:** target word, 2 distractor words (non-look-alike at
  this stage — e.g. `sun`, `big` against `dog`).
- **Teaching vs measurement:** teaching only; uses the shared choice engine
  (see below) so miss 1/miss 2 behavior applies.
- **Motion hooks:** card tuck-away transform; correct-flash + confetti burst
  on success.
- **Audio hooks:** "This is {word}!" on reveal; praise line + whole-word
  speech on correct tap only — never on the tuck or the miss.

### LetterSlots + LetterTray
- **Purpose:** the Build It construction primitive — silent letter tiles,
  2–3 decoys, wrong tile wiggles and bounces back (errorless by
  construction), shared between teaching and measurement modes via one
  engine (mockup F `buildEngine`; mockup I `initBuild`; mockup J probe 1).
- **States:** empty slots → filled-in-order (each correct tile locks into
  its slot, `idx++`) → all-filled celebration (`glowdone`, Nova
  celebrate, whole-word speech, confetti) → complete.
- **Key data needs:** target letter sequence, tray letters (target letters +
  1–2 decoys), optional `ghostFirst` (a faint first-letter guide shown only
  on the teaching Build It, never on the pretest build — mockup F
  `initBuild(true)` vs `initPretest(false)`).
- **Teaching-vs-measurement variant:** teaching — a wrong tile just wiggles
  and bounces back, no slot advances, scaffold shrinks trial over trial
  (ghost letter present early, absent by the final unassisted build);
  measurement — every tray tile places into the next slot on tap regardless
  of correctness (mockup I `initBuild`: "measurement mode: every tile
  places — right or wrong. Scored silently."), no wiggle, no feedback
  differentiates right from wrong, scoring happens server-side only.
- **Motion hooks:** tile-to-slot fill; wiggle on teaching-mode miss;
  slot-glow sweep + confetti on completion.
- **Audio hooks:** whole word spoken once on successful completion only.
  Individual letters are NEVER named or sounded — silent tiles per the
  anti-phonics rule (§2 above).
- **v2 note:** on-screen QWERTY entry is deferred (§16).

### Frame tiles (Almost It, incl. dead frames)
- **Purpose:** "which of these partial frames can become {word}" — a
  discrimination format between Spot It and Build It (mockup F
  `initAlmost`; matches Sources §3 "Find 'n Fill / Letter In," which
  explicitly includes dead frames that cannot become the target, e.g.
  `d_ns` can't become `need`).
- **States:** 4 frame tiles shown (1 live frame that completes to the
  target, 2–3 dead frames that cannot); on correct tap the frame
  visually fills in (`decorate`: `d _ g` → `d`+fill-in `o`+`g`) before
  the whole word is spoken.
- **Key data needs:** 1 live frame + underscore position, 2–3 dead frames
  of the same visual shape/length family.
- **Teaching vs measurement:** teaching only in F; the mechanic reappears
  read-only inside placement/unit-gate probes as a straight tile pick
  (no fill-in decoration) since those are measurement, not teaching.
- **Motion hooks:** fill-in-letter reveal; wiggle on miss.
- **Audio hooks:** whole word spoken on success; the underscore is never
  sounded out.

### Guided-completion state machine
- **Purpose:** the shared errorless-choice engine used by every
  multiple-choice format (Meet It, Spot It, Know It, Almost It, Use It) —
  mockup F `armChoice`, mirrored in mockup G `arm` and mockup K's story
  question.
- **States:** `idle` → **miss 1**: wrong tile wiggles+softens, correct tile
  gets `hint-glow`, bubble line changes to "Not quite — try the glowing
  one!" → **miss 2**: all non-target tiles fade to ~15% opacity and go
  inert (`onclick=null`), target tile gets `hint-glow`+`glow-big`, Nova
  models the answer aloud (bubble = the modeling line, e.g. "This is
  dog — tap dog!") → **resolved**: only ever by the child's own tap on the
  (now unmissable) target tile — locked flag prevents double-fire, Nova
  celebrates, whole word spoken, confetti, `onDone(misses>=2)` reports
  whether this trial needed guided completion.
- **Key data needs:** correct value, tile set, praise line, model line,
  optional `decorate` callback (frame fill-in, cloze fill).
- **Teaching vs measurement:** teaching-mode-only construct; measurement
  variants (below) never wiggle, hint-glow, or fade — they accept the tap
  and move on with identical neutral feedback regardless of correctness.
- **Motion hooks:** wiggle (miss 1), fade-to-15%-and-lock (miss 2),
  correct-flash + confetti (resolve).
- **Audio hooks:** no sound on either miss (silent, per §2); whole word
  spoken only at resolution.

### Measurement-mode variants
- **Purpose:** the no-scaffold counterparts used in Placement (mockup I)
  and unit Progress Check (mockup J) probes.
- **States:** tile tap → immediate `trailAdvance`/`trail()` transition to
  the next probe; a single neutral bubble line ("Ooh, next!") regardless of
  whether the tap was correct; no wiggle, no hint-glow, no fade, no retry.
- **Key data needs:** probe sequence (recognition tile pick → Build It →
  sentence-cloze rung), two-miss counter feeding the placement floor
  (`twoMiss()`), pass/fail rollup feeding the unit-gate fork.
- **Teaching vs measurement:** this IS the measurement variant; see
  LetterSlots/guided-completion above for how the same primitives change
  behavior in this mode.
- **Motion hooks:** `trail` class transition only — deliberately smaller
  than the teaching-mode correct-flash, so a measurement tap never visually
  reads as "you got it right."
- **Audio hooks:** none beyond the prompt line — no praise/model speech,
  matching "identical neutral feedback for right and wrong" (§2).

### Constellation system
- **Purpose:** the Word Galaxy's 18-unit spine (mockup L) plus the
  unit-complete celebration draw (mockup J `passPath`).
- **States (spine, per unit):** `locked` / `current` (partial mini-
  constellation, hollow stars for unowned points) / `done` (fully drawn,
  connecting line rendered, chip reads "N stars · drawn"). Tapping a
  non-locked unit opens a detail sheet (`openSheet`) showing the full
  constellation at large size with per-word labels, hollow vs lit per
  ownership.
- **Key data needs:** 18 unit names (region names ILLUSTRATIVE per §16 —
  content ratification pending), per-unit word list + owned/total count,
  point coordinate sets (3 reusable shape templates in L, rotated across
  units).
- **Teaching vs measurement:** N/A — pure progress display, except the
  unit-gate pass version (`passPath`) which is the celebration triggered
  immediately after a Progress Check pass: line draws in over ~2.4s, then
  10 stars ignite in sequence.
- **Motion hooks:** SVG line `stroke-dashoffset` draw-in; star ignite
  stagger; hollow→lit star fill transition.
- **Audio hooks:** the unit-gate pass draw is paired with the "constellation
  self-draw + chord + double cannon" celebration tier from §11 — the
  single biggest audio moment in the app, reserved for this and nothing
  smaller.

### Star Seeds
- **Purpose:** the gentle-start placement fallback for a child who
  struggles at the sequencing warm-up gate (mockup M, `startSeeds`/
  `seedTrial`) — copy-the-sequence trials using symbols (star/moon) before
  progressing to letters, i.e. a softer version of the same sequencing
  check placement already performs.
- **States:** round 0 (2-symbol copy, non-letter glyphs) → round 1
  (3-letter copy) → seeds-done handoff back into the normal placement/home
  flow.
- **Key data needs:** symbol/letter sample + tray sets per round (tray
  includes 1–2 extra decoy picks beyond the sample length).
- **Teaching vs measurement:** this is explicitly the TEACHING-flavored
  entry ramp (symbols are ungraded scaffolding, not scored) — contrast with
  placement's own warm-up gate, which is the measurement version of the
  same sequencing check.
- **Motion hooks:** slot-fill on correct pick; no wiggle/miss state shown
  in the mockup (any pick is accepted into the next slot, matching the
  "gentle" framing).
- **Audio hooks:** spoken prompt lines only ("Copy my row — same order!");
  no letter-naming (symbols are drawn shapes, not sounded).

### Nova's Playground
- **Purpose:** houses RhymeTime, relocated off the critical word-journey
  path per this redesign — code stays intact, no deletion, it becomes an
  optional side activity reachable from the galaxy map rather than a
  required ladder stage.
- **States / data / motion / audio:** unchanged from the existing
  RhymeTime implementation; only its entry point moves (from the graded
  ladder into an optional map-accessible space).

---

## 14. Motion and sound spec

Free/production stack:
- **Rive** — Nova state-machine character: idle blink/bob, listening tilt,
  point during guided completion, celebrate.
- **GSAP 3** (fully free since the Webflow acquisition) — timelines:
  constellation draw, map ignition.
- **Motion** (spring physics) — `layoutId` shared elements: word card →
  star.
- **canvas-confetti** — star shapes, tiered recipes.
- **Howler + Kenney CC0 audio sprite.**
- **CSS `offset-path`** — Nova flies the path.
- **auto-animate** — grids.
- **Haikei** — static SVG backdrops.

Sound kit: 8–10 sounds, one pentatonic family; the ladder plays a rising
arpeggio per stage; ElevenLabs SFX generation available on the existing
subscription.

Rules:
- Sounds attach to actions, never letters.
- Transform/opacity only; canvas past ~20 particles.
- Lazy-load Rive/GSAP after first paint (protects the cold-tap win).
- Bundle everything, no runtime CDNs (COPPA/offline).
- `prefers-reduced-motion` honored.
- One-hero-motion per screen.
- No negative/error sounds.

Ambient layer (demonstrated live in mockup-N): 2-layer parallax starfield +
twinkle, aurora warmth tied to ladder progress, squash-and-stretch on every
touchable.

---

## 15. Rollout

Existing tap-mastered words grandfathered as known; optional Build It
confirmation later via review prescriptions.

---

## 16. Deferred (documented, not designed)

- Word forms (Marion spec Q2 — if non-negotiable, curriculum + schema
  change lands before the ladder build).
- Grammar/sequencing formats.
- On-screen QWERTY.
- Mockup-N debugging.
- The 18 galaxy region names in L (illustrative; content ratification pass
  needed).

---

## 17. Build order pointer

R1 CONTENT_LADDER_DATA → R2 primitives → R3 Word Journey client shell →
R4 session inversion (riskiest) → R5 guided completion → R6 pretest +
mastery redefinition + migration + parent-dashboard reconciliation →
R7 review block + story tap-the-word → R8 QA + device pass. PLACEMENT_V2
slots after R2. All gated behind CURRICULUM_RECON_R1 + Marion sign-off.
