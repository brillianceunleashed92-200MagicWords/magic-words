import { useEffect, useState } from 'react';

const KEY_PREFIX = 'mw_play_minutes_';

function todayKey(childId) {
  const today = new Intl.DateTimeFormat('en-CA').format(new Date()); // YYYY-MM-DD, local
  return `${KEY_PREFIX}${childId}_${today}`;
}

function readMinutesToday(childId) {
  try {
    return Number(localStorage.getItem(todayKey(childId)) ?? 0);
  } catch {
    return 0;
  }
}

function writeMinutesToday(childId, minutes) {
  try {
    localStorage.setItem(todayKey(childId), String(minutes));
  } catch {
    // non-fatal — limit just won't persist across a reload this one time
  }
}

// Enforces parent_settings.daily_minutes_limit (blueprint 4.3 "Time
// controls" — parents trust apps that offer limits). Ticks up minutesToday
// once per minute while the Play screen is mounted; a real client-side
// device clock is trivially bypassable by a determined kid, but that's
// true of any client-only limit and matches this app's trust-based intent
// (a gentle nudge, not a security boundary) — no server enforcement is
// implied by the master prompt's "soft Nova lockout" framing either.
export function useSessionTimeLimit(childId, dailyMinutesLimit) {
  const [minutesToday, setMinutesToday] = useState(() => (childId ? readMinutesToday(childId) : 0));

  useEffect(() => {
    if (!childId) return;
    setMinutesToday(readMinutesToday(childId));
    const interval = setInterval(() => {
      setMinutesToday((prev) => {
        const next = prev + 1;
        writeMinutesToday(childId, next);
        return next;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [childId]);

  const limitReached = !!dailyMinutesLimit && minutesToday >= dailyMinutesLimit;
  return { minutesToday, limitReached };
}
