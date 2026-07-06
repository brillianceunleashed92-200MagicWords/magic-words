# Device Test Checklist — Prompt 7 Polish Pass

Step-by-step script for Sal's phone session, covering everything the
Prompt 7 desktop pass could not verify itself (real mic hardware, real
iOS/Android Safari/Chrome quirks, real repeated taps from a real kid).
Each step: do X, observe Y, record Z. Write results directly into this
file (or a dated copy) so they're captured alongside the run that
prompted them.

## 1. Say It with Nova — mic on a real device

**Do**: sign in on a real iPhone (Safari) and a real Android phone
(Chrome) with a fresh test account seeded to unlock Say It with Nova.
Play through at least 2 words: say the word correctly once, then
deliberately stay silent for 5+ seconds on a separate attempt.

**Observe**:
- Does the mic button auto-start listening after Nova's prompt finishes
  playing (auto-listen), or does it require a manual tap every time?
  (This pass's code checks `navigator.permissions.query({name:
  'microphone'})` before auto-starting — expected to be unreliable or
  silently no-op on iOS specifically, since starting recognition from an
  `audio.onended` callback may not count as a user gesture there. This
  is the single most important thing to observe.)
- Does the 5-second no-speech timeout fire ("Didn't quite catch that —
  try again!") when you stay silent, or does it hang indefinitely?
- Does a correct utterance register as "Nova heard you!" reliably?
- Open the browser's remote inspector (Safari: Mac Safari → Develop →
  [device] → tab; Chrome: `chrome://inspect` from a desktop Chrome) and
  watch the console for `[SayItDiag]` lines.

**Record**: browser + OS version, whether auto-listen fired, whether the
timeout fired, the exact sequence of `[SayItDiag]` events for one
attempt (copy/paste the console lines), and mic permission state at the
time (`permission-state` event).

## 2. Celebration-misfire repro attempts

**Do**: three separate repro attempts, each with rapid/adversarial
input a real kid might produce by accident:
- **Match & Sort (RhymeTime)**: tap every answer as fast as possible,
  including tapping again right as a celebration/advance is playing.
- **Word Hunt**: tap answers in a random/mashing pattern, including
  double-taps on the same tile.
- **Say It with Nova, specifically on the session's LAST word (word 6)**:
  say the word, then IMMEDIATELY tap the mic button again before the
  "Nova heard you!" celebration finishes, trying to start a second
  recognition attempt while the first is still resolving.

**Observe**: does a celebration/session-complete screen ever fire twice,
fire out of sequence, or fire for the wrong word? For Say It
specifically: does a `[SayItDiag] stale-result-ignored` or
`stale-error-ignored` line ever appear in the console during this?
(If so, this pass's sequence-guard fix is the thing preventing a
misfire — worth confirming it's actually engaging on a real device, not
just in the desktop stub test.)

**Record**: browser, muted or not, the precise tap sequence and timing,
whether a misfire occurred, and — if Say It specifically — whether any
`stale-*-ignored` diagnostic line appeared. Screen recording encouraged;
attach or link it here if captured.

## 3. Galaxy-map lock manual check

This pass reproduced and fixed the reported "dance shows locked despite
being played" bug (see `POLISH_PASS_REPORT.md`'s GALAXY LOCK section —
root cause was a missing `inProgress` status between `locked` and
`current` in `GalaxyScreen.jsx`'s `pathWords` derivation). This step is
for confirming it live on Sal's own real account/child, and as a
reusable diagnostic if a similar report ever recurs for a different word.

**Do**: open the Galaxy map for the real child's account, find "dance"
(or whichever word was originally reported). If it looks wrong again in
the future, pull the real `word_progress` row for that word/child:
write the query to a file and run `node scripts/db-query.mjs
<file>.sql` — `select word, mastery, attempt_count from word_progress
where child_id = '<id>' and word = '<word>';`

**Observe**: does the tile show a percentage + play icon (in-progress,
tappable) when `0 < mastery < 80`, "current" styling when it's the
active pathWord, and only a true lock icon when genuinely never
attempted or premium-gated?

**Record**: the tile's visual state, the underlying `mastery`/
`attempt_count` values if you had to query them, and whether they agree
with the fix's logic (`inProgress = !done && !isCurrent && mastery > 0`).

## 4. Dad-test Quiz Boss and Find the Word

**Do**: hand the phone to a real kid (or another adult unfamiliar with
the build) and just watch, no coaching.

**Observe**:
- **Quiz Boss**: does it read as a "battle" to a kid, or just as another
  quiz screen with an unexplained energy meter? Is it clear the boss is
  never actually beatable-by-failure (errorless — should always end in
  a win)?
- **Squint test**: at actual tile size (not zoomed in on a desktop
  monitor), can you tell "bear" and "dog" apart in the WordArt/picture
  tiles at a glance? Any other word pairs that read ambiguously small?

**Record**: plain-language reaction from whoever played it, and any
specific word-art pairs that were hard to distinguish at real size.

## 5. Skim the 200 look-alike triples

**Do**: open `src/games/findTheWordManifest.js` and read through the
`FIND_THE_WORD_LOOKALIKES` entries (all 200 curriculum words, each with
up to 3 hand-curated distractor words).

**Observe**: flag any entry where a distractor reads as semantically or
visually confusing rather than a clean look-alike (the whole point of
this activity per Dr. Blank's method is real-word visual/orthographic
discrimination — a distractor that's actually hard to tell apart for
the WRONG reason, or one that reads oddly out of context, undermines it).

**Record**: a list of flagged words + why, for a follow-up manifest
edit. This is a content-quality read, not a code change — no fix
expected during this pass, just the flagged list.

## 6. Chrome saved-password cleanup

**Do**: on the shared Chrome automation profile used for this project's
browser-automation testing, open `chrome://settings/passwords` and
remove the saved entry for `test@yahoo.com` (the account itself was
deleted from Supabase this pass, with explicit approval — see
`POLISH_PASS_REPORT.md`'s TEST ACCOUNT section — but the saved
browser credential is separate and can't be reached by the automation
session itself).

**Observe**: confirm the entry is gone and that Chrome no longer offers
to autofill it on the Magic Words login screen.

**Record**: done/not done. This closes the exact autofill-hijack class
documented in `DRAW_IT_TRACING_REPORT.md`'s known-traps list for this
one account; if a similar hijack happens again with a different test
account in the future, the same manual removal step applies.
