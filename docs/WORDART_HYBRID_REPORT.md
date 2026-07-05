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
DONE. Built a temporary contact-sheet route (`src/dev/WordArtContactSheet.jsx`, removed before
merge) rendering all 77 `REGISTRY` words at the real answer-tile size/styling (92px `WordArt`,
`AnswerTile`'s exact chunk-shadow/cloud-bg tile), `?labels=on|off`. Screenshotted both states,
zoomed into every cluster with a plausible collision risk. Root cause confirmed directly in code
(`WordArt.jsx` comment, ~line 18): action/adjective words share one recurring flat gold "Buddy"
circle (`buddyFill:'#FFC531'`, same hex as the `sun` token) differentiated only by small props/
motion-lines — exactly the "near-identical yellow blobs" failure mode.

**The Buddy-based set (14 words) — label-cover verdicts:**

| Word | Verdict | Why |
|---|---|---|
| jump | **WRONG** | Two short straight legs on the base blob, no visible gap/shadow separation from the ground at tile size — reads as a neutral standing pose, not airborne. Does not read as "jump" at all without the label. |
| sit | **WRONG** | A thin horizontal bar below a smiling blob — doesn't read as a seated/bent-knee pose at tile size, indistinguishable from a generic idle blob. |
| run | **WRONG vs. fast** | Orange motion-lines + tiny legs. Confirmed near-total visual collision with `fast` (adjective) — same blob, same motion-line treatment, same angle, no other distinguishing feature. A real collision the brief's own list didn't call out (it named run/jump/swim/dance; this is run/fast, a verb/adjective pair). |
| fast | **WRONG vs. run** | Same finding as above — the two are effectively the same illustration. |
| dance | VAGUE | Pink ribbon-arc arms read as generic "excited arms up," not specifically mid-spin (the code's own comment already flags this exact risk). |
| happy | VAGUE | Bigger smile + two tiny sun-ray marks near the top corners — weak differentiation from the base "content" blob (`eat` without its prop looks almost the same). |
| eat | VAGUE→PASS | Small orange food shape at the mouth is a real, if small, distinguishing prop — identifiable in isolation, but shares the base blob with 13 other words so still collision-prone in a 4-tile grid. |
| swim | PASS | Wavy lines beneath + paddle-arm shapes are a strong, well-established convention — reads clearly even next to other Buddy poses. |
| fly | PASS | Distinct wing shapes (colored `sky` blue, differentiated from the body) + tilt — clearly reads as airborne/flying. |
| sing | PASS | Musical notes are a strong, unambiguous cue (not letterforms — no rule conflict). |
| sleep | PASS | Closed-eye lines + ascending bubble trail read clearly as sleep. |
| sad | PASS | Single tear mark is a strong, unambiguous, well-established convention. |
| big | PASS | Distinct via scale contrast + the small reference circle in-frame — a different *composition*, not just a prop swap. |
| small | PASS | Same big/small paired composition (two circles, faded-large behind detailed-small) — distinct construction, not just palette. |

**Confirmed noun offenders (matches the brief's list):**

| Word | Verdict | Why |
|---|---|---|
| shark | **WRONG** | Gray-blue elongated body + dorsal fin + single eye — same construction language as `fish` (light blue, fin, single eye), differs only by hue and fin count. Reads as "another fish," exactly as the brief describes. |
| duck | **WRONG** | Code (`DuckArt`, `WordArt.jsx` ~254-266) intends a flat curved bill (the orange `path` band), but geometrically it sits flush against the bottom of the head circle rather than protruding forward — at 92px it reads as a thin collar/neckline, not a bill. The illustration doesn't read as "duck" at all without the label (doesn't specifically collide with `bird`, which has visible wings/pointed beak — the failure is that duck reads as an unlabeled generic round character, close to the Buddy-cluster's own gold color family). |

**Everything else (61 words: all animals except duck/shark, all Unit 6-9 people/food/colors/
home-travel objects, hot/cold/slow which are non-Buddy objects) — PASS.** Cross-checked against
both contact-sheet screenshots and the existing `wordart-batch-1-depictability.md` /
`wordart-batch-2-depictability.md` collision-review docs, which already document deliberate
disambiguation work for every close pair in this set (milk/water/juice/soup by container shape +
liquid color; car/bus by proportion + window count; chair/table by backrest; color words as
abstract paint-drops specifically to avoid colliding with `apple`/etc.). No new collisions found
in this set.

**Net: 5 confirmed offenders needing real fixes (jump, sit, run, fast, shark, duck — six words,
matching + extending the brief's six known offenders), 3 VAGUE (dance, happy, eat) worth
strengthening while rebuilding the set anyway, 6 already PASS (swim, fly, sing, sleep, sad, big,
small) but getting the same Nova reskin for character consistency per Part 2.**

## NOVA VERB SET — poses shipped, how the set passes label-cover, new triads added
DONE. Built `NovaBase` (`WordArt.jsx`) as a new shared figure — flame-swoop hair (3 overlapping
points, the single silhouette cue Buddy never had), cream face, small gold body, comet-tail wisp —
used by all 9 standalone verbs: `eat, swim, dance, sing, sleep, sit, fly, jump, run`. `BuddyBase`
is untouched and still serves the adjectives (`big, sad, happy, fast, slow, hot, cold`) — out of
this pass's scope per the brief's verb/noun-only fix categories.

**Per-word fixes over the audit's WRONG verdicts:**
- `jump`: character raised well above the (fixed-position) ground shadow, short tucked legs, added
  upward launch-motion lines above the head. Re-screenshotted: now shows a clear, visible airborne
  gap — reads as jumping, not standing.
- `sit`: replaced the old thin horizontal bar with two unmistakably bent L-shaped legs (thigh +
  shin at a right angle, the standard seated-figure convention) and a lower body position.
  Re-screenshotted: reads as seated.
- `run` vs. `fast` collision: resolved as a side effect of the Nova reskin — `run`'s new
  flame-hair silhouette no longer shares any construction with `fast`'s (unchanged, still
  plain-circle Buddy), so the two are no longer visually identical.

**VAGUE words strengthened while rebuilding anyway:** `eat` (food prop kept, now on a
recognizably-Nova figure), `dance` (ribbon arms + spin-swirl kept), `sing`/`swim`/`sleep`/`fly`
(kept their existing strong props — music notes, waves, bubbles, wings — now on the new figure).

**Label-cover re-verification:** re-ran the same contact-sheet tool with the new art, both labels
on/off. Confirmed: the whole 9-word verb set now shares one immediately-recognizable silhouette
(flame hair) distinct from every other word in the registry, while each pose keeps its own prop/
motion-line differentiator from the others in the set. Adjectives sharing the old Buddy blob
(`happy`, `sad`, `big`, `small`, `fast`, `slow`, `hot`, `cold`) are visually unaffected, as intended.

**New triad:** `novaFill:#FF9F1C / novaOutline:#B85C00 / novaInner:#FFF6E8` +
`novaTail:#5B4BD6` (accent only) — added to `theme/tokens.js` and `DESIGN_BRIEF.md`'s palette
table in the same batch of commits.

**Noun fixes (duck, shark) — separate from the Nova reskin, per the brief ("nouns keep their own
dedicated art"):**
- `duck`: the bill previously sat flush against the bottom of the head circle (fully contained
  within its bounding shape), reading as a chin-stripe. Now extends past the head circle's edge —
  the same technique `BirdArt`'s beak already uses — so it reads as a protruding bill.
- `shark`: previously the same rounded-body + single small-fin construction as `fish`, differing
  only by hue. Now has a large, unmistakably triangular dorsal fin and a body that tapers to a
  point, while `fish` is untouched (still a round body, small fin, light blue). Re-screenshotted
  side by side: no longer reads as "another fish."

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
