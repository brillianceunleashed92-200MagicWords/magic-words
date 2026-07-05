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
IN PROGRESS

## SESSION POLISH
IN PROGRESS

## HINTS
IN PROGRESS

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
