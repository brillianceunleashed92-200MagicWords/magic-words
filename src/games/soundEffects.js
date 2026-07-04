// Synthesized correct/incorrect feedback tones (mission B2). No sound
// asset exists anywhere in this app yet — CLAUDE.md notes "no sound
// effects beyond TTS pronunciation" was true until this file. Rather than
// sourcing/hosting audio files (latency, caching, licensing), these are
// generated on the fly with the Web Audio API: a short oscillator + gain
// envelope, gone in under half a second. Both respect the shared mute
// flag (gameAudio.js's isMuted) so one switch silences TTS and these
// effects alike.
//
// Both return a Promise that resolves once the tone has finished, so
// callers can await it before playing the next sound in a sequence
// (GameEngine's handleAnswer: chime -> spoken encouragement -> next
// question's own audio) — matching the "one at a time, never
// simultaneous" choreography requirement without needing these tones to
// go through the HTML5-Audio-based singleton in gameAudio.js.
import { isMuted } from './gameAudio';

let ctx;
function getCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(ac, freq, startTime, duration, peakGain) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function canPlay() {
  return !isMuted() && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
}

// Bright ascending three-note chime (C5-E5-G5 major arpeggio). Brief and
// restrained on purpose — this app deliberately keeps per-answer
// feedback low-key and saves bigger celebration for real milestones (see
// CLAUDE.md's gamification-inventory / level-up notes); a loud fanfare on
// every correct tap would undercut that.
export function playCorrectChime() {
  if (!canPlay()) return Promise.resolve();
  const ac = getCtx();
  const now = ac.currentTime;
  tone(ac, 523.25, now, 0.14, 0.16);
  tone(ac, 659.25, now + 0.1, 0.14, 0.16);
  tone(ac, 783.99, now + 0.2, 0.22, 0.16);
  return new Promise((resolve) => setTimeout(resolve, 480));
}

// A single soft, low, quiet tone — deliberately not a buzzer or descending
// "wrong answer" sting. Errorless-learning philosophy applies to sound
// too: a miss gets a gentle, non-punitive cue, never a punishing one.
export function playIncorrectTone() {
  if (!canPlay()) return Promise.resolve();
  const ac = getCtx();
  const now = ac.currentTime;
  tone(ac, 311.13, now, 0.28, 0.09);
  return new Promise((resolve) => setTimeout(resolve, 320));
}
