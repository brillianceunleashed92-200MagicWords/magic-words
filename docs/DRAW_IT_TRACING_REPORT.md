# Draw It → Letter Tracing — Rebuild Report

Tracking doc for `docs/200MW_Prompt5_Draw_It_Tracing.md`. Branch `fix/draw-it-tracing`.
Filled live as work proceeds — sections start IN PROGRESS.

## PRE-FLIGHT — sync state, key presence (existence only)
- `git status` clean at start (only the untracked prompt doc itself).
- `git log origin/main..main --oneline` empty — main was fully pushed before this run started.
- `9c39f25` (Fill the Story merge) confirmed an ancestor of HEAD via `git merge-base --is-ancestor`.
- `SUPABASE_SERVICE_ROLE_KEY`: absent from both the shell environment and `.env.local` at
  first check. Per the gate, stopped and asked Sal rather than guessing/proceeding without it.
  Sal supplied the key; it was appended to `.env.local` (gitignored — confirmed via `.gitignore`
  lines 14-16/37 before writing) and never echoed/printed/logged anywhere in this report or
  any command output — only an existence + length check was run against it.
- Branch `fix/draw-it-tracing` created off `main`.

## BASELINE — current canvas/scoring/reference/T-token state, screenshots
IN PROGRESS

## STROKE-DATA ASSESSMENT — letter inventory, options costed, recommendation + decision, stroke-order convention + source
IN PROGRESS

## TRACING INTERACTION — detection/tolerance implementation, errorless re-cue, demo/idle behavior, audio moment sequencing
IN PROGRESS

## TOKEN MIGRATION — before/after, gameTheme.js reader status
IN PROGRESS

## HOUSEKEEPING — Playwright determinism fix chosen + why, v3 update
IN PROGRESS

## VERIFICATION — coverage-check proof, live checks, overlap-probe result, new spec, gates
IN PROGRESS

## PRODUCTION VERIFICATION — push/deploy confirmation, live walk results
IN PROGRESS

## NOTES FOR NEXT PROMPTS — anything Quiz Boss / Find the Word should rely on (esp. reusable stroke/trace primitives, celebration sequencing)
IN PROGRESS
