# Polish Pass Report (Repair Item 5, Automatable Half)

Prompt: `docs/200MW_Prompt7_Polish_Pass.md`. Branch: `fix/polish-pass`.

## PRE-FLIGHT
- `git status` clean at start; `git log origin/main..main --oneline` empty (main in sync with origin).
- `ce7171b` (activity roster merge) confirmed as ancestor of HEAD via `git merge-base --is-ancestor`.
- `SUPABASE_SERVICE_ROLE_KEY` presence confirmed in `.env.local` (existence check only — value never printed/logged).
- Branch `fix/polish-pass` created off `main`.

## GALAXY LOCK
**Derivation rule found** (`GalaxyScreen.jsx`, `pathWords` `useMemo`):
```
done = mastery >= 80
isCurrent = !done && word === currentWord.word   // currentWord: exactly ONE word app-wide
status = premiumLocked ? 'premium' : done ? 'done' : isCurrent ? 'current' : 'locked'
```
`currentWord` (`useCandyGalaxyData.js`) is a single adaptive recommendation
— the first unmastered word in `sort_order`. Before this fix, EVERY other
unmastered word, regardless of its own real mastery/attempt history,
fell into the `locked` branch. `WordNode.jsx` renders `locked` as a flat
translucent circle with a lock icon, `nonInteractive: true` (tap does
nothing), and never displays `percent` for that status — so a word with
real, attempted, sub-mastery progress was visually and functionally
identical to a word never touched at all.

**Reproduced directly** (local dev, real Supabase data, no live-account
guessing): seeded a fresh child with "cat" untouched (stays `currentWord`)
and "dance" at mastery 45%/attempt_count 4 (a realistic "played it a few
times, not mastered yet" shape). Rendered the Galaxy map: "dance" showed
the flat lock icon, no percent, non-tappable — identical to genuinely
untouched "fly"/"sing"/"play" next to it. Screenshotted before and after.

**Fix**: added a fourth status, `inProgress` — any unmastered,
not-currently-recommended word with `mastery > 0`. `GalaxyScreen.jsx`'s
derivation now branches `done → current → inProgress → locked`.
`WordNode.jsx` renders it as a solid mint circle (`colors.mint`/
`mintDeep` — the same color already used for the errorless-scaffold
hint-glow elsewhere, an established "keep going" cue), tappable, showing
its real percent. Deliberately no pulse animation (unlike `current`) —
it isn't the primary recommendation, just visible and reachable.
`nonInteractive` still only covers `locked`/`premium`, so `inProgress`
inherits full tap-to-play behavior for free.

**Verified live**: "dance" now renders mint, "45%", and is tappable —
tapping it opens the Guided Path scoped to "dance" (confirmed via the
URL/screen state, not just the visual). Genuinely untouched sibling
words (`fly`, `sing`, `play`) remain unchanged (flat lock icon, no
percent, non-tappable) — the fix is additive, not a broadening of what
counts as reachable.

**Regression check**: `tests/galaxy-lock.spec.js` (self-provisioning) —
seeds the exact repro shape, asserts the node shows "45%" and is
tappable. Passes.

## REDUCED MOTION
Gated at the primitive, `src/games/lessonChrome.jsx`, per the mission:
- **`AnswerTile`**: entrance fade/slide-in now skips straight to shown
  (`entered` state defaults true under `usePrefersReducedMotion()`,
  double-RAF path only runs otherwise). The `lessonWiggle` shake and
  `lessonHintPulse` pulsing animation are suppressed (`animation: 'none'`
  under reduced motion) — the static feedback they layer on top of
  (softened opacity on a miss, the persistent glow box-shadow itself)
  stays, only the motion goes.
- **`ConfettiStars`**: returns `null` under reduced motion regardless of
  `active`. Consumers that already gated this themselves at the call site
  (`StoryBuilder`, `FindTheWord`, `QuizBoss` — from the activity-roster
  pass) are now double-gated, which is harmless and left as-is rather
  than stripped out. `WordMatch`/`WordHunt`/`RhymeTime`, which never
  checked this at all, are covered for free — exactly the gap
  `ACTIVITY_ROSTER_REPORT.md` flagged.
- `GalaxyPath.jsx`'s own scroll-driven path animation was already
  reduced-motion-aware from an earlier pass (unrelated to this fix,
  confirmed by reading it, not assumed).

**Verified under emulated reduced motion** (`page.emulateMedia({
reducedMotion: 'reduce' })`, `tests/reduced-motion.spec.js`, 3 specs):
- **Word Match** (untouched-by-this-pass control — never had its own
  reduced-motion check): tiles interactable immediately (no entrance
  stall), correct answer produces zero confetti SVG pieces.
- **Find the Word**: same result.
- **Match & Sort / RhymeTime** (a second untouched-by-this-pass
  control): same result.

All three complete their session normally under reduced motion — no
entrance-animation stalls, confetti suppressed. Caught and fixed a real
selector mistake while writing these specs: `ConfettiStars`' star-piece
path is NOT distinctive (`IconStar` reuses the identical SVG path for
completely ordinary UI, e.g. `StarProgress` segments) — false-positived
7 matches before switching to matching the `lessonConfettiPop` animation
name in the inline style instead, which is unique to the actual confetti
burst.

## SESSION POLISH
- **XP toast**: `GameEngine.jsx` — linger 900ms → 3000ms (before → after).
  The `xp-float-up` keyframe (`src/index.css`, shared with `App.jsx`'s
  legacy-tree caller, untouched) was a straight-line opacity 1→0 across
  its whole duration — bumping just the duration would have made the
  fade itself slower/washed-out rather than making the toast *linger*.
  Restructured to pop up, hold at full opacity through 80%, fade only at
  the very end. Still `pointerEvents: 'none'` (never blocks input) and
  now gated on `usePrefersReducedMotion()` (animation off entirely under
  reduced motion — GameEngine's top-level component didn't call the hook
  at all before this pass; added it). Verified live: toast still visible
  ~3s after the tap, well after the next question has already loaded.
- **Sticky back button**: `PlayScreen.jsx`'s Guided Path "Home" button —
  the only screen in the app using this back-arrow pattern (grepped for
  the pattern app-wide, confirmed no other screen needed the same fix).
  `position: sticky; top: 12` + `shadows.chunkSm` + `minHeight: 44`.
  Verified live: scrolling through the 11-node activity list keeps
  "Home" pinned at the viewport top, no overlap with content beneath.
- **End-of-play guidance**: added to `CelebrationRenderer.jsx`'s
  `pathComplete` block specifically — that celebration IS "when the
  day's path completes" (fires once, from `PlayScreen.jsx`'s
  `checkAndFirePathComplete`), not the per-session `SessionComplete`
  screen (which fires once per activity, far more often — adding it
  there would be noise, not one clean line). One line, growth-mindset
  register: "Nova will have a new word ready for you tomorrow!" Verified
  by code review (triggering a full day's path completion live requires
  finishing every eligible activity for a word — not re-run for this
  specific line given the mechanism itself, `queueCelebration`/
  `CelebrationRenderer`, is unchanged and already proven live in the
  activity-roster pass; only the JSX addition is new).
- **Grown-Ups hold gate**: `GrownUpsScreen.jsx`'s `HOLD_MS` 3000 → 1800
  (before → after), label text updated "3 seconds" → "2 seconds"
  (rounded for a child-facing instruction, matches the ~1.5–2s target).
  Already measured wall-clock elapsed time per tick (`Date.now()`, not a
  frame-count assumption) rather than trusting rAF's frame cadence, so it
  already tolerated rAF throttling in a backgrounded tab correctly — no
  shim needed, confirmed by reading the implementation, not assumed.
  Verified live via a `pointerdown`-only dispatch (no `pointerup` needed —
  `onPassed()` fires inside the tick once elapsed crosses `HOLD_MS`,
  same as before): unlocked well under the old 3s mark, then completed
  the math quick-check normally into the real Grown-Ups dashboard — the
  gate still genuinely gates, just faster.

## HINTS
**Word Builder first-letter hint** (`WordBuilder.jsx`): a static (no
pulse animation — nothing to gate on reduced motion) mint ring highlight
on the tray tile holding the next needed letter. **Struggle signal
chosen: first wrong tap** — matches the "first miss" trigger every other
errorless scaffold in the app already uses (WordMatch/WordHunt/
FindTheWord/RhymeTime), rather than an arbitrary idle timer that could
fire while a child is still thinking normally, and needed no new
plumbing (the wrong-tap handler already existed). Once triggered it
persists for the rest of that word (not per-letter — one nudge into the
pattern), then resets cleanly on the next question (component remounts
via `key={currentIdx}`). Visual only — never speaks or sounds out the
letter. Verified live: first wrong tap correctly highlighted "D" for
"dog", the highlight correctly advanced to the next needed letter after
each correct tap, and reset cleanly on the next word ("bird").

**Hint affordance audit** (table below) — audited every rotation
activity for what a struggling child can actually do:

| Activity | Hint affordance | Notes |
|---|---|---|
| Tap & Hear (WordMatch) | Audio replay button + errorless hint-glow | Already had both |
| Word Hunt | **Audio replay button (added this pass)** + errorless hint-glow | Had auto-play-once only, no replay — genuine gap, trivial fix (copied WordMatch's exact pattern) |
| Match & Sort (RhymeTime) | **Audio replay button (added this pass)** + errorless hint-glow | Same gap, same fix |
| Find the Word | Audio replay button + errorless hint-glow | Already had both (Prompt 6) |
| Quiz Boss | Audio replay button (audio-word questions) + errorless hint-glow | Already had both (Prompt 6) |
| Fill the Story (StoryBuilder) | Errorless hint-glow (no replay button, but a carrier-sentence audio auto-plays on mount) | Adding a replay button here is a slightly bigger change (this component's audio is a full sentence, not an isolated prompt) — flagged as a deferred recommendation, not done this pass |
| Word Builder | **First-letter position highlight (added this pass)**, audio plays "Can you spell X?" on mount, no replay button | The letter-highlight IS this activity's hint; a plain audio-replay button is a reasonable future add, deferred |
| Sound Match | Speaker button (tap to replay, pulses until first play) | Already had it |
| Draw It | Visual stroke-trace animation + off-path re-cue (its primary, built-in hint modality) + audio on mount, no replay button | Tracing's hint is inherently visual/kinesthetic already; audio replay is lower priority here, deferred |
| Story Time | Not deeply audited this pass — uses its own narration/read-along system, structurally different from the shared `fetchAudio`/`playAudio` pattern every other activity uses | Flagged for a dedicated look, not a trivial fix |
| Say It with Nova | Pronunciation-help button (added this pass, see SAY IT section) | Was previously silent on this — see Part 5 |
| Spell It Out | No audio, no hint at all | **Not fixed this pass** — `available: false` in `GAME_TYPES` and not reachable from `ACTIVITY_DEFS`/the current rotation at all (confirmed by reading both); Part 8's `gameTheme.js` endgame investigates whether this is dead code to delete outright, which would make a hint moot |

**Deferred recommendations** (flagged, not implemented — "bounded" per
the mission): Fill the Story replay button; Word Builder audio-replay
button; Story Time's narration system audit; Spell It Out's fate decided
by Part 8's dead-code investigation rather than hint work here.

## SAY IT
IN PROGRESS

## MOMENTS
IN PROGRESS

## TEST ACCOUNT
IN PROGRESS

## HOUSEKEEPING
IN PROGRESS

## DEVICE TEST CHECKLIST
IN PROGRESS

## VERIFICATION / PRODUCTION VERIFICATION
IN PROGRESS

## NOTES FOR NEXT PROMPTS
IN PROGRESS
