# Device Test Results — 2026-07-06

Mirrors `docs/DEVICE_TEST_CHECKLIST.md`. Items 5, 3, and 7-automation were
run by an automated desktop pass ahead of Sal's phone session (see
`docs/DEVICE_PREP_REPORT.md` for the full method/evidence); items 1, 2, 4,
6, and 7-mobile are blanks for Sal to fill in live, since they need real
mic hardware, real iOS/Android quirks, or a real kid.

> Note on `SAL_DEVICE_SESSION_GUIDE.md`: the prep prompt asked for a pointer
> into this file for each manual item below, but no file by that name exists
> anywhere in this repo (checked working tree and full branch history). The
> pointers below go to the matching numbered section of
> `docs/DEVICE_TEST_CHECKLIST.md` instead, which does exist and already has
> the exact Do/Observe/Record steps — flagging the naming mismatch rather
> than guessing at a guide that isn't there.

---

## Item 5 — Look-alike manifest audit — **AUTOMATED — 2026-07-06 — ratify/confirm**

All 200 entries / ~600 distractors read and judged. Full flag table,
summary stats, and the incidental duplicate-key finding are in
`docs/DEVICE_PREP_REPORT.md` (Phase 1). Headline: 169 clean, 31 flagged
(mostly `ODD` — vocabulary too advanced for a 4-8-year-old — plus one clear
rule violation: `eight`'s own distractors `eighth`/`eighty` are
derivational forms of `eight` itself). No edits made to the manifest — Sal
ratifies, a follow-up content pass makes any changes.

**Sal: confirm or push back on the flagged list in the report before it
feeds a manifest edit.**

---

## Item 3 — Galaxy-map lock check — **AUTOMATED — 2026-07-06 — ratify/confirm**

Reproduced all three non-`current`/non-`premium` statuses on a disposable
account + child, seeded via direct SQL (not gameplay, for precision):
`current` (mastery 0, untouched), `locked` (mastery 0, untouched, not the
adaptive pick), `inProgress` (mastery 40/2 attempts), `done` (mastery
85/5 attempts). All four verified against `GalaxyScreen.jsx`'s exact
derivation logic via `getComputedStyle` (background/border), not just a
screenshot. Full table and DOM evidence in `docs/DEVICE_PREP_REPORT.md`
(Phase 2). Result: **PASS on all three real-progress states** — the
`inProgress` fix (this pass's whole reason for existing) is confirmed live.

One incidental note for Sal to confirm is intentional: a `done` tile always
displays "100%" regardless of the word's actual stored mastery (e.g. 85%
displays as "100%") — by design (mastered is a threshold crossing, not a
running score), but worth a nod that the Galaxy map can never show a
mastered word's real score past 80.

**Sal: this reduces your manual step 3 to an optional glance at your own
account — the fix logic itself is already proven against all four
statuses.**

---

## Item 7 (automation half) — Say-It browser/network check — **AUTOMATED — 2026-07-06 — ratify/confirm**

Reached the real Say It with Nova screen (guided-path detail — including
how the lower 8 ranks were unlocked for the automation account without a
long grind — is in `docs/DEVICE_PREP_REPORT.md`, Phase 3). With
`read_network_requests` cleared immediately before tapping the mic:
**zero requests of any kind** were recorded across the full attempt
lifecycle. This matches this checklist item's own prediction — the
browser's native `SpeechRecognition` API never shows up as page-visible
`fetch`/`XHR` traffic, so an empty automation log is expected, not proof of
absence. **The exact vendor endpoint (if any) per real browser is still
only observable from a real device's Network tab — that part of item 7
remains Sal's step below.**

Bonus, feeds directly into item 1: the automation-environment
`[SayItDiag]` console sequence was captured verbatim (no real mic hardware
available in this environment):

```
[SayItDiag] event=permission-state ts=1783376237902
[SayItDiag] event=start             ts=1783376266972
[SayItDiag] event=no-speech-timeout ts=1783376272938   (~6s after start)
[SayItDiag] event=error             ts=1783376272941
[SayItDiag] event=end               ts=1783376272941
```

**Sal: compare your real-device console capture (item 1 below) against this
shape.** Same `start → no-speech-timeout → error → end` sequence with no
real recognition ever engaging → likely a device/permission issue, not an
app bug. A materially different sequence (no `no-speech-timeout`, or a real
`result` event) → the real mic path is actually firing, which is the more
important thing to see.

---

## Item 1 — Say It with Nova — mic on a real device

*(See `docs/DEVICE_TEST_CHECKLIST.md` item 1 for the full Do/Observe steps.)*

- Device / browser + OS version: ___________________________
- Auto-listen fired after Nova's prompt (Y/N): ___
- 5-second no-speech timeout fired when silent (Y/N): ___
- Correct utterance registered "Nova heard you!" (Y/N): ___
- Mic permission state at time of attempt: ___________________________
- `[SayItDiag]` console lines for one attempt (paste verbatim):
  ```

  ```
- Compare against the automation-baseline sequence above — same shape or different? ___________________________

---

## Item 2 — Celebration-misfire repro attempts

*(See `docs/DEVICE_TEST_CHECKLIST.md` item 2 for the full Do/Observe steps.)*

- Match & Sort (rapid/adversarial taps) — misfire observed (Y/N): ___ — details: ___________________________
- Word Hunt (mashing/double-taps) — misfire observed (Y/N): ___ — details: ___________________________
- Say It, last word, tap-mic-again-immediately — misfire observed (Y/N): ___
- `stale-result-ignored` / `stale-error-ignored` console line appeared (Y/N): ___
- Screen recording link (if captured): ___________________________

---

## Item 4 — Dad-test Quiz Boss and Find the Word

*(See `docs/DEVICE_TEST_CHECKLIST.md` item 4 for the full Do/Observe steps.)*

- Quiz Boss read as a "battle" to the kid (Y/N), reaction: ___________________________
- Clear that the boss is unbeatable-by-failure (errorless) (Y/N): ___
- Squint test — bear/dog (or other WordArt pairs) distinguishable at real tile size (Y/N): ___
- Any other word-art pairs that read ambiguously small: ___________________________

---

## Item 6 — Chrome saved-password cleanup

*(See `docs/DEVICE_TEST_CHECKLIST.md` item 6 for the full Do/Observe steps.)*

- `test@yahoo.com` saved entry removed from `chrome://settings/passwords` (Y/N): ___
- Confirmed no more autofill offer on the login screen (Y/N): ___

**Note from this automation pass**: the shared automation Chrome profile
currently has a *different* saved credential autofilling on `/app`'s sign-in
form — `drmarionsformula+devicetest@gmail.com` — separate from the
`test@yahoo.com` account this checklist item names. Worth a look during this
same cleanup pass since it's the same class of leftover-credential issue.

---

## Item 7 (mobile half) — Say-It browser/network check on a real device

*(See `docs/DEVICE_TEST_CHECKLIST.md` item 7 for the full Do/Observe steps.)*

- Browser: ___ — speech-recognition-related host(s) seen in Network tab: ___________________________
- Screenshot link(s): ___________________________
