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

Status: IN PROGRESS

## PHASE 4 — Integrity + gates

Status: IN PROGRESS

## PHASE 5 — Ship

Status: IN PROGRESS

## COMPLETION

Status: IN PROGRESS
