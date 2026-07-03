# WordArt Batch 1 — Depictability Review (Units 1–5)

Pedagogical bar: a 4–8-year-old must unambiguously identify the word from
the picture alone, with three other pictures beside it. 40 words in Units
1–5 currently lack real art (10 already illustrated: dog, cat, bird, frog,
eat, fly, jump, run, big, sad).

## DEPICTABLE — drawn this batch (27)

**Unit 1 (5):** fish, bear, ball, book, cup — all concrete single-referent
nouns, no ambiguity.

**Unit 2 (11):** horse, lion, rabbit, duck, cow, pig, turtle, monkey,
shark, ant, bee — all concrete animals, same treatment as the existing
dog/cat/bird/frog.

**Unit 3 (3):** swim, dance, sing — each has a distinct, unambiguous pose
(swim = horizontal figure with paddling limbs and water lines; dance =
mid-spin with motion arcs; sing = open mouth with musical notes). Not
drawing "play" (see skip list) or "jump" (already exists) from this unit.

**Unit 4 (2):** sleep, sit — sleep = closed eyes, "Zzz" marks (no letters —
drawn as small floating circles/wave-shapes, not the letter Z);
sit = clearly bent-knee seated pose, distinct from standing/idle.

**Unit 5 (6):** small, hot, cold, happy, fast, slow — all adjectives with
a clean visual contrast against their already-drawn or newly-drawn pair
(small vs. big; hot vs. cold; happy vs. sad; fast vs. slow).

## HARD/AMBIGUOUS — skipped, with reason (13)

| Word | Unit | Why skipped |
|---|---|---|
| play | 3 | Collides with whatever prop is drawn — reads as "ball," "toy," or any specific object rather than the general concept of play. |
| stop | 4 | No unambiguous single image; a hand/sign gesture isn't part of this illustration language and there's no red in the palette for a stop-sign convention. |
| go | 4 | Too abstract — collides with every other action verb ("go" could be any figure in motion). |
| look | 4 | Identical picture to "see" — both are just "a character with open eyes," not visually distinct from each other or from a neutral/idle pose. |
| see | 4 | Same collision as "look." |
| help | 4 | Abstract relational concept (one figure assisting another) reads as two-characters-together, easily misread as "friend" or "we." |
| open | 4 | Needs a specific object to open (door? book?) — the object choice would dominate the reading over the verb itself, and "book" is already a Unit-1 noun this batch draws. |
| push | 4 | A leaning-forward-against-something pose is subtle at 2×2-tile scale and risks reading as the object being pushed rather than the action. Candidate for a later batch with more drawing budget to get right. |
| pull | 4 | Same subtlety risk as push — deferred alongside it rather than drawn as a half-considered pair. |
| throw | 4 | Motion-in-progress verbs read reliably only with an unmistakable prop in clear flight; real candidate for a later batch, deferred here to keep this batch's verb set to the two cleanest (sleep, sit). |
| catch | 4 | Visually collides with throw — both center on a ball in mid-air, the riskiest pairing of the "ball motion" verbs in this same unit. |
| stand | 4 | A neutral standing pose is indistinguishable from the default/idle rendering of every other Buddy-based illustration — not diagnostic as its own concept. |
| hop | 4 | Collides with the already-illustrated "jump" — both read as "figure airborne," too similar for a 4–8-year-old to reliably tell apart. |

Total: 27 drawn, 13 skipped (vs. the mission's "roughly 20–24 drawn,
6–10 skipped" estimate — Unit 2's animal set alone is 11 concrete,
unambiguous nouns with no reason to exclude any of them, which pushed the
drawn count up; Unit 4's action-verb set turned out mostly too risky at
this illustration scale, which pushed the skip count up correspondingly).
All 13 skips continue routing to non-picture activities via the existing
`pictureEligible` capability check — that's correct, intended behavior,
not a gap.
