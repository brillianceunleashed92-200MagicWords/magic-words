# WordArt Legibility / Hybrid Art Pass — fix/wordart-legibility

## PRE-FLIGHT — five-check confirmation results
DONE. Housekeeping (`chore/repo-housekeeping`, merged to main locally) ran first — see
`docs/REPO_HOUSEKEEPING_REPORT.md` for the full execution log. All five checks re-verified
green before this branch was created:
1. `docs/200MW_Master_Project_Doc_v3.md` exists, `CLAUDE.md` pointer resolves.
2. `docs/MASTER_BUILD_PROMPT_v2.md` gone.
3. `scripts/verify-checkout.mjs` committed with provenance header.
4. `git stash list` empty.
5. No nested `magic-words/` directory.

## AUDIT — contact sheets + per-word PASS/VAGUE/WRONG verdicts
IN PROGRESS

## NOVA VERB SET — poses shipped, how the set passes label-cover, new triads added
IN PROGRESS

**Pre-work finding (confirmed before drawing anything):** the brief's ART LAW section quotes
Nova's palette as a locked radial gradient (`#FFF6D8 → --sun → #F09A12`, flat chunky primitives).
Traced that spec to `docs/mockup-E2-no-emoji.html`'s `.n-core` — a placeholder built before real
Nova artwork existed. The actual shipped Nova (`public/nova/nova-base.png`, `nova-celebrate.png`,
rendered by Higgsfield, used everywhere via `NovaSprite.jsx`/`NovaPorthole`) is a painterly glowing
comet-sprite: flame-shaped hair, cream face, big eyes, small hands, starry tail — same warm
gold/cream family, different rendering style entirely (soft painterly glow, not flat vector).
**Decision (confirmed with the user):** build new verb-pose art as flat-vector WordArt-style
illustrations capturing Nova's real signature cues (flame-swoop hair silhouette, cream face, dot
eyes, small gold body, comet-tail wisp) rather than following the brief's literal placeholder
gradient spec — reads as "the same character, simplified," consistent with how every other
WordArt illustration (DogArt, CatArt, etc.) is a flat-vector interpretation, not a literal render.

## SCENE ASSESSMENT — sentence source, pair-inventory count, options costed, recommendation + decision
DONE. Full assessment below; Part 3 (composed noun+verb scenes) is **descoped for this pass**.

**Sentence source (confirmed by reading the code):**
- Server: `api/session-generator.js`'s `buildSentence()` — deterministic, hand-written templates.
  Function words get one hand-authored sentence each (`FUNCTION_SENTENCES`, 45 words). Content
  words get a deterministic hash-pick from a small generic per-word-type template pool
  (`CONTENT_TEMPLATES`: noun/verb/adjective/number, 4 templates each).
- Client fallback: `useSessionPlan.js`'s `buildLocalQuiz()` — same shape, smaller template set.
  True-offline path: `'I know the word ___.'` for every content word.
- Not DB rows, not per-sentence runtime AI generation — deterministic templates, one blank per
  target word.

**Load-bearing finding:** every template has exactly one blank for one target word. Verb
templates (`'I like to ___.'`, `'Watch me ___!'`, `'Can you ___?'`, `"Let's ___ together!"`) never
name a noun/character. Noun templates (`'I see a ___.'`, `'Look at the ___!'`) never name a verb.
Checked the separate single-word "Story Time" feature (`localStory.js`) too — same single-word-only
pattern. **Nowhere in the codebase does a sentence pair a specific noun and a specific verb from
the curriculum together.** The brief's own example, "The dog can run" naming both a real curriculum
noun and a real curriculum verb, cannot be produced by any code path that exists today.

**Current picture behavior (unaffected by this decision):** Fill the Story's picture reveal
(`GameEngine.jsx` StoryBuilder, ~line 1008) already renders `<WordArt word={quiz.word} size={92}/>`
— the target word's own single-word art — after answering. For a verb target this is currently the
generic "Buddy" character. This is a Part 1/2 legibility problem (fixed by this pass), not a scene
problem.

**Inventory sizing if a true cross-product were pursued** (for context, not pursued): Units 1–10
have 49 has-art nouns and 9 has-art verbs (13 more verbs lack art) — a full cross product is ~441
pairs, far past the brief's own ≤25–30 pragmatic ceiling for hand-authored scenes.

**Options costed:**
- (a) Runtime SVG composition — rejected, worse than the brief anticipated (no parametric rig
  scaffolding exists at all to build on).
- (b)/(c) as literally briefed — both assume sentences already reference specific pairs so art is
  the only new thing needed. False here: the pairing mechanism itself doesn't exist. Building it
  means changing what verb sentences *say* (e.g. introducing a specific named noun subject into
  `CONTENT_TEMPLATES.verb`) — a sentence-content change, not just art/plumbing, and out of this
  pass's "art + art-plumbing, not an activity redesign" scope boundary.

**Decision (confirmed with the user):** descope composed scenes for this pass. Fill the Story's
existing single-word picture reveal is wired to Part 2's new Nova verb art (no new plumbing needed
— `<WordArt word={quiz.word}>` already keys off whatever REGISTRY entry exists). The disambiguation
goal ("no picture can disambiguate an answer") is met by legible verb art alone. True noun+verb
composed scenes are flagged below as a Prompt 4+ item requiring a sentence-template decision first.

## SCENES SHIPPED — pair list, no-scene rule, sync-check coverage
N/A this pass — see SCENE ASSESSMENT decision above.

## VERIFICATION — live checks + contact-sheet evidence + gates
IN PROGRESS

## NOTES FOR PROMPT 4 — what the Fill the Story rebuild can rely on (scene coverage, lookup API, generation constraints if applied)
IN PROGRESS

**Carried over from this pass:**
- True noun+verb composed scenes were NOT built. If Prompt 4 wants them, the sentence-generation
  templates (`api/session-generator.js` `CONTENT_TEMPLATES.verb` + `useSessionPlan.js`'s mirror)
  need a deliberate content decision first — introducing a named noun subject per verb sentence —
  before any scene art can be keyed to real pairs. That's a sentence-content change requiring
  explicit sign-off (crosses out of pure art/plumbing scope), not an art-only task.
- `DrawIt.jsx` (found during source-reading) shows **no WordArt/Nova reference image at all** today
  — it's a blank canvas with the text prompt "Draw a {word}!" only, and still runs on the old
  `T`-token (`gameTheme.js`) system rather than the Candy Galaxy tokens used everywhere else in
  `GameEngine.jsx`. The brief's VERIFY section assumes Draw It already shows Nova/WordArt art
  during a verb question — it doesn't. Flagged for a decision in this same report once Part 1/2
  art is ready (see AUDIT section).
