# Audio Consolidation Fix Report

Branch: `fix/audio-consolidation`. Bug-fix pass only — no activity
redesign, content, art, copy changes beyond what's needed for these fixes.

## VOICE AUDIT

**Root cause found**: `src/lib/useSpeak.js`'s `speak(text, { audioUrl })`
only played the real ElevenLabs voice when the caller already had a
pre-resolved `audioUrl` (from `useWordSpeak`'s word → `words.audio_url`
lookup, for the 200 curriculum words that have one). For any text with no
`audioUrl` — every UI/navigation label — it fell back to the browser's
own `window.speechSynthesis`. That's the exact "gameplay is one voice, UI
is a different voice" split: gameplay audio (GameEngine's carrier-sentence
prompts, correct/incorrect feedback, Story Time narration) already goes
through `gameAudio.js`'s `fetchAudio`/`playAudio` → the ElevenLabs voice,
but every UI-button caller of `useSpeak` was silently landing on Web
Speech instead, since none of them are curriculum words with a stored
`audio_url`.

Grepped every `speechSynthesis`/`SpeechSynthesisUtterance` reference
directly rather than assuming — two files:

| File | What it speaks | Voice used | Fixed? |
|---|---|---|---|
| `src/lib/useSpeak.js` | Any text passed without an `audioUrl` | Web Speech (browser voice) | **Yes** — now routes through `gameAudio.js`'s `fetchAudio`/`playAudio` (ElevenLabs) instead |
| `src/games/WordSong.jsx` | The chant-along "sing" effect, repeating the target word at varying pitch | Web Speech (browser voice), deliberately | **No — left alone, see below** |

Callers of `useSpeak()`'s bare `speak(text)` (no `audioUrl`) that were
silently hitting the Web Speech fallback before this fix, found by
tracing every call site:
- `src/components/candy/BottomNav.jsx` — `speak(tab.label)` on every nav
  tap ("Home", "Play", "Galaxy", "Grown-ups"). This is almost certainly
  what Sal was hearing as "the different voice on Home/nav buttons."
- `src/components/candy/QuestPathNode.jsx` — `speak(label)` (activity
  names like "Tap & Hear", "Word Hunt") and the locked-node nudge
  ("Let's finish this one first!").
- `src/components/candy/StoryReader.jsx` — the early-tap nudge on the
  comprehension question ("Let's read first!").

**Fix**: `useSpeak.js` no longer touches `speechSynthesis` at all in the
default path. `speak(text, { audioUrl })` now: plays `audioUrl` directly
if already known (unchanged, still the fast path for tracked words);
otherwise calls `fetchAudio(text)` → `playAudio(url)` — the exact same
generic TTS-proxy pipeline (`api/speak.mjs`, ElevenLabs voice
`QeKcckTBICc3UuWL7ETc`, cached by a hash of the text itself, not by
word) every other spoken line in this app already uses. Both paths now
go through `gameAudio.js`'s `playAudio`, which enforces the single-clip
singleton — UI speech and gameplay speech can never overlap each other
either, as a direct consequence of sharing one pipeline. No
`speechSynthesis` fallback kept even for a failed ElevenLabs fetch;
`fetchAudio` already degrades to silence on failure (`.catch(() => null)`),
matching how every other TTS call site in this app already behaves —
surfacing a second, different-sounding voice as an error fallback would
reintroduce the exact bug being fixed.

**`WordSong.jsx`'s chant deliberately NOT touched.** It uses
`speechSynthesis` for a real, load-bearing feature ElevenLabs' static
per-text MP3s cannot replicate: rapid per-repetition pitch variation
(`utter.pitch = pitches[i % pitches.length]`) for a "sing-song" chant
effect, documented in its own comment as a placeholder for a future real
recorded song clip. This is a pre-existing, deliberate exception — not
part of the "gameplay vs UI" split Sal described (it fires *during*
gameplay, not as a mismatched UI voice), and migrating it would either
lose the pitch-variation entirely or require a redesign of the activity's
distinctive mechanic, which is out of scope for a bug-fix pass ("do NOT
redesign activities"). Flagged here rather than silently left
unmentioned — see NOTES FOR NEXT PROMPTS.

## CORRECT-ANSWER

A prior pass (mission "audio experience," earlier in this lineage) had
already built a "chime → spoken encouragement → next question" sequence
in `GameEngine.jsx`'s `handleAnswer`, anticipating a later fuller
choreography prompt. This mission's own instructions are explicit that
the fuller version is a *later* prompt and, until then, correct should be
sound-only — so that anticipatory piece was pulled back out: `handleAnswer`
now plays `playCorrectChime()` (or `playIncorrectTone()` on a wrong
answer) and nothing else. The `fetchAudio(encouragement)` /
`playAudio(url)` / 1100ms-wait sequence that used to follow a correct
chime is gone.

Distinction preserved: this only touches the *feedback* moment. The
carrier-sentence prompt for the question itself ("Which picture shows a
cat?", "Tap the picture of dog", etc.) is untouched — it still speaks
normally on question mount, before any answer. Only the post-answer
spoken encouragement is removed; the *visual* encouragement text (Nova's
speech bubble, e.g. "Amazing job you did it!") is unchanged, since that's
a separate prop computed independently at each activity's render call
site, not the removed spoken line.

Overlap: unchanged mechanism — `playCorrectChime`/`playIncorrectTone`
(from `soundEffects.js`) are still awaited before `handleAnswer` advances
to the next question, and both go through the same oscillator-Promise /
`gameAudio.js` singleton discipline already in place, so nothing new can
overlap. Removing the spoken-encouragement step actually shortens the
per-question audio window (no more ~1.5–2.5s of TTS fetch+playback+wait
after the chime), which if anything reduces overlap risk further.

## HIGHLIGHT SYNC

Read the exact prior implementation (`src/components/candy/
useKaraokeNarration.js`) rather than assuming what was wrong. It already
synced to real audio-playback position (`audio.currentTime` /
`audio.duration`), which sounds right on paper — the bug was in two
specific details, both confirmed by reading the code, not guessed:

1. **Coarse update granularity.** Timing was driven off the `<audio>`
   element's own `timeupdate` event, which browsers throttle to firing
   roughly every ~250ms — up to a quarter-second of staleness at any
   instant, regardless of how accurate the underlying boundary math is.
2. **Word-boundary model skewed toward longer words.** Boundaries were
   purely proportional to character count. Real speech doesn't scale
   that way — short (often function) words are spoken faster per
   character than long ones — so pure character-proportional timing
   systematically over-allocates playback time to longer words. Across a
   whole sentence this compounds: each long word "holds" the highlight
   past when the voice has actually moved on, and the error accumulates
   toward the end of the sentence — which is exactly the reported
   symptom ("the highlight runs slightly behind the audio").

**Fix**: replaced the `timeupdate` listener with a `requestAnimationFrame`
loop polling `audio.currentTime` every frame (~16ms, vs. ~250ms), and
replaced the pure-character-count weighting with a base-plus-length
model (`WORD_BASE_WEIGHT + word.length` per word) — a fixed floor
representing the minimum time it takes to articulate any word at all,
plus a smaller per-character increment, which tracks real speech timing
much more closely than raw character count and reduces the systematic
skew toward long words. A small fixed lead (`LEAD_MS = 120`) is also
subtracted from the effective playback position before comparing against
boundaries, so any remaining small error biases toward the highlight
advancing slightly *early* rather than late, per the mission's explicit
allowance ("a small, deliberate lead... but it must not lag").

Found and fixed one new risk introduced by this fix itself, before it
shipped: unlike `timeupdate` (which naturally stops firing once its
`<audio>` element is paused), `requestAnimationFrame` keeps polling
forever until explicitly cancelled. A replay (or a new sentence starting
while a previous one's loop was still technically running) would have
left two loops fighting over the same `highlightedIndex` state, and an
unmounted component would keep having `setState` called on it forever.
Fixed with a ref-held "generation" counter, bumped at the start of every
`play()` call and checked on unmount — each loop iteration cheaply
confirms it's still the current one before touching state or
re-scheduling itself.

`prefers-reduced-motion` handling in `StoryReader.jsx` was already
correct and untouched: the highlight *index* always updates regardless
(this is a comprehension aid, not decoration); only the CSS background
transition is skipped under reduced motion. This fix doesn't change that
contract.

## VERIFICATION

All live checks below ran against the deployed preview
(`fix/audio-consolidation`), using fresh accounts via
`scripts/admin-user.mjs` (+ `scripts/db-query.mjs` seeding where a
specific level/unlock state was needed), cleaned up after each check.

- **Voice — verified first, as instructed.** Monkey-patched
  `window.speechSynthesis.speak` at page-init to record any call, and
  captured every `/api/speak` request body. Tapping BottomNav's "Home"
  and "Grown-ups" tabs: zero `speechSynthesis` calls, one `/api/speak`
  request each, with the exact tab label as the text — confirming the
  fix. Tapping a QuestPathNode activity ("Tap & Hear"): also correctly
  routed through `/api/speak`, zero `speechSynthesis`. Gameplay carrier-
  sentence prompts (`This word says "cat". Can you find its picture?`)
  go through the identical `/api/speak` pipeline — same voice, UI and
  gameplay alike, confirmed end to end, not just at the code level.
- **Correct-answer sound-only.** Recorded `/api/speak` requests
  immediately after a correct Tap & Hear answer: the only new requests
  were the next question's own prompt (pre-fetched), with no spoken-
  encouragement text ever requested. The chime itself is a local
  oscillator sound (`soundEffects.js`), not an HTTP call, so silence on
  the network tab for encouragement text is the correct signature of
  "sound only."
- **Highlight sync.** Instrumented a live tier-3 (8-page) story, sampling
  which word had a highlighted background every 100–150ms. A 6-word
  sentence ("The cat is small and orange.") showed transitions at
  405/706/908/1110/1517/1720ms — evenly spaced across the clip's
  duration, no clustering or end-of-sentence pileup (the old bug's
  signature). Replay re-triggered cleanly with zero console errors
  (confirming the new generation-counter guard correctly prevents the
  old and new rAF loops from fighting each other).
- **Account indicator.** Screenshotted the bottom nav: a small
  marigold-colored badge with "E" (the test child's first initial) shows
  correctly on the Grown-ups tab. Tapping it still correctly lands on the
  "Grown-Ups Only" hold-gate — the indicator does not bypass the gate,
  logout stays reachable only through it.
- **Audio-overlap probe.** A rapid burst of nav taps (8 taps at ~300ms
  intervals across Home/Galaxy/Grown-ups) was instrumented by monkey-
  patching the global `Audio` constructor — `gameAudio.js`'s `playAudio()`
  calls `new Audio(url)` directly without ever appending the element to
  the document tree, so `document.querySelectorAll('audio')` can never
  see these clips; an earlier version of this probe used that query and
  always reported zero, which was a test-methodology bug, not a real
  finding, caught and fixed before drawing any conclusion from it. The
  corrected probe recorded 6 distinct `Audio()` instances created across
  the burst, with a **max of 1 playing concurrently at any polled
  instant** — confirming the singleton in `gameAudio.js`'s
  `playAudio`/`currentAudio` correctly stops any prior clip before
  starting a new one, even under a tap rate faster than a real child's.
- **Gates**: `npm run build`, `check:no-emoji`, `check:wordart-sync`,
  Playwright (4/4), `idor-proof` (9/9) — all green on this branch.

## NOTES FOR NEXT PROMPTS

- **Account affordance (Bug 4) was narrower than it first appeared.** A
  working sign-out already existed — `SettingsTab.jsx`'s "Sign out"
  button, behind the Grown-Ups hold+math gate, correctly calling
  `supabase.auth.signOut()` — and `useAuth.js`'s `onAuthStateChange`
  handler already clears `queryClient`, `sessionStorage`, and
  `localStorage` whenever the session goes null (covers both explicit
  sign-out and expiry). The actual gap was purely the missing visible
  indicator. Rather than add a second, redundant tap target leading to
  the exact same Grown-Ups gate, a small badge (the active child's first
  initial) now rides on the *existing* "Grown-ups" bottom-nav tab —
  reuses the current architecture per the mission's own suggested option,
  adds zero new kid-facing chrome.
- `WordSong.jsx`'s chant is a documented, deliberate exception to "one
  voice everywhere" — worth a real decision (replace with a recorded
  song clip, accept the two-voice exception permanently, or find another
  way to get pitch variation from ElevenLabs) whenever that activity's
  own rebuild is in scope, but out of bounds for this bug-fix pass.
- `WordSong.jsx`'s chant does not currently check the shared mute flag
  (`gameAudio.js`'s `isMuted()`) the way every other sound in this app
  does — noticed while auditing every audio source, not something this
  pass fixes (it's a pre-existing gap in an activity explicitly left
  alone here), but worth closing whenever that activity is touched again.
- The carrier-sentence/prompt-audio system (Bug 1 of the prior "audio
  experience" mission) and the exit-save/completion pipeline (prior
  "celebration & completion" mission) are both unchanged by this pass —
  safe to keep relying on them.
