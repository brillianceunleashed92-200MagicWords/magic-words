# WALKTHROUGH_PROPOSAL — pedagogy-delta note (supersedes v2)

**This is a PROPOSAL / pre-call demo asset. It is NOT design canon and NOT a build
authorization.** `WALKTHROUGH_PROPOSAL.html` in this same directory is a standalone,
self-contained mockup built to walk Dr. Marion Blank through a set of interaction ideas ahead
of a call — nothing in it is committed to, and nothing here supersedes the committed mockups
under `docs/design/mockups/` or any shipped code.

**Supersedes** the earlier `WALKTHROUGH_V2_PROPOSAL.html` (removed from this directory as part
of this commit — see `docs/design/WALKTHROUGH_V2_PROPOSAL.md` for that draft's own
pedagogy-delta note, left in place as the historical record of what v2 proposed).

## What this demo shows

- **The faithful galaxy home** — greeting + streak/words/sparks stat row, "Today's Magic Word,"
  the Word Galaxy path with Nova hopping node to node, and the bottom app nav, all built to match
  the app's actual committed Home screen rather than a stylized reinterpretation of it (the gap
  v2 didn't close).
- **Memory Master as a SECOND WING, not a replacement.** The home screen above is unchanged;
  Memory Master is reachable as an additional wing alongside it, not a takeover of the existing
  home — same "two wings of the galaxy, not one galaxy replaced" framing as the flagged dev
  route's own integration proof, but now demonstrated against the real home layout instead of a
  standalone screen.
- **A Level 1 (pre-reader) vs. Level 3 (reader) toggle** — lets a single demo session show both
  the pre-reader on-ramp path and a more advanced reader's path through the same flow, side by
  side, rather than only ever demoing one starting point.
- **Dr. Blank's interwoven format flow**, carried over from v2 and re-demonstrated against the
  faithful home: **Is-It-Known?** pretest opening every word (skip-chain mechanic,
  `docs/BLANK_METHOD_SOURCES.md` §3, **Is It Known?**: "Perfect spelling → skip the word
  entirely, go to next"); **Spot It** look-alike foils (discrimination step in the spirit of §3's
  **Savvy Sounds** / **Spot 'n Sort**, not a direct port of either); **Almost It** near-miss
  frames (no direct source-doc analog); shrinking-scaffold **Build It** ending in an unassisted
  build (echoes the general shrinking-support principle in §6's correction doctrine, without
  claiming to implement any single named format there); and guided completion on a miss
  (distinct from the source's own **Dictation-with-redo** rule, §3: "ANY error → stop, show,
  cover, fresh paper, redo from the first word," which has no guided-completion step and always
  restarts the whole word).

## Hardening notes (engineering/UX, not pedagogy-sourced — called out as such, not implied to
be method-derived)

- **Gesture-unlocked audio** — audio playback is gated behind a real user gesture rather than
  attempting autoplay, avoiding the browser-autoplay-block failure mode.
- **No error sounds** — wrong answers get no negative audio cue, consistent with this repo's
  existing errorless-design convention (no red/X, no punitive feedback) but not itself sourced
  from Dr. Blank's material above.
- **Celebration fires only at true session end** — the celebration moment is reserved for actual
  session completion, not fired speculatively or on intermediate steps.
- **Self-contained / fast-load** — the demo has no external asset dependencies, keeping it usable
  offline or on a slow connection during a live call.

## Open items this demo does NOT settle — pending Dr. Blank's call

- **The 40–50 trial-count recount.** `docs/BLANK_METHOD_SOURCES.md` §3 states "roughly 30–45
  child responses per word per session" from the source material — this demo's own trial
  cadence has not been reconciled against that figure and needs a direct recount before any
  number here is treated as confirmed.
- **The unit → level mapping (OQ1).** The demo's Level 1/Level 3 toggle is illustrative only;
  the real 200MW-unit → Memory-Master-level mapping remains `[PROPOSED - OQ1]` pending Dr.
  Blank's sign-off (tracked in the Memory Master workstream, not resolved by this demo).
- **Tile-build-as-writing validity (her Q5/Q13).** Whether assembling a word from tiles (this
  demo's Build It mechanic) is an acceptable production analog for actual handwriting/typing is
  an open question for Dr. Blank — noted generally in `docs/BLANK_METHOD_SOURCES.md` §7
  ("confirmation that tile-building is an acceptable production analog for handwriting/typing")
  but not settled by this demo's use of it.
- **Plurals at Level 1.** Whether plural forms belong at Level 1 or a later level is undecided;
  this demo's placement of plural-form words at Level 1 is a proposal input for that
  conversation, not a decision.

Full source citations for the pedagogy claims above: `docs/BLANK_METHOD_SOURCES.md`.
