# CONTENT R1 Report — Find-the-Word Manifest Cleanup

**Run:** `docs/CONTENT_R1.md`, executed 2026-07-06
**Branch:** `content/manifest-r1`

## STEP 0 — RUN TIMING

- Start: 2026-07-06
- End: 2026-07-07 (follow-up approval + ship completed same continued session)
- Status: DONE

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
| 5 | a | I | APPLIED (Phase 3b follow-up, Sal-approved alternative) | am | primary "at" collided; fallback "as" failed the build gate; `am` re-validated + gate-clean |
| 6 | I | a | APPLIED (primary) | if | passes all checks |
| 7 | six | silk | APPLIED (primary) | sick | passes all checks |
| 8 | pizza | piazza | FALLBACK-USED | dizzy | primary "plaza" already in entry (index 1) — would dup |
| 9 | banana | manna | FALLBACK-USED | banner | primary "bandana" already in entry (index 0) — would dup |
| 10 | heart | hearth | FALLBACK-USED | hear | primary "heard" already in entry (index 0) — would dup |
| 11 | zero | zeal | APPLIED (Phase 3b follow-up, Sal-approved alternative) | zest | primary "hero" and fallback "zebra" both already in entry — double failure; `zest` re-validated + gate-clean |
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

## PHASE 3b — Follow-up: approved UNRESOLVED rows applied

Status: DONE (2026-07-07, follow-up commit on `main`, merge not rewritten)

Sal approved both proposed alternatives. Applied directly (not through a
new branch/merge — a follow-up commit on `main`, since the original merge
already landed):
- `a: ['an', 'at', 'I']` → `a: ['an', 'at', 'am']`
- `zero: ['hero', 'zebra', 'zeal']` → `zero: ['hero', 'zebra', 'zest']`

Re-validated both against the full Phase 1 checklist before applying:
real words, age-appropriate, not derivational of their targets, visually
similar (`am`/`a` share the "a" opening; `zest`/`zero` share the "ze-"
opening and similar length), unique within their entry and ≠ target, no
in-entry duplicates after the edit (`am` vs `an`/`at`; `zest` vs
`hero`/`zebra`).

**Re-ran the exact gate that caught the original problem**:
`node scripts/check-findtheword-sync.mjs` → *"findTheWordManifest.js
covers all 200 curriculum words with valid distractor sets. OK."* — the
inflection heuristic that flagged `as` does not trip on `am` or `zest` in
either direction.

Also re-ran: the custom mechanical-integrity script (200 keys, all checks
passed), `npm run build` (green), and `tests/find-the-word.spec.js` (2/2
passed — exercises the untouched `eat` entry, unaffected either way, run
again per your instruction as the targeted regression check for this
follow-up).

Both rows are now **APPLIED**, not UNRESOLVED — table below updated.

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

Status: DONE

`git merge --no-ff content/manifest-r1` completed cleanly into local
`main` (commit `3061159`). Sal then approved both proposed alternatives
(Phase 3b above) via a follow-up commit (`15a0d48`) directly on `main` —
the original merge was not rewritten.

**Push — approved, including the hitchhiking commit**: local `main` was 6
commits ahead of `origin/main` at the approval stop (this run's 4 plus the
previously-unpushed `DEVICE_SESSION_PREP.md` commit `63bdb13` from the
prior run), flagged explicitly per constraint 3. User approved pushing all
of it. `git push origin main` succeeded: `70fdbd8..15a0d48 main -> main`.

**Deployment check** (FIX R1 convention): `gh api
repos/.../commits/15a0d48/status` → Vercel status `"success"` /
`"Deployment has completed"` — no stuck-deployment incident this time (see
`docs/FIX_R1_REPORT.md` for what that failure mode looks like when it
does happen).

**Production bundle-string verification**: fetched the live served bundle
(`https://200magicwordsapp.com/` → `index-tn-GHzks.js` →
`CandyGalaxyShell-CyZBc6Hc.js`, the lazy-loaded chunk containing the
manifest data) and grepped it directly (quote-aware, not a raw substring
match, to avoid false hits on short strings like "am"):
- **All 19 applied replacements present** as literal string values:
  `sight`, `night`, `cooker`, `thirsty`, `am`, `if`, `sick`, `dizzy`,
  `banner`, `hear`, `zest`, `greet`, `pretzel`, `deer`, `apply`, `ripple`,
  `lead`, `bead`, `frown`.
- **All 14 removed words confirmed absent**: `bookie`, `flirty`, `piazza`,
  `manna`, `hearth`, `zeal`, `preen`, `council`, `doer`, `ample`, `amble`,
  `eighth`, `eighty`, `drown` — none found in the served production bundle.

This is string-level proof the edited content is actually live, not just
merged/pushed.

**Find-the-Word smoke pass** (automation Chrome, against production):
provisioned a disposable account + child (`manifestr1smoke...`), seeded
`learning_events` for `word_match`/`word_hunt`/`rhyme_time` on "cat" to
unlock Find the Word without a grind (same non-code technique as the
`DEVICE_SESSION_PREP` run), then loaded the real activity. Rendered
exactly as expected against the **untouched** `cat: ['bat','hat','cap']`
entry (four tiles: cat/cap/bat/hat), tapping the correct tile advanced
cleanly to the next question (`dog`, also untouched:
`dig`/`dog`/`fog`/`dot`) — no visual regressions, no crashes. Test account
deleted afterward; `child_profiles`/`word_progress`/`learning_events` rows
confirmed cascaded to zero via direct query.

## COMPLETION

Status: DONE

**Per-row outcome**: all 19 rows resolved — **19 APPLIED** (7 primary as
listed, 10 via the table's own fallback, 2 via Sal-approved alternatives
after both the primary and fallback failed):
- Row 5 (`a`/`I` → **`am`**): primary `at` collided in-entry; fallback `as`
  failed the build-wired inflection-heuristic gate. Sal approved `am`,
  re-validated and gate-clean.
- Row 11 (`zero`/`zeal` → **`zest`**): both primary (`hero`) and fallback
  (`zebra`) already existed elsewhere in the entry. Sal approved `zest`,
  re-validated and gate-clean.

Zero UNRESOLVED rows remain.

**Accepted, no code change**: `because/cause`, plus all remaining
ODD-flagged distractors not in the edit table (`colon`, `mellow`, `bellow`,
`omen`, `fount`, `petty`, `posh`, `prone`, `phony`, `envy`, `empire`,
`glean`, `clan`, `sappy`, `kelp`, `mast`, `clack`, etc.).

**Dedupe results**: `nine`/`eight`/`zero`/`this` each had two
byte-identical literals; later occurrence deleted for all four. File now
has exactly 200 unique keys backed by exactly 200 literals (was 204).

**Integrity results**: custom mechanical check (200 keys, 3 distractors
each, no self-matches, no in-entry duplicates, no empty strings) — all
passed, re-confirmed after the Phase 3b follow-up. Build-wired
`check-findtheword-sync.mjs` — passed (and is what caught row 5's original
fallback problem before it shipped).

**Gate results**: `npm run build` green, `npm run check:no-emoji` green,
`eslint` on the touched file clean (repo-wide lint has 158 pre-existing,
unrelated test-file problems — confirmed not a new category), full
Playwright suite **41/41 passed**; `find-the-word.spec.js` re-run again
after the Phase 3b follow-up (2/2 passed).

**Production verification**: deployment succeeded (Vercel status
`success`); production bundle string-checked directly — all 19 applied
replacements present, all 14 removed words absent; Find-the-Word
smoke-tested live in automation Chrome against an untouched entry (`cat`),
rendering unchanged, no regressions.

**Ship summary**: merged `content/manifest-r1` → `main` (`--no-ff`,
`3061159`), Sal-approved alternatives applied as a follow-up commit
(`15a0d48`, merge not rewritten), pushed to `origin/main` (carrying the
previously-unpushed `DEVICE_SESSION_PREP.md` commit along, as flagged and
approved). Test accounts (both the manifest-audit account from the prior
run's Phase 2/3 and this run's smoke-test account) fully deleted and
cascade-verified. No product code file other than
`src/games/findTheWordManifest.js` was touched.
