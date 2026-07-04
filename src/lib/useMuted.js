import { useEffect, useState } from 'react';
import { isMuted, setMuted, subscribeMuted } from '../games/gameAudio';

// Thin React wrapper around gameAudio.js's module-level mute flag (the
// actual source of truth, since playAudio/soundEffects.js need to read it
// outside of React too) — subscribes so any component using this hook
// re-renders if mute is toggled from elsewhere (e.g. two mute buttons
// visible at once, which happens here: GameEngine's E2-activity header
// and SessionProgress each render their own).
export function useMuted() {
  const [muted, setMutedState] = useState(isMuted);
  useEffect(() => subscribeMuted(setMutedState), []);
  return [muted, setMuted];
}
