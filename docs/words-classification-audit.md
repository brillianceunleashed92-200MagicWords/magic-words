# Content/Function Word Classification Audit

Requested check: the seeded `words` table has 155 content / 45 function
against an assumed "curriculum promise" of 100/100. This audit cross-checks
that assumption and the actual per-word tagging.

## 1. Is there an authoritative 100/100 source in this repo?

No. Searched `docs/200MW_Product_Blueprint.md`, `docs/MASTER_BUILD_PROMPT_v2.md`,
and `CLAUDE.md` for any explicit numeric split. The only relevant text is
CLAUDE.md's framing of the method itself:

> Dr. Marion Blank's Mastering Language and Communication (MLC) method (any
> child can be taught with ~200 content + non-content words)

and the blueprint's:

> **Content + function word pairing** — Dr. Blank's insight that no
> competitor implements. Function words are where struggling readers break;
> we teach them in context from day one.

Neither states or implies an even 100/100 split — they describe pairing
content and function words together in the curriculum, not a 50/50 quota.
**No document in this repo specifies a target ratio or an authoritative
per-word list to check the seed against.** "100/100" appears to be an
assumed reading of "~200 content + non-content words," not a sourced fact —
worth flagging back, since it changes what this audit can actually verify
against.

## 2. Linguistic re-classification of all 200 words

In the absence of a source document, the only meaningful check is whether
each word's `type` tag matches its actual grammatical class, using the
standard linguistic definition this project's own docs invoke (content =
open-class words that carry lexical/referential meaning — nouns, verbs,
adjectives; function = closed-class grammatical/structural words —
articles, pronouns, prepositions, conjunctions, auxiliaries, quantifiers,
wh-words, deictic adverbs).

**Result: all 45 words currently tagged `function` are genuinely function
words**, and **none of the 155 words tagged `content` are misclassified
function words.** Full pass, word by word:

- Articles: the, a
- Pronouns: I, you, he, she, we, they, me, my, it, this, that
- Prepositions: in, on, up, down, to, at, for, with, here, there
- Conjunctions: and, or, but, so, because, when
- Auxiliary/copula verbs: is, can, do
- Negation: not, no
- Quantifiers/determiners: all, more, many
- Wh-words: what, where, when, how
- Discourse/temporal particles: yes, now, then, after, before

— every one of these is correctly a closed-class grammatical word, not a
noun/verb/adjective. Conversely, every word in the 155-word content bucket
(cat, dog, run, jump, big, happy, mom, apple, red, bed, one, good, read,
sun, hand, …) is a genuine noun, verb, adjective, or number — no
prepositions, pronouns, conjunctions, or articles are hiding in that
bucket under a wrong tag.

Numbers (`one`–`ten`, `nine`, `eight`, `zero`) were the one genuinely
debatable category — numerals are sometimes treated as a separate class
entirely. They carry real quantity-reference (semantic content) rather
than pure grammatical function, and standard reading-list conventions
(Dolch/Fry) don't fold them into their sight-word/function lists either, so
`content` is the correct call and matches the current tagging.

**Conclusion: the 155/45 split is not a data error. The `words` table's
`type` tags are linguistically accurate as seeded.**

## 3. Why 100/100 isn't achievable for this word list

English's function-word class is closed and small — traditionally cited in
the low hundreds *across the entire language*, and the practical subset
appropriate for a 4–8-year-old curriculum is much smaller still. The 45
function words already seeded cover essentially the complete,
developmentally-appropriate inventory for this age group: both articles,
all core subject/object pronouns, the primary prepositions, the everyday
conjunctions, the three auxiliaries a beginning reader needs (is/can/do),
both negation words, the common quantifiers, and all four basic wh-words.

Reaching 100 function words from here would require one of two things,
both wrong for this product:
1. Reaching for genuinely advanced/low-frequency function words unsuitable
   for ages 4–8 (e.g. *however, although, whom, shall, hence, nevertheless*), or
2. Re-tagging real content words (verbs like *go, help, see, look*; or
   frequent-but-lexical words) as "function" just to hit a quota — which
   would misrepresent their actual grammatical role and undermine the
   errorless-learning/content-function-pairing pedagogy this whole feature
   exists to support.

## 4. Action taken

**No UPDATE migration was written or applied.** The data audited correctly;
writing a migration to force a 100/100 split would mean deliberately
mis-tagging real words, which is a worse outcome than the current accurate
155/45 split. This is the "data is not wrong" branch of the requested task,
reported explicitly rather than silently skipped.

If a true 100-function-word target is a hard product requirement, that's a
content-strategy decision (which additional, age-appropriate function words
to introduce, and which units to place them in) — not a classification bug
in the existing 200 words, and out of scope for a data-correctness audit.
