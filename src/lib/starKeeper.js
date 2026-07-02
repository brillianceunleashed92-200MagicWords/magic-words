// Star Keeper v1 — fixed-interval spaced repetition (200MW_Product_Blueprint.md
// 2.4). Not full SM-2: a fixed ladder of review gaps, advanced on a correct
// review and reset to the first rung on a miss. Good enough to make stars
// "dim" on a schedule and give Nova something to ask the child to wake up;
// adaptive per-word ease factors are a later iteration, not Phase 1.
export const REVIEW_LADDER_DAYS = [1, 3, 7, 14, 30];

export function nextReviewInterval(currentIntervalDays, correct) {
  if (!correct) return REVIEW_LADDER_DAYS[0];
  const idx = REVIEW_LADDER_DAYS.indexOf(currentIntervalDays);
  const nextIdx = idx === -1 ? 1 : Math.min(idx + 1, REVIEW_LADDER_DAYS.length - 1);
  return REVIEW_LADDER_DAYS[nextIdx];
}

export function computeNextReviewAt(currentIntervalDays, correct, now = new Date()) {
  const intervalDays = nextReviewInterval(currentIntervalDays, correct);
  const nextReviewAt = new Date(now.getTime() + intervalDays * 86400000);
  return { intervalDays, nextReviewAt };
}

// A star is "sleepy" (due for review) once its next_review_at has passed.
export function isStarSleepy(nextReviewAt, now = new Date()) {
  if (!nextReviewAt) return false;
  return new Date(nextReviewAt).getTime() <= now.getTime();
}
