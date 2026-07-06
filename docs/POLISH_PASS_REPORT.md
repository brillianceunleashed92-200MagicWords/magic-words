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
**Candy migration**: `SayItWithNova.jsx` fully off `gameTheme.js` — now
`colors`/`fonts`/`shadows` (theme/tokens) + `NovaPorthole` (lessonChrome),
joins `isE2Activity` in `GameEngine.jsx` (gets the shared top progress
bar/mute/close chrome + `skyGradient` background like every other E2
activity). Verified live: whole-screen Candy chrome, no `gameTheme.js`
import remaining (grep-confirmed).

**Layout/UX**:
- Mic control centered via an explicit `display:flex; justifyContent:
  center` wrapper (previously relied on the parent's `textAlign:center`,
  which happened to work but wasn't an explicit layout guarantee).
- **5s no-speech timeout**: a real timer now (`NO_SPEECH_TIMEOUT_MS`),
  started on every `startListening()` call, cleared on any genuine
  result/error, aborts the recognition and shows "Didn't quite catch
  that — try again!" (no red, no penalty — doesn't count as a miss,
  just returns to idle so the child can tap the mic again). Previously
  there was no timeout at all; a browser that never fires `onresult` or
  `onend` for a given session would leave the child stuck on "Nova is
  listening…" indefinitely.
- **Pronunciation help**: a speaker button (same placement convention as
  every other activity's replay button, next to the `NovaPorthole`) that
  replays the word via the shared singleton, available any time — not
  just automatically on mount/after a miss like before.
- **Auto-listen**: after the mount prompt finishes playing, recognition
  starts automatically IF `navigator.permissions.query({name:
  'microphone'})` reports `'granted'` already. Wrapped in try/catch —
  Safari's inconsistent support for the `'microphone'` permission name
  is treated as "not yet granted" on any failure/rejection, which simply
  means auto-listen doesn't fire; the manual mic button is unconditional
  and always rendered, so there is always a working path regardless of
  what the permission check does.
- **Unsupported browsers — decision**: keep the existing graceful
  self-report floor ("I said it!") rather than pulling Say It from the
  rotation on affected devices. Justification: Quiz Boss's old self-
  rating flaw (Prompt 6) was bad specifically because a real MEASURABLE
  alternative existed and was being skipped in favor of self-report: a
  real verbal-production task has no substitute measurement when the mic
  is genuinely unavailable, so self-report is the honest floor here, not
  a shortcut around a better option. Device-level rotation removal would
  also need new device-detection plumbing in `activityDefs.js` for a
  single activity — a materially bigger change than this pass's scope.

**Word-6 / mid-session misfire — found and fixed, not just
characterized**: read the code looking for the shape
`DRAW_IT_TRACING_REPORT.md`'s `completeStroke` double-completion bug
describes, rather than assuming "6 words" was itself the trigger (it
isn't — word 6 is just the last question, no different in kind from any
other). Found a real, plausible race: nothing stopped a second
`startListening()` call while a PREVIOUS `SpeechRecognition` instance's
async browser callbacks were still in flight. A real, observed WebKit
quirk — `onend` firing before `onresult` ever does — would re-enable the
mic button while the old recognition object could still deliver a late,
stale result afterward, scored against closures capturing the OLD
`missCount`/`status`. **Fix**: `recognitionSeqRef`, a sequence number
bumped on every real `startListening()` call; every recognition callback
(`onresult`/`onerror`/`onend`) checks it's still current before acting,
discarding stale events instead of processing them. Also aborts any
still-running previous recognition before starting a new one.
**Regression test**: `tests/say-it-race.spec.js` stubs `SpeechRecognition`
with a controllable fake, forces exactly this ordering (end-with-no-
result → new attempt starts → the first instance's result finally
arrives late), and asserts the stale event is discarded while the
genuine current attempt still resolves correctly. Passes. This doesn't
prove it's THE cause of the real-world "random celebration" reports
(never reproduced on a real device, per Prompt 1's own notes) — it's a
genuine bug this pass found and closed regardless, characterized
precisely for the device checklist alongside it.

**Mobile-mic feasibility assessment** (assess + instrument, no
speculative fix shipped, per the mission):
- **Current usage**: `window.SpeechRecognition ||
  window.webkitSpeechRecognition`, `lang: 'en-US'`, `interimResults:
  false`, `maxAlternatives: 3`, one `.start()` per attempt, matched via
  loose substring/inflection comparison against the target word.
- **WebKit constraint set** (iOS Safari AND Chrome-iOS — both are
  WebKit under the hood on iOS, Chrome's own engine is irrelevant there):
  only the `webkit`-prefixed constructor exists, never the unprefixed
  one; speech recognition must be started from within a direct user
  gesture handler in some iOS versions (a `.then()` continuation off an
  audio `onended` callback, as this pass's auto-listen does, may NOT
  count as a user gesture on iOS — a real risk specific to the
  auto-listen feature this pass adds, flagged explicitly below);
  permission prompts and the resulting `NotAllowedError`/`not-allowed`
  can behave inconsistently across iOS versions after a page reload;
  some iOS Safari versions have historically had silent/hanging
  recognition sessions with no `onerror` ever firing (which is exactly
  what the new 5s timeout now catches instead of leaving the UI stuck).
- **Auto-listen's iOS risk, called out specifically**: because starting
  recognition from an `audio.onended` callback (not a direct tap) may
  not satisfy iOS's user-gesture requirement, auto-listen may silently
  fail to start on iPhone even when this pass's own permission check
  reports `'granted'`. This is exactly why the manual mic button was kept
  as the unconditional, always-rendered path rather than treated as a
  rare fallback — on iOS specifically, it may be the ONLY path that
  reliably works, permission state notwithstanding. Device checklist item
  added to specifically test whether auto-listen actually starts
  recognition on a real iPhone or silently no-ops.
- **Instrumentation added**: structured `console.log` events
  (`[SayItDiag] event=... ts=...`) — chosen over a Grown-Ups-gated visual
  debug readout because remote-inspector console output is already
  reachable the instant a cable is plugged in, with no debug menu to
  find first. Events: `unsupported`, `permission-state`,
  `permission-query-failed`, `start` (with sequence number),
  `no-speech-timeout`, `result` (heard/not + raw alternatives),
  `stale-result-ignored`/`stale-error-ignored`, `error` (raw error code),
  `end`, `finish`, `pronunciation-help-tapped`.
- **Verdict + recommended path**: (a) **fix within Web Speech** is the
  right near-term path — this pass already did the achievable share of
  it (timeout, sequence-guarded callbacks, permission-aware auto-listen
  with a solid manual fallback); the device session should specifically
  check whether auto-listen actually fires on iOS per the risk above, and
  whether real recognition errors surface distinctly from silent hangs
  now that the timeout exists. (b) **graceful-unsupported handling** is
  already the floor (self-report), confirmed adequate for a genuinely
  unsupported/denied case. (c) **server-side transcription** — assessed
  and deferred: real cost (per-utterance transcription API calls, on top
  of existing ElevenLabs TTS spend) and real COPPA implications (a
  child's recorded voice is exactly the kind of biometric/PII data the
  existing `COPPA_DATA_INVENTORY.md` scope would need to cover — consent
  language, retention limits, deletion cascade) — almost certainly not
  worth it while (a) hasn't been exhausted on a real device yet, and
  flagged for the legal review either way given the child-voice-data
  angle alone.

## MOMENTS
**Schema decision — this is a `supabase db push` stop, per the mission's
own text**: `magic_moments.kind` has a CHECK constraint
(`kind in ('star_ignition', 'drawing', 'audio_reading', 'milestone',
'streak')` — confirmed by reading migration `0008`) that does NOT allow
a new `'tracing'` value. Wrote `supabase/migrations/0031_magic_moments_
tracing_kind.sql` (widens the constraint to add `'tracing'`; RLS policy
from `0008` is unchanged — it scopes by `child_id → parent_id` ownership
regardless of `kind`) but have NOT pushed it — that needs Sal's explicit
approval same as any other schema change. All the application code below
is written and ready; the `INSERT` will 400 against production until the
migration is approved and pushed.

**Why a new kind, not reusing `drawing`**: `drawing` predates the
letter-tracing rebuild (Prompt 5) and represented a genuinely different
concept — a user-drawn artifact from the old freeform canvas. Tracing
produces no artifact (confirmed: no Storage upload anywhere in this
change, exactly per the mission's "no artifact, just a structured row"),
so reusing `drawing` for a shape it was never actually seeded with would
misrepresent historical data, not just be a naming quibble.

**Implementation** (ready, pending the migration):
- `useAddTracingMomentMutation` (`magicMoments.js`) — inserts
  `{ child_id, kind: 'tracing', payload: { word } }`.
- Wired into `PlayScreen.jsx`'s `handleProgress`, fire-and-forget (same
  pattern as the `learning_events` insert right above it — a failed
  moment insert must never affect gameplay or word_progress), gated on
  `gameType === 'draw_it' && correct`.
- `MomentsTab.jsx`: new `tracing` entry in `KIND_LABELS` renders a
  "Traced X!" card using `<WordArt word={payload.word} />` for the
  thumbnail — deliberately NOT duplicating a has_art check here: WordArt
  already falls back to its own `TypographicWord` treatment internally
  when no illustration is registered for that word, so "real
  illustration when available, typographic otherwise" falls out of an
  existing component for free, exactly matching the mission's spec.
  Both the feed list and the html2canvas share-image frame render it.

**Verification**:
- Historical `drawing`-kind rows: unaffected by construction — the
  `drawing` entry in `KIND_LABELS` and its rendering path are untouched;
  only a new `tracing` entry was added alongside it. Build clean.
- The actual live insert/render round-trip is blocked on the migration
  above — will be verified live once it's pushed, added to this pass's
  VERIFICATION section rather than claimed done here.

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
