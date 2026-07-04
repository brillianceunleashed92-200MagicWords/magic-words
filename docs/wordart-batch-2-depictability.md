# WordArt Batch 2 — Depictability Review (Units 6–10)

Same pedagogical bar as Batch 1: a 4–8-year-old must unambiguously identify
the word from the picture alone, with three other pictures beside it.

**Scope note, checked against the live `words` table (not assumed from the
mission brief):** the actual curriculum has more words per unit than the
mission's summary listed. Family (Unit 6) matches exactly (8 words). Food &
Drink (Unit 7), Colors (Unit 8), and Home & Travel (Unit 9) each have 12
real words, not 8 — 4 extra per unit (`soup`/`juice`/`banana`/`grapes`;
`white`/`brown`/`gray`/`gold`; `phone`/`light`/`clock`/`table`). Numbers
(Unit 10) has 11, not 8 (`eight`/`nine`/`zero` also exist). "Every Unit 6–10
word without art" is the mission's own instruction, and Batch 1 set the
precedent of driving off the real table rather than a hardcoded list — so
this review covers the full real set, not just the mission's examples.

## Unit 10 — SKIPPED ENTIRELY (architecture conflict, not a depictability
call): one, two, three, four, five, six, seven, eight, nine, ten, zero

Confirmed via `supabase/migrations/0014_words_teaching_track.sql`: numbers
were already deliberately classified `teaching_track = 'sight'` in an
earlier session, with documented reasoning — "numbers, taught as a counting
sequence rather than a single referent picture." `WordArt.jsx`'s renderer
hard-codes `teachingTrack === 'sight' → always typographic fallback`,
regardless of `REGISTRY`/`has_art` membership. Drawing countable-group art
for numbers this batch would produce dead code — real illustrations that
never actually render anywhere, because the client-side gate suppresses
them unconditionally. Fixing this would mean reversing a previous
session's deliberate pedagogical classification and auditing every other
place `teaching_track` drives behavior beyond `WordArt` — out of scope for
an additive-only art batch. Raised to the user directly; decision: skip
Unit 10 for this batch, document the conflict (this entry) rather than
silently drawing unusable art or silently reversing prior data. Numbers
remain sight-track, unillustrated, exactly as before this batch.

## Unit 6 — Family (8 words)

**DEPICTABLE (5): baby, boy, girl, man, woman**

Two independent, genuinely visual axes make these five mutually
distinguishable: **size** (baby, infant-proportioned and much smaller <
boy/girl, child-sized < man/woman, adult-sized) and a **gender-presentation
convention** (hairstyle length + simple clothing-shape, same convention
`man`/`woman` and `boy`/`girl` each use at their own size tier). No pair
among these five collides once size is a load-bearing signal.

**SKIP (3): mom, dad, friend**

| Word | Why skipped |
|---|---|
| mom | Purely relational ("mother of someone") — an isolated picture of an adult woman is pixel-identical to `woman`. Since `woman` is drawn this same batch, `mom` would be a genuine answer-leak/collision risk (two different correct answers with the same picture) rather than just a missed opportunity. |
| dad | Same collision, against `man`. |
| friend | Relational concept requiring two figures together to read as "friendship" at all — same reasoning Batch 1 used to skip `help`: two-figures-together reads as "we"/"together," not diagnostically as `friend`. |

## Unit 7 — Food & Drink (12 words, all DEPICTABLE)

apple, milk, cookie, cake, pizza, bread, egg, water, soup, juice, banana,
grapes — all concrete, single-referent food/drink items with standard,
well-established iconography and distinct silhouettes. One real collision
risk identified and resolved by design, not luck: **three separate
liquid-in-a-container words** (milk, water, juice) plus soup (also a
liquid). Disambiguated by combining container *shape* with liquid *color*,
not color alone:
- `water` — a plain blue droplet shape (not a glass at all — avoids
  colliding with the Unit-1 `cup` illustration's own glass/cup silhouette).
- `milk` — opaque white liquid in a tall glass.
- `juice` — orange-colored liquid in a tall glass (same glass silhouette as
  milk, differentiated by fill color and an added straw).
- `soup` — liquid in a wide shallow bowl (not a glass), with steam lines —
  container shape alone already separates it from the other three.

No other collision risk in this unit: cookie/cake/pizza/bread are baked
goods with clearly different silhouettes (flat disc w/ dots; tall layered
+ candle; triangular wedge w/ toppings; loaf w/ slice lines); egg is a
plain cream oval, distinct from the already-drawn multicolor `ball`;
banana/grapes/apple read as three clearly different fruit silhouettes
(elongated yellow curve; cluster of small circles; single round red fruit).

## Unit 8 — Colors (12 words)

**Disambiguation decision (per the mission's own callout):** did **not**
draw "a red apple" for `red` etc. — anchoring a color word to a specific
real object risks the child naming the *object* instead of the *color*,
and is a *worse* collision risk here specifically because `apple` is a
real Unit-7 vocabulary word in this same curriculum; a child could
correctly recognize the picture and still tap the wrong tile confusing
the color word for the fruit word. Every color instead gets an abstract
rounded paint-drop/blob shape — same chunky-shape-with-darker-outline-
and-a-highlight construction language as `ball`/mugs, just with no
character or object referent, so the *only* thing being read is the color
itself.

**DEPICTABLE (11): red, blue, green, yellow, orange, purple, pink, black,
white, brown, gray** — each gets its own accurate hex (see `WordArt.jsx`'s
new `COLOR_SWATCH` map), not forced into the existing brand palette,
because the brand's `sky` and `mint` tokens are deliberately stylized
(sky leans purple-blue, mint leans teal) and would teach the wrong color
word if reused literally. `orange` and `pink` do reuse the existing
`tang`/`bubble` brand tokens since those genuinely read as accurate
instances of those two colors. `white` gets a visible mid-gray outline
stroke (same triad convention as everything else, just needed here for
the swatch to be visible at all against the app's light background).
`black` gets a soft highlight ellipse (same gloss-highlight convention
`ball` uses) so it reads as a solid drawn object, not a flat void/hole.

**SKIP (1): gold**

| Word | Why skipped |
|---|---|
| gold | This illustration language is flat vector color with no gradient/metallic-sheen capability (and none should be added — out of scope, additive-only). Flat "gold" and flat "yellow" collapse to a very similar hue at quiz-tile size — a real ambiguity risk between two words that would appear as literal distractors of each other, not a hypothetical one. |

## Unit 9 — Home & Travel (12 words, all DEPICTABLE)

bed, chair, door, house, car, bus, hat, shoe, phone, light, clock, table —
all concrete objects with standard, unambiguous iconography. Two pairs
worth naming the disambiguation for, since they're the closest calls in
this unit:
- `car` vs `bus` — distinguished by proportion and window count, not just
  size: `car` is a short rounded two-window silhouette; `bus` is a long
  boxy body with a repeated row of same-size windows. Common, reliable
  convention at this age.
- `chair` vs `table` — `chair` has a seat *and* a tall backrest; `table` is
  a flat horizontal surface on four thin legs with no backrest at all. The
  backrest is the single feature that makes these unambiguous from each
  other.

`clock` is drawn with hour/minute hands and small tick marks on the rim —
**no numerals on the face**, consistent with the no-digits/no-letterforms
rule (the same rule the mission calls out for Numbers) applied on
principle to every illustration, not just Unit 10.

## Totals

| Unit | Depictable (drawn) | Skipped |
|---|---|---|
| 6 — Family | 5 (baby, boy, girl, man, woman) | 3 (mom, dad, friend) |
| 7 — Food & Drink | 12 (all) | 0 |
| 8 — Colors | 11 | 1 (gold) |
| 9 — Home & Travel | 12 (all) | 0 |
| 10 — Numbers | 0 | 11 (all — architecture conflict, see above) |
| **Total** | **40 drawn** | **15 skipped** |

Substantially larger than Batch 1 (27 drawn) — driven by the real word
count being higher than the mission's summary (44 real words across units
6–9 vs. the ~32 implied) and Units 7/9 being almost entirely concrete,
unambiguous nouns with no reason to exclude any of them, same dynamic
Batch 1 saw with Unit 2's animal set.
