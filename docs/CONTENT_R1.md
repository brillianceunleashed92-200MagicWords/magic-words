# CONTENT R1 — FIND-THE-WORD MANIFEST CLEANUP
**Written:** July 6, 2026 · **Execute from:** `~/magic-words` · **Branch:** `content/manifest-r1`
**Source findings:** `docs/DEVICE_PREP_REPORT.md` Phase 1 (31 flags, 4 duplicate keys). Sal has ratified the edit table below; rows he deleted before kickoff are vetoed and skipped.

## HARD CONSTRAINTS
1. The ONLY product file this run may touch is `src/games/findTheWordManifest.js` (plus test fixtures per Phase 4's narrow rule, plus docs). Zero logic changes anywhere.
2. **Never improvise a replacement word.** Each edit below lists a replacement and a fallback. If both fail validation, leave the original in place, mark the row UNRESOLVED in the report with a proposed alternative for Sal — do not substitute an unlisted word into the code.
3. Approval stops: `git push origin main` (note: if the DEVICE_SESSION_PREP docs commit is still unpushed on local main, this push will carry it — say so explicitly at the approval stop). Report `docs/CONTENT_R1_REPORT.md` at step 0 with RUN TIMING + live updates.

## PHASE 1 — LOAD THE RULES
Read `findTheWordManifest.js`'s full header comment and extract the file's own stated distractor rules. The validation checklist for every replacement = those rules PLUS: (a) real English word; (b) age-appropriate for a 4–8-year-old (no adult, gambling, romantic, violent, or clinical register); (c) not a morphological/derivational form of its target; (d) visually/orthographically similar to the target (shared letters, shape, similar length); (e) unique within its entry and ≠ the target; (f) not identical to another distractor in the same entry after all edits apply. Record the assembled checklist in the report before touching anything.

## PHASE 2 — DEDUPE THE FOUR DOUBLE-DEFINED KEYS
`nine`, `eight`, `zero`, `this` each appear as two literal entries. For each: verify the two values are identical; if identical, delete the LATER literal and keep the first; if they differ in any way, STOP that key and flag — do not guess which is canonical. After Phase 3, the file must contain exactly 200 unique keys and 200 literals.

## PHASE 3 — APPLY THE EDIT TABLE
For each row: validate the replacement against the Phase 1 checklist and entry-local uniqueness; on failure use the fallback; on double failure, UNRESOLVED per constraint 2. Apply edits to the single surviving literal for deduped keys.

| # | word | remove | replace with | fallback | reason class |
|---|---|---|---|---|---|
| 1 | eight | eighth | sight | light | rule violation (self-derivative) |
| 2 | eight | eighty | night | might | rule violation (self-derivative) |
| 3 | cookie | bookie | rookie | cooker | age register (gambling) |
| 4 | dirty | flirty | thirty | thirsty | age register (romantic) |
| 5 | a | I | at | as | weak look-alike (no shape overlap) |
| 6 | I | a | if | it | weak look-alike |
| 7 | six | silk | sick | sit | weak look-alike / breaks fix-mix rhyme set |
| 8 | pizza | piazza | plaza | dizzy | obscure vocabulary |
| 9 | banana | manna | bandana | banner | obscure vocabulary |
| 10 | heart | hearth | heard | hear | obscure vocabulary |
| 11 | zero | zeal | hero | zebra | obscure vocabulary |
| 12 | green | preen | greet | greed | obscure vocabulary |
| 13 | pencil | council | stencil | pretzel | obscure vocabulary |
| 14 | door | doer | deer | dorm | obscure vocabulary / weak look-alike |
| 15 | apple | ample | apply | ripple | obscure vocabulary |
| 16 | apple | amble | ripple | dapple | obscure vocabulary |
| 17 | read | dead | lead | bead | topic sensitivity (brand-conservative default) |
| 18 | head | dead | bead | heap | topic sensitivity (brand-conservative default) |
| 19 | brown | drown | crown | frown | topic sensitivity (brand-conservative default) |

**Deliberately kept, record as accepted in the report (no code change):** `because/cause` (substring discrimination is arguably the exercise itself), and the remaining ODD flags (`colon`, `mellow`, `bellow`, `omen`, `fount`, `petty`, `posh`, `prone`, `phony`, `envy`, `empire`, `glean`, `clan`, `sappy`, `kelp`, `mast`, `clack`, etc.) — distractors are never taught or read aloud, so mild obscurity does not impair the visual-discrimination task.

## PHASE 4 — INTEGRITY + GATES
- Mechanical checks on the final file: exactly 200 unique keys; every entry's distractor count unchanged; no distractor === its target; no duplicates within an entry; no empty strings; file imports cleanly (`node -e` a dynamic import or equivalent).
- Search the test suite for hardcoded distractor words affected by the table (the find-the-word spec is the likely candidate). If a test asserts a removed word, update ONLY that fixture string to the applied replacement, logged per file:line — no other test changes.
- Full suite green (current main baseline; re-run flakes in isolation per convention). Build + lint (no new categories).

## PHASE 5 — SHIP
Merge `--no-ff` → **approval stop** (flag any hitchhiking unpushed docs commit) → push → deployment check (FIX R1 rule) → production verify: bundle hash changed; grep the served production bundle for two applied replacements (e.g. `bandana`, `rookie`) present and two removed words (`bookie`, `flirty`) absent — string-level proof the content is live. One manual Find-the-Word load in automation Chrome as a smoke pass (any word; rendering unchanged).

## COMPLETION
Report ends with: per-row outcome table (APPLIED / FALLBACK-USED / UNRESOLVED with proposal), the accepted-flags list, dedupe results, integrity results, gate results, production string-check evidence. Commit prompt + report → approval → docs push.
