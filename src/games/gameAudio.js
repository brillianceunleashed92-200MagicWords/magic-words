// Shared TTS audio plumbing for every game/activity component, extracted
// out of GameEngine.jsx so that file can go back to only exporting React
// components (mixing component + non-component exports from one file
// breaks Fast Refresh — react-refresh/only-export-components). Behavior
// is unchanged, just relocated.

import { supabase } from '../supabaseClient';

// Audio cache — text → blob URL, survives React re-renders.
export const audioCache    = new Map(); // text → blob URL string
export const audioFetching = new Map(); // text → Promise (in-flight dedup)

// Module-level current audio — ensures only one clip plays at a time and
// audio stops cleanly when a game unmounts.
let currentAudio = null;

// Mute (mission B2 — "simple mute toggle for classroom/library use").
// Persisted directly in localStorage rather than through a React
// store/mutation, since it's a pure client-side UI preference with
// nothing to sync server-side — a teacher/librarian mutes once and it
// should stay muted across reloads. `playAudio` itself checks this (not
// `fetchAudio` — still safe to warm the cache while muted, so un-muting
// mid-session doesn't re-pay the fetch), and playCorrectChime/
// playIncorrectTone in soundEffects.js check it too, so every sound this
// app makes (TTS and synthesized effects alike) respects one switch.
const MUTE_KEY = 'mw_muted';
let muted = (() => {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'; }
  catch { return false; }
})();
const muteListeners = new Set();

export function isMuted() { return muted; }

export function setMuted(value) {
  muted = !!value;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  if (muted) stopCurrentAudio();
  muteListeners.forEach((fn) => fn(muted));
}

export function subscribeMuted(fn) {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

export function playAudio(url) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (!url || muted) return null;
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play().catch(() => {});
  audio.onended = () => { if (currentAudio === audio) currentAudio = null; };
  return audio;
}

export function fetchAudio(text) {
  if (!text) return Promise.resolve(null);
  if (audioCache.has(text)) return Promise.resolve(audioCache.get(text));
  if (audioFetching.has(text)) return audioFetching.get(text);

  const promise = supabase.auth.getSession()
    .then(({ data }) => fetch('/api/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      },
      body: JSON.stringify({ text }),
    }))
    .then(res => (res.ok ? res.blob() : null))
    .then(blob => {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      audioCache.set(text, url);
      return url;
    })
    .catch(() => null)
    .finally(() => audioFetching.delete(text));

  audioFetching.set(text, promise);
  return promise;
}

// Stops whatever's currently playing without starting anything new — used
// by GameEngine's unmount cleanup (a direct `currentAudio = null` from an
// importing module wouldn't work: ES module bindings are read-only from
// the consumer's side).
export function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
