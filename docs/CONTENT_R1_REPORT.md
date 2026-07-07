# CONTENT R1 Report — Find-the-Word Manifest Cleanup

**Run:** `docs/CONTENT_R1.md`, executed 2026-07-06
**Branch:** `content/manifest-r1`

## STEP 0 — RUN TIMING

- Start: 2026-07-06
- Status: IN PROGRESS

## PHASE 1 — Validation checklist

Status: DONE

**File's own stated rules** (from `findTheWordManifest.js`'s header comment):
1. Every distractor is a real, simple, age-appropriate English word.
2. Prefer another curriculum word where a genuine look-alike exists (free
   double-exposure to the 200-word list); pad with a common non-curriculum
   real word otherwise.
3. None are the target's own plural/tense/derivational inflection.
4. Distractor quality is the activity's entire pedagogical point — avoid
   semantically/visually noisy matches (the file's own rejected example:
   "juice"~"jump").
5. Coverage contract: exactly 3 distractors per word, enforced by
   `scripts/check-findtheword-sync.mjs`.

**Assembled validation checklist for every replacement** (file's rules +
`CONTENT_R1.md`'s (a)-(f)):
- [ ] Real English word
- [ ] Age-appropriate for 4-8yo (no adult/gambling/romantic/violent/clinical register)
- [ ] Not a morphological/derivational form of its target
- [ ] Visually/orthographically similar to the target (shared letters, shape, similar length)
- [ ] Unique within its entry, and ≠ the target
- [ ] Not identical to another distractor in the same entry after all edits apply
- [ ] Not semantically/visually noisy (the "juice"~"jump" failure mode)
- [ ] Exactly 3 distractors per entry preserved (coverage contract unchanged)

## PHASE 2 — Dedupe

Status: DONE

All four keys' two literals were byte-identical, so no STOP/flag case
applied. Deleted the later literal for each, kept the first (original file
order):

| key | first literal (kept) | later literal (deleted) | values matched |
|---|---|---|---|
| nine | line 101 | line 181 | identical |
| eight | line 102 | line 182 | identical |
| zero | line 103 | line 183 | identical |
| this | line 112 | line 213 | identical |

Verified post-edit: `Object.keys(FIND_THE_WORD_LOOKALIKES).length === 200`
(exactly 200 unique keys, 200 literals).

## PHASE 3 — Edit table

Status: DONE — 17 APPLIED (7 primary, 10 fallback), 2 UNRESOLVED (revised
during Phase 4 — see note below the table)

Before applying any edit, checked the replacement/fallback against the
**entry's current other values**, not just the checklist in the abstract —
several primaries turned out to already exist elsewhere in the same entry,
which would have created an in-entry duplicate (checklist item: "not
identical to another distractor in the same entry after all edits apply").
Fell back in those cases per constraint 2.

| # | word | remove | outcome | value used | why |
|---|---|---|---|---|---|
| 1 | eight | eighth | APPLIED (primary) | sight | passes all checks |
| 2 | eight | eighty | APPLIED (primary) | night | passes all checks |
| 3 | cookie | bookie | FALLBACK-USED | cooker | primary "rookie" already in entry (index 0) — would dup |
| 4 | dirty | flirty | FALLBACK-USED | thirsty | primary "thirty" already in entry (index 0) — would dup |
| 5 | a | I | **UNRESOLVED** (revised — see note) | *(left as "I")* | primary "at" collided (dup); fallback "as" passed the manual checklist but failed the build-wired sync gate in Phase 4 — reverted |
| 6 | I | a | APPLIED (primary) | if | passes all checks |
| 7 | six | silk | APPLIED (primary) | sick | passes all checks |
| 8 | pizza | piazza | FALLBACK-USED | dizzy | primary "plaza" already in entry (index 1) — would dup |
| 9 | banana | manna | FALLBACK-USED | banner | primary "bandana" already in entry (index 0) — would dup |
| 10 | heart | hearth | FALLBACK-USED | hear | primary "heard" already in entry (index 0) — would dup |
| 11 | zero | zeal | **UNRESOLVED** | *(left as "zeal")* | primary "hero" AND fallback "zebra" both already in entry (indices 0/1) — double failure per constraint 2 |
| 12 | green | preen | APPLIED (primary) | greet | passes all checks |
| 13 | pencil | council | FALLBACK-USED | pretzel | primary "stencil" already in entry (index 0) — would dup |
| 14 | door | doer | APPLIED (primary) | deer | passes all checks |
| 15 | apple | ample | APPLIED (primary) | apply | passes all checks |
| 16 | apple | amble | APPLIED (primary) | ripple | passes all checks (checked against row 15's already-applied "apply") |
| 17 | read | dead | APPLIED (primary) | lead | passes all checks |
| 18 | head | dead | APPLIED (primary) | bead | passes all checks |
| 19 | brown | drown | FALLBACK-USED | frown | primary "crown" already in entry (index 0) — would dup |

**Row 5 (a) — UNRESOLVED, found during Phase 4, proposal for Sal**: applied
the fallback "as" in Phase 3 (primary "at" collided with the entry's
existing value). Phase 4's `scripts/check-findtheword-sync.mjs` run (the
real build-wired gate, not just this run's manual checklist) failed on it:
its cheap inflection heuristic treats any distractor equal to
`${target}s`/`es`/`ed`/`ing` as a suspected plural/tense inflection of the
target, and "a" + "s" = "as" trips that rule even though "as" isn't
actually a plural of "a" — a false positive, but the gate is the gate, and
constraint 2's "both fail validation" clause covers a fallback that fails a
*real* validation step just as much as one that fails the manual checklist.
Reverted to the original `I`, row now UNRESOLVED. Proposed alternative for
Sal: **`am`** — real word, doesn't collide with `an`/`at`, and doesn't trip
the inflection heuristic in either direction. Not applied — not on the
pre-approved table.

**Row 11 (zero) — UNRESOLVED, proposal for Sal**: both the table's primary
(`hero`) and fallback (`zebra`) are already the entry's other two
distractors (`zero: ['hero', 'zebra', 'zeal']`), so applying either would
create an in-entry duplicate — a double failure per constraint 2. Left
`zeal` in place rather than improvising an unlisted word. Proposed
alternative for Sal to ratify in a future pass: **`zest`** — real,
age-appropriate, not a derivative of "zero," shares the "ze-" opening and
similar length/shape, and doesn't collide with `hero`/`zebra`. Not applied
— awaiting explicit approval since it's not on the pre-approved table.

**Accepted, no code change** (per the doc's own instruction): `because/cause`
kept as-is, plus the remaining ODD-flagged distractors not in the edit
table (`colon`, `mellow`, `bellow`, `omen`, `fount`, `petty`, `posh`,
`prone`, `phony`, `envy`, `empire`, `glean`, `clan`, `sappy`, `kelp`,
`mast`, `clack`, etc.) — distractors are never taught or read aloud, so
mild obscurity doesn't impair the visual-discrimination task itself.

## PHASE 4 — Integrity + gates

Status: DONE — all green

**Mechanical checks** (custom script against the final
`FIND_THE_WORD_LOOKALIKES`): exactly 200 unique keys; every entry has
exactly 3 distractors; no distractor equals its target; no duplicate
distractor within an entry; no empty/invalid strings. **ALL CHECKS PASSED.**

**Build-wired coverage gate** (`scripts/check-findtheword-sync.mjs`, the
real authoritative check named in the manifest's own header comment — a
stricter, independent check from the custom script above, including an
inflection heuristic the manual checklist didn't fully anticipate): **this
is what caught row 5's problem** (see the revised Phase 3 note above) —
after reverting row 5 to UNRESOLVED, `node scripts/check-findtheword-sync.mjs`
reports: *"findTheWordManifest.js covers all 200 curriculum words with
valid distractor sets. OK."*

**Test-suite search**: grepped `src/`, `tests/`, `scripts/` for every
removed distractor word (`bookie`, `flirty`, `piazza`, `manna`, `hearth`,
`zeal`, `preen`, `council`, `doer`, `ample`, `amble`, `eighth`, `eighty`,
`drown`). Only hit: `zero: [..., 'zeal']` itself (the UNRESOLVED row,
correctly still present). `tests/find-the-word.spec.js` hardcodes tile
names `ear`/`eight`/`east` — that's the **`eat`** entry's own distractor
list (`eat: ['ear', 'eight', 'east']`), untouched by this run (only the
*`eight`* entry's own internal distractors changed, not other entries that
happen to use the word "eight" as one of *their* distractors). **No test
fixtures needed updating.**

**Gates**:
- `npm run build` (wraps `check-wordart-sync` + `check-stroke-coverage` +
  `check-findtheword-sync` + `vite build`): green.
- `npm run check:no-emoji`: green ("No emoji characters found in scoped UI
  source. OK.").
- `npx eslint src/games/findTheWordManifest.js` (the one file this run
  touched): zero errors/warnings. Full-repo `npm run lint` shows 158
  pre-existing problems, all `'process' is not defined` / one unused-var in
  `tests/*.spec.js` files this run never touched — confirmed pre-existing,
  not a new category.
- `npx playwright test` (full suite, current main baseline): **41/41
  passed**, ~8 minutes, zero retries needed. Both `find-the-word.spec.js`
  tests pass (they exercise the untouched `eat` entry, as expected).

## PHASE 5 — Ship

Status: IN PROGRESS

## COMPLETION

Status: IN PROGRESS
