// src/games/GameEngine.jsx
// The complete game engine for 200 Magic Words.
// Supports 6 game types with smooth transitions, instant feedback, and celebration moments.
// All games read from sessionPlan (pre-generated) — zero AI calls during play.
//
// Game types:
//   1. WordMatch    — see word, tap emoji  (MVP, improved)
//   2. SoundMatch   — hear word, tap image (requires audio)
//   3. StoryBuilder — drag word into sentence blank
//   4. SpellItOut   — tap letter tiles in sequence
//   5. WordHunt     — find word in a scene (Phase 4)
//   6. DailyChallenge — rotating boss round (Phase 4)
//
// Props:
//   sessionPlan    — from useSessionPlan hook
//   onProgress     — callback({ word, correct, responseTimeMs, gameType })
//   onSessionEnd   — callback({ wordsCorrect, totalWords, timeSpentMs })
//   childName      — for personalized encouragement

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import WordBuilder from './WordBuilder';
import DrawIt from './DrawIt';
import WordSong from './WordSong';
import MagicVideo from './MagicVideo';
import StoryTimeActivity from './StoryTimeActivity';
import SayItWithNova from './SayItWithNova';
import { audioCache, playAudio, fetchAudio, stopCurrentAudio } from './gameAudio';
import { getPromptText } from './promptText';
import { T } from './gameTheme';
import { colors, fonts, shadows, skyGradient } from '../theme/tokens';
import WordArt, { WORD_ART_REGISTRY } from '../components/WordArt';
import { IconClose, IconSpeaker, IconStar } from '../components/icons';
import { StarProgress, NovaPorthole, AnswerTile, ConfettiStars, LESSON_CHROME_KEYFRAMES } from './lessonChrome';
import { AvatarRocket } from '../components/icons/AvatarGlyphs';

// ─── Question formatter — correct grammar for every word class ────────────────
// Client-side fallback for any plan that predates wordClass being added to quizzes
const _WORD_CLASS_MAP = {
  run: 'verb', jump: 'verb', fly: 'verb', eat: 'verb', swim: 'verb',
  dance: 'verb', hop: 'verb', skip: 'verb', sit: 'verb', wave: 'verb',
  clap: 'verb', spin: 'verb', dig: 'verb', do: 'function',
  big: 'adjective', sad: 'adjective', happy: 'adjective', small: 'adjective',
  fast: 'adjective', slow: 'adjective', hot: 'adjective', cold: 'adjective',
  the: 'function', a: 'function', an: 'function', is: 'function',
  are: 'function', can: 'function', not: 'function', and: 'function',
  or: 'function', but: 'function', with: 'function', they: 'function',
  does: 'function', it: 'function', one: 'function', that: 'function',
};

const _CONS = new Set('bcdfghjklmnpqrstvwxyz');
function _gerund(verb) {
  const c = verb.at(-1), v = verb.at(-2), c2 = verb.at(-3);
  if (verb.length >= 3 && _CONS.has(c2) && 'aeiou'.includes(v) && _CONS.has(c) && c !== 'w' && c !== 'x') {
    return verb + c + 'ing'; // run→running, hop→hopping
  }
  if (verb.endsWith('e') && !verb.endsWith('ee') && verb.length > 2) {
    return verb.slice(0, -1) + 'ing'; // dance→dancing
  }
  return verb + 'ing';
}

function formatQuestion(word, wordClass) {
  const wc = wordClass ?? _WORD_CLASS_MAP[word] ?? 'noun';
  switch (wc) {
    case 'function':  return `Which card matches the word "${word}"?`;
    case 'verb':      return `Which picture shows someone ${_gerund(word)}?`;
    case 'adjective': return `Which picture shows something ${word.toUpperCase()}?`;
    default: {
      const art = 'aeiou'.includes(word[0]) ? 'an' : 'a';
      return `Which picture shows ${art} ${word}?`;
    }
  }
}

// Dev-only safety net for picture-matching activities (Word Match, Sound
// Match, Word Hunt) — a word reaching a picture tile without a real
// WordArt illustration should never happen (distractor selection is
// has_art-filtered server- and client-side), but if it ever does, this
// surfaces it loudly instead of silently degrading to WordArt's
// typographic fallback, which would look like a picture tile that isn't
// actually a picture. No-ops in production builds.
function warnMissingArt(context, word) {
  if (!import.meta.env.DEV || !word) return;
  if (!WORD_ART_REGISTRY[word.toLowerCase()]) {
    console.warn(`[${context}] "${word}" has no WordArt illustration but reached a picture-matching tile.`);
  }
}

// getPromptText moved to ./promptText.js (so activity components in other
// files can import it without a circular import back into this file).

// ─── Rhyme map for RhymeTime game ────────────────────────────────────────────
export const RHYME_MAP = {
  cat:'bat', dog:'log', run:'sun', big:'pig', sad:'bad', fly:'sky', eat:'beat',
  can:'pan', jump:'bump', hot:'pot', cold:'gold', fast:'last', slow:'glow',
  ball:'fall', book:'cook', cup:'pup', bed:'red', boy:'toy', girl:'curl',
  red:'bed', blue:'true', green:'seen', sun:'fun', moon:'soon', star:'car',
  rain:'train', tree:'free', hand:'sand', eye:'sky', ear:'near', head:'led',
  sit:'bit', hop:'top', swim:'dim', sing:'ring', play:'day', stop:'pop',
  help:'yelp', sleep:'deep', good:'wood', old:'gold', fish:'dish', bird:'heard',
  frog:'log', bear:'care', duck:'luck', cow:'now', pig:'dig', bee:'see',
  fox:'box', hen:'ten', bat:'cat', rat:'mat', hat:'sat', map:'tap',
  zip:'tip', mud:'bud', wig:'fig', pin:'win', fun:'sun',
};

const RHYME_DECOYS = [
  'orange','purple','banana','chicken','umbrella','elephant',
  'window','butter','bottle','garden','pencil','monkey',
];

// ─── Design tokens (matches your existing theme) ──────────────────────────────

// ─── Shared CSS injected once ─────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes mw-pop {
    0%   { transform: scale(0.7); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes mw-shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-6px); }
    80%       { transform: translateX(6px); }
  }
  @keyframes mw-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    40%      { transform: translateY(-16px) scale(1.1); }
    60%      { transform: translateY(-8px); }
  }
  @keyframes mw-celebrate {
    0%   { transform: scale(1)   rotate(0deg); }
    25%  { transform: scale(1.3) rotate(-5deg); }
    50%  { transform: scale(1.2) rotate(5deg); }
    75%  { transform: scale(1.3) rotate(-3deg); }
    100% { transform: scale(1)   rotate(0deg); }
  }
  @keyframes mw-confetti {
    0%   { transform: translateY(0)   rotate(0deg);   opacity: 1; }
    100% { transform: translateY(80px) rotate(720deg); opacity: 0; }
  }
  @keyframes mw-slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes mw-pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0); }
    50%       { box-shadow: 0 0 0 12px rgba(45,212,191,0.2); }
  }
  @keyframes mw-letter-appear {
    from { transform: scale(0) rotate(-15deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes mw-word-glow {
    0%, 100% { text-shadow: 0 0 20px rgba(45,212,191,0.3); }
    50%       { text-shadow: 0 0 40px rgba(45,212,191,0.8), 0 0 60px rgba(45,212,191,0.4); }
  }

  .mw-option-btn {
    background: rgba(42,33,80,0.05);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 2px solid rgba(42,33,80,0.16);
    border-radius: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 110px;
    font-family: 'Atkinson Hyperlegible', sans-serif;
    color: ${T.white};
    -webkit-tap-highlight-color: transparent;
  }
  .mw-option-btn:hover:not(:disabled) {
    transform: scale(1.04);
    border-color: rgba(42,33,80,0.32);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .mw-option-btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .mw-option-btn.correct {
    background: rgba(45,212,191,0.15);
    border-color: ${T.correct};
    box-shadow: 0 0 30px rgba(45,212,191,0.5), 0 8px 32px rgba(0,0,0,0.3);
    animation: mw-bounce 0.5s ease;
  }
  .mw-option-btn.wrong {
    background: rgba(255,122,89,0.15);
    border-color: ${T.wrong};
    box-shadow: 0 0 20px rgba(255,122,89,0.4), 0 8px 32px rgba(0,0,0,0.3);
    animation: mw-shake 0.4s ease;
  }
  .mw-option-btn.revealed {
    background: rgba(45,212,191,0.1);
    border-color: rgba(45,212,191,0.4);
  }

  .mw-letter-tile {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: ${T.card};
    border: 2px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.6rem;
    color: ${T.white};
    cursor: pointer;
    transition: transform 0.1s, background 0.1s, border-color 0.1s;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  .mw-letter-tile:hover:not(.used):not(.disabled) {
    background: ${T.cardHov};
    border-color: ${T.teal};
    transform: translateY(-3px);
  }
  .mw-letter-tile.used {
    opacity: 0.25;
    cursor: default;
    transform: none !important;
  }
  .mw-letter-tile.correct-tile {
    background: rgba(45,212,191,0.25);
    border-color: ${T.teal};
    animation: mw-letter-appear 0.2s ease;
  }
  .mw-letter-tile.wrong-tile {
    background: rgba(255,122,89,0.25);
    border-color: ${T.coral};
    animation: mw-shake 0.3s ease;
  }

  .mw-drag-word {
    background: ${T.card};
    border: 2px solid ${T.border};
    border-radius: 50px;
    padding: 0.5rem 1.25rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.1rem;
    color: ${T.white};
    cursor: grab;
    user-select: none;
    transition: transform 0.15s, background 0.15s;
    touch-action: none;
  }
  .mw-drag-word:hover { background: ${T.cardHov}; transform: scale(1.05); }
  .mw-drag-word.dragging { opacity: 0.5; cursor: grabbing; }
  .mw-drag-word.used { opacity: 0.2; cursor: default; pointer-events: none; }

  .mw-drop-zone {
    display: inline-block;
    border-bottom: 3px solid ${T.teal};
    min-width: 80px;
    padding: 0 0.5rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.3rem;
    color: ${T.teal};
    vertical-align: bottom;
    transition: background 0.15s;
  }
  .mw-drop-zone.over { background: rgba(45,212,191,0.15); border-radius: 8px 8px 0 0; }
  .mw-drop-zone.filled { color: ${T.gold}; border-color: ${T.gold}; }
`;

function injectCSS() {
  if (document.getElementById('mw-game-styles')) return;
  const el = document.createElement('style');
  el.id = 'mw-game-styles';
  el.textContent = GLOBAL_CSS + LESSON_CHROME_KEYFRAMES;
  document.head.appendChild(el);
}

// ─── Confetti burst (pure CSS, no library) ────────────────────────────────────
function ConfettiBurst({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    color: [T.gold, T.teal, T.pink, T.coral, T.purple][i % 5],
    delay: (i * 0.06).toFixed(2),
    x: (Math.sin(i * 0.7) * 120).toFixed(0),
    size: 6 + (i % 4) * 2,
  }));

  return createPortal(
    <div style={{ position: 'fixed', top: '40%', left: '50%', pointerEvents: 'none', zIndex: 999 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: p.size + 'px',
          height: p.size + 'px',
          background: p.color,
          borderRadius: i % 3 === 0 ? '50%' : '2px',
          transform: `translateX(${p.x}px)`,
          animation: `mw-confetti 0.9s ease-out ${p.delay}s forwards`,
        }} />
      ))}
    </div>,
    document.body
  );
}

// ─── Progress bar — chunky segmented bar ─────────────────────────────────────
function SessionProgress({ current, total, correctCount }) {
  return (
    <div style={{ padding: '1rem 1.5rem 0', animation: 'mw-slide-up 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <span style={{ fontFamily: 'Space Grotesk', color: T.teal, fontSize: '0.9rem' }}>
          Word {current} of {total}
        </span>
        <span style={{ fontFamily: 'Space Grotesk', color: T.gold, fontSize: '1.125rem' }}>
          ⭐ {correctCount} correct
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {Array.from({ length: total }, (_, i) => {
          const done   = i < current - 1;
          const active = i === current - 1;
          return (
            <div key={i} style={{
              flex: 1,
              height: '10px',
              borderRadius: '6px',
              background: (done || active) ? T.teal : 'rgba(42,33,80,0.14)',
              boxShadow: done   ? `0 0 8px ${T.teal}99`
                       : active ? `0 0 14px ${T.teal}`
                       : 'none',
              animation: active ? 'mw-pulse-glow 1.2s ease-in-out infinite' : 'none',
              transition: 'background 0.4s, box-shadow 0.4s',
            }} />
          );
        })}
      </div>
    </div>
  );
}

// FeedbackOverlay and WordTile (old full-screen-color-wash feedback and
// emoji/legacy-icon word rendering) removed — the 5 E2-rebuilt activities
// use lessonChrome.jsx (tile-level feedback, no full-screen overlay ever,
// per docs/DESIGN_BRIEF.md §7 "no red error states") and WordArt.jsx
// instead. SoundMatch/SpellItOut (not in the 5 named Candy Galaxy
// activities) don't reference either.

// ─── ACTIVITY: Tap & Hear (WordMatch) ─────────────────────────────────────
// See word → tap the matching picture. Flagship activity, matches
// docs/mockup-E2-no-emoji.html exactly: 2x2 WordArt tiles, Nova porthole +
// speech bubble, errorless scaffold (wiggle+soften+hint-glow, no red/X).
function WordMatch({ quiz, onAnswer, encouragement, showHint = false }) {
  const [answered,    setAnswered]    = useState(false);
  const [audioUrl,    setAudioUrl]    = useState(null);
  const [novaState,   setNovaState]   = useState('idle');
  const [message,     setMessage]     = useState('');
  const [confetti,    setConfetti]    = useState(false);
  // Errorless-learning scaffold: a first wrong tap doesn't let the error
  // complete — it wiggles+softens the wrong tile, then hint-glows the
  // correct one and lets the child retry immediately. Only a second miss
  // on the same question lets the error complete (reveal + advance).
  const [wrongTileIdx,  setWrongTileIdx]  = useState(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [missedOnce,    setMissedOnce]    = useState(false);
  const correctTileRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setAnswered(false);
    setWrongTileIdx(null);
    setRevealCorrect(false);
    setMissedOnce(false);
    setMessage(formatQuestion(quiz?.word, quiz?.wordClass ?? 'noun'));
    setNovaState('idle');
    startRef.current = Date.now();
    quiz?.options?.forEach((opt) => warnMissingArt('WordMatch', opt.word));
  }, [quiz?.word]);

  useEffect(() => {
    const audioText = getPromptText(quiz, 'word_match');
    if (!audioText) return;
    let cancelled = false;
    setAudioUrl(null);
    fetchAudio(audioText).then(url => {
      if (cancelled) return;
      if (url) { setAudioUrl(url); playAudio(url); }
    });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const replayAudio = useCallback(() => { if (audioUrl) playAudio(audioUrl); }, [audioUrl]);

  const handleTap = useCallback((idx) => {
    if (answered) return;
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;

    if (!correct && !missedOnce) {
      setMissedOnce(true);
      setWrongTileIdx(idx);
      setMessage("Not quite — try the glowing one!");
      setTimeout(() => {
        setWrongTileIdx(null);
        setRevealCorrect(true);
      }, 450);
      return;
    }

    setAnswered(true);
    if (correct) {
      setNovaState('correct');
      setConfetti(true);
      setMessage(encouragement ?? `That's right! ${quiz.word}!`);
      setTimeout(() => setConfetti(false), 900);
    } else {
      setWrongTileIdx(idx);
      setMessage(`That's okay — it's "${quiz.word}"!`);
      const url = audioCache.get(getPromptText(quiz, 'word_match'));
      if (url) playAudio(url);
    }
    setTimeout(() => {
      setNovaState('idle');
      onAnswer({ correct, responseTimeMs, firstTry: true });
    }, correct ? 1100 : 1700);
  }, [answered, missedOnce, quiz, onAnswer, encouragement]);

  if (!quiz) return null;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <ConfettiStars active={confetti} originRef={correctTileRef} />
      <NovaPorthole novaState={novaState} message={message} />

      <div style={{ textAlign: 'center', margin: '8px 0 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 'clamp(1.6rem,6vw,2.2rem)', color: colors.cloud }}>
            Tap the picture of <span style={{ color: colors.sun }}>{quiz.word}</span>
          </div>
          <button
            onClick={replayAudio}
            disabled={!audioUrl}
            aria-label="Hear the word again"
            style={{
              width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              cursor: audioUrl ? 'pointer' : 'default', opacity: audioUrl ? 1 : 0.5,
            }}
          >
            <IconSpeaker size={20} color={colors.cloud} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 560, margin: '0 auto' }}>
        {quiz.options.map((opt, idx) => {
          const isCorrectTile = idx === quiz.correctIndex;
          let state;
          if (idx === wrongTileIdx) state = 'wiggle-soften';
          else if ((revealCorrect || (showHint && !answered)) && isCorrectTile) state = 'hint-glow';
          else if (answered && isCorrectTile) state = 'correct-flash';
          return (
            <AnswerTile
              key={idx}
              index={idx}
              onTap={() => handleTap(idx)}
              disabled={answered}
              state={state}
            >
              <div ref={isCorrectTile ? correctTileRef : undefined}>
                <WordArt word={opt.word} size={92} />
              </div>
              <div style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.ink, fontSize: '1.05rem' }}>{opt.word}</div>
            </AnswerTile>
          );
        })}
      </div>
    </div>
  );
}

// ─── GAME 2: Sound Match ──────────────────────────────────────────────────────
// Hear the word (audio plays automatically) → tap the correct image.
// Falls back gracefully if audio isn't available yet.
function SoundMatch({ quiz, onAnswer, audioUrl }) {
  const [selected, setSelected]   = useState(null);
  const [answered, setAnswered]   = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [audioError, setAudioError]   = useState(false);
  const audioRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    setSelected(null);
    setAnswered(false);
    setAudioPlayed(false);
    setAudioError(false);
    startRef.current = null;
    quiz?.options?.forEach((opt) => warnMissingArt('SoundMatch', opt.word));
    // Auto-play when quiz loads (with a small delay for UX)
    const timer = setTimeout(() => playWord(), 600);
    return () => clearTimeout(timer);
  }, [quiz?.word]);

  const playWord = () => {
    if (!audioUrl) {
      // No audio yet — show the word as fallback
      setAudioError(true);
      setAudioPlayed(true);
      startRef.current = Date.now();
      return;
    }
    const audio = playAudio(audioUrl);
    if (audio) {
      audio.onplay = () => {
        setAudioPlayed(true);
        startRef.current = Date.now();
      };
      audio.onerror = () => {
        setAudioError(true);
        setAudioPlayed(true);
        startRef.current = Date.now();
      };
    } else {
      setAudioPlayed(true);
      startRef.current = Date.now();
    }
  };

  const handleTap = (idx) => {
    if (answered || !audioPlayed) return;
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - (startRef.current || Date.now());
    setSelected(idx);
    setAnswered(true);
    setTimeout(() => onAnswer({ correct, responseTimeMs }), 1400);
  };

  return (
    <div style={{ padding: '0 1.5rem 1.5rem', animation: 'mw-slide-up 0.35s ease' }}>
      {/* Speaker button */}
      <div style={{ textAlign: 'center', margin: '1.5rem 0 2rem' }}>
        <button
          onClick={playWord}
          style={{
            background: audioPlayed ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.25)',
            border: `2px solid ${T.teal}`,
            borderRadius: '50%',
            width: '90px', height: '90px',
            fontSize: '2.5rem',
            cursor: 'pointer',
            transition: 'transform 0.15s',
            animation: !audioPlayed ? 'mw-pulse-glow 1.5s ease infinite' : 'none',
          }}
        >🔊</button>

        {/* Fallback: show the word if no audio */}
        {audioError && (
          <div style={{
            fontFamily: 'Space Grotesk',
            fontSize: '2.5rem',
            color: T.teal,
            marginTop: '1rem',
          }}>{quiz.word}</div>
        )}

        <div style={{
          fontFamily: 'Atkinson Hyperlegible',
          color: T.muted,
          fontSize: '0.9rem',
          marginTop: '0.75rem',
        }}>
          {!audioPlayed ? 'Listen…' : 'Which picture matches?'}
        </div>
      </div>

      {/* Picture options — same grid as WordMatch */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
        {quiz.options.map((opt, idx) => {
          let className = 'mw-option-btn';
          if (answered) {
            if (idx === quiz.correctIndex) className += ' correct revealed';
            else if (idx === selected)     className += ' wrong';
          }
          return (
            <button
              key={idx}
              className={className}
              onClick={() => handleTap(idx)}
              disabled={answered || !audioPlayed}
              style={{ opacity: audioPlayed ? 1 : 0.4, transition: 'opacity 0.3s' }}
            >
              <WordArt word={opt.word} size={72} />
              {answered && (
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: idx === quiz.correctIndex ? T.teal : T.muted,
                }}>
                  {opt.word}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ACTIVITY: Word Hunt ───────────────────────────────────────────────────
// Show the picture at the top — find the correct WORD from 4 options.
// Inverse of Tap & Hear: picture-first instead of word-first. Same shared
// chrome + errorless scaffold as WordMatch.
function WordHunt({ quiz, onAnswer, encouragement }) {
  const [answered,  setAnswered]  = useState(false);
  const [novaState, setNovaState] = useState('idle');
  const [message,   setMessage]   = useState('Which word matches this picture?');
  const [confetti,  setConfetti]  = useState(false);
  const [wrongTileIdx,  setWrongTileIdx]  = useState(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [missedOnce,    setMissedOnce]    = useState(false);
  const correctTileRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setAnswered(false);
    setWrongTileIdx(null);
    setRevealCorrect(false);
    setMissedOnce(false);
    setMessage('Which word matches this picture?');
    setNovaState('idle');
    startRef.current = Date.now();
    warnMissingArt('WordHunt', quiz?.word);
  }, [quiz?.word]);

  useEffect(() => {
    let cancelled = false;
    fetchAudio('Which word matches this picture?').then(url => { if (!cancelled && url) playAudio(url); });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const handleTap = (idx) => {
    if (answered) return;
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;

    if (!correct && !missedOnce) {
      setMissedOnce(true);
      setWrongTileIdx(idx);
      setMessage('Not quite — try the glowing one!');
      setTimeout(() => { setWrongTileIdx(null); setRevealCorrect(true); }, 450);
      return;
    }

    setAnswered(true);
    if (correct) {
      setNovaState('correct');
      setConfetti(true);
      setMessage(encouragement ?? 'Found it!');
      setTimeout(() => setConfetti(false), 900);
    } else {
      setWrongTileIdx(idx);
      setMessage(`That's okay — it's "${quiz.word}"!`);
    }
    setTimeout(() => { setNovaState('idle'); onAnswer({ correct, responseTimeMs, firstTry: true }); }, correct ? 1100 : 1700);
  };

  if (!quiz) return null;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <ConfettiStars active={confetti} originRef={correctTileRef} />
      <NovaPorthole novaState={novaState} message={message} />
      <div style={{ textAlign: 'center', margin: '8px 0 28px' }}>
        <WordArt word={quiz.word} size={110} style={{ margin: '0 auto' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 560, margin: '0 auto' }}>
        {quiz.options.map((opt, idx) => {
          const isCorrectTile = idx === quiz.correctIndex;
          let state;
          if (idx === wrongTileIdx) state = 'wiggle-soften';
          else if (revealCorrect && isCorrectTile) state = 'hint-glow';
          else if (answered && isCorrectTile) state = 'correct-flash';
          return (
            <AnswerTile key={idx} index={idx} onTap={() => handleTap(idx)} disabled={answered} state={state} minHeight={90}>
              <div ref={isCorrectTile ? correctTileRef : undefined} style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.ink, fontSize: '1.4rem' }}>
                {opt.word}
              </div>
            </AnswerTile>
          );
        })}
      </div>
    </div>
  );
}

// ─── ACTIVITY: Match & Sort (RhymeTime) ────────────────────────────────────
// Show a word at the top — tap the word that RHYMES with it. Same shared
// chrome + errorless scaffold as WordMatch/WordHunt.
function RhymeTime({ quiz, onAnswer, encouragement }) {
  const [answered,  setAnswered]  = useState(false);
  const [novaState, setNovaState] = useState('idle');
  const [message,   setMessage]   = useState('Which word rhymes with this?');
  const [confetti,  setConfetti]  = useState(false);
  const [wrongTileIdx,  setWrongTileIdx]  = useState(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [missedOnce,    setMissedOnce]    = useState(false);
  const correctTileRef = useRef(null);
  const startRef = useRef(Date.now());

  const rhymeAnswer = RHYME_MAP[quiz?.word] ?? null;

  // Build 4 options: 1 rhyme + 3 non-rhyming decoys, shuffled once per quiz
  const [options] = useState(() => {
    if (!rhymeAnswer) return null;
    const decoys = RHYME_DECOYS.slice(0, 3);
    return [
      { word: rhymeAnswer, correct: true },
      ...decoys.map(d => ({ word: d, correct: false })),
    ].sort(() => Math.random() - 0.5);
  });

  const correctIdx = options ? options.findIndex(o => o.correct) : quiz?.correctIndex ?? 0;

  useEffect(() => {
    setAnswered(false);
    setWrongTileIdx(null);
    setRevealCorrect(false);
    setMissedOnce(false);
    setMessage('Which word rhymes with this?');
    setNovaState('idle');
    startRef.current = Date.now();
  }, [quiz?.word]);

  useEffect(() => {
    if (!quiz?.word) return;
    let cancelled = false;
    fetchAudio(`Which word rhymes with ${quiz.word}?`).then(url => { if (!cancelled && url) playAudio(url); });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const handleTap = (idx) => {
    if (answered) return;
    const isCorrect = idx === correctIdx;
    const responseTimeMs = Date.now() - startRef.current;

    if (!isCorrect && !missedOnce) {
      setMissedOnce(true);
      setWrongTileIdx(idx);
      setMessage('Not quite — try the glowing one!');
      setTimeout(() => { setWrongTileIdx(null); setRevealCorrect(true); }, 450);
      return;
    }

    setAnswered(true);
    if (isCorrect) {
      setNovaState('correct');
      setConfetti(true);
      setMessage(encouragement ?? 'You found the rhyme!');
      setTimeout(() => setConfetti(false), 900);
    } else {
      setWrongTileIdx(idx);
      setMessage(`"${quiz.word}" rhymes with "${rhymeAnswer ?? options?.[correctIdx]?.word}"`);
    }
    setTimeout(() => { setNovaState('idle'); onAnswer({ correct: isCorrect, responseTimeMs, firstTry: true }); }, isCorrect ? 1100 : 1700);
  };

  if (!quiz) return null;

  const displayOptions = options ?? quiz.options.map((o, i) => ({ word: o.word, correct: i === quiz.correctIndex }));

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <ConfettiStars active={confetti} originRef={correctTileRef} />
      <NovaPorthole novaState={novaState} message={message} />
      <div style={{ textAlign: 'center', margin: '8px 0 28px' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 'clamp(2rem,8vw,3rem)', color: colors.sun }}>
          {quiz.word}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 560, margin: '0 auto' }}>
        {displayOptions.map((opt, idx) => {
          const isCorrectTile = idx === correctIdx;
          let state;
          if (idx === wrongTileIdx) state = 'wiggle-soften';
          else if (revealCorrect && isCorrectTile) state = 'hint-glow';
          else if (answered && isCorrectTile) state = 'correct-flash';
          return (
            <AnswerTile key={idx} index={idx} onTap={() => handleTap(idx)} disabled={answered} state={state} minHeight={80}>
              <div ref={isCorrectTile ? correctTileRef : undefined} style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.ink, fontSize: '1.4rem' }}>
                {opt.word}
              </div>
            </AnswerTile>
          );
        })}
      </div>
    </div>
  );
}

// ─── ACTIVITY: Quiz Boss (FlashCardChallenge) ──────────────────────────────
// Show the picture face-up — tap to reveal the word, then self-rate: know
// it or need practice. Self-rated, not right/wrong-graded, so no errorless
// scaffold applies — but still candy tokens, chunk shadow, no emoji.
function FlashCardChallenge({ quiz, nextQuiz, onAnswer }) {
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setRevealed(false);
    setAnswered(false);
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Make sure this card's audio is cached the instant it appears (it should
  // already be warm from session prefetch, but this guards against a miss),
  // and warm the next card's audio in the background so it's ready when the
  // child gets there.
  useEffect(() => {
    const text = getPromptText(quiz, 'flash_cards');
    if (text) fetchAudio(text);
    const nextText = getPromptText(nextQuiz, 'flash_cards');
    if (nextText) fetchAudio(nextText);
  }, [quiz?.word, nextQuiz?.word]);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    const text = getPromptText(quiz, 'flash_cards');
    fetchAudio(text).then(url => { if (url) playAudio(url); });
  };

  const handleKnow = (know) => {
    if (answered) return;
    setAnswered(true);
    const responseTimeMs = Date.now() - startRef.current;
    setTimeout(() => onAnswer({ correct: know, responseTimeMs, firstTry: true }), 300);
  };

  if (!quiz) return null;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '60vh', justifyContent: 'center' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, color: 'rgba(255,255,255,.8)', fontSize: '.9rem', marginBottom: 20, textAlign: 'center' }}>
        Quiz Boss
      </div>
      <button onClick={handleReveal} style={{
        width: '100%', maxWidth: 300, minHeight: 220, background: colors.cloud, border: 'none',
        borderRadius: 32, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', cursor: revealed ? 'default' : 'pointer', gap: 12,
        boxShadow: shadows.chunk,
      }}>
        <WordArt word={quiz.word} size={90} />
        {revealed ? (
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '2rem', color: colors.ink }}>{quiz.word}</div>
        ) : (
          <div style={{ fontFamily: fonts.display, color: colors.mintDeep, fontSize: '1rem', fontWeight: 700 }}>Tap to reveal!</div>
        )}
      </button>
      {revealed && !answered && (
        <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
          <button onClick={() => handleKnow(false)} style={{
            fontFamily: fonts.display, fontWeight: 700, fontSize: '.95rem',
            background: colors.sun, color: colors.starText, border: 'none',
            borderRadius: 100, padding: '13px 20px', cursor: 'pointer', boxShadow: shadows.chunkSm,
          }}>Need practice</button>
          <button onClick={() => handleKnow(true)} style={{
            fontFamily: fonts.display, fontWeight: 700, fontSize: '.95rem',
            background: colors.mint, color: colors.mintDeep, border: 'none',
            borderRadius: 100, padding: '13px 20px', cursor: 'pointer', boxShadow: shadows.chunkSm,
          }}>I know it!</button>
        </div>
      )}
    </div>
  );
}

// ─── ACTIVITY: Fill the Story (StoryBuilder) ───────────────────────────────
// A sentence with a blank — tap a word chip to select it, tap again to
// confirm. Errorless-adjacent: a wrong confirm softens the chip and glows
// the correct one rather than a red flash, matching the other 4 activities.
function StoryBuilder({ quiz, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [filled,   setFilled]   = useState(false);
  const [novaState, setNovaState] = useState('idle');
  const [message,   setMessage]   = useState('Tap a word to choose it');
  const [confetti,  setConfetti]  = useState(false);
  const correctChipRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setSelected(null);
    setAnswered(false);
    setFilled(false);
    setNovaState('idle');
    setMessage('Tap a word to choose it');
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Previously silent — every other activity now speaks a carrier prompt
  // on mount, this one had none at all.
  useEffect(() => {
    fetchAudio(getPromptText(quiz, 'story_builder')).then(playAudio);
  }, [quiz?.word]);

  // quiz.sentence = "The ___ jumped over the puddle."
  // quiz.options = [{word, emoji}, ...]
  // quiz.correctIndex = int

  const handleWordTap = (idx) => {
    if (answered) return;
    if (selected === idx) {
      confirmAnswer(idx);
    } else {
      setSelected(idx);
      setMessage('Tap again to place it');
    }
  };

  const confirmAnswer = (idx) => {
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;
    setFilled(true);
    setAnswered(true);
    if (correct) {
      setNovaState('correct');
      setConfetti(true);
      setMessage('That fits perfectly!');
      setTimeout(() => setConfetti(false), 900);
    } else {
      setMessage(`Let's try "${quiz.options[quiz.correctIndex]?.word}" here instead.`);
    }
    setTimeout(() => { setNovaState('idle'); onAnswer({ correct, responseTimeMs }); }, 1600);
  };

  const parts = (quiz?.sentence ?? '').split('___');

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <ConfettiStars active={confetti} originRef={correctChipRef} />
      <NovaPorthole novaState={novaState} message={message} />

      <div style={{
        textAlign: 'center', margin: '8px 0 24px', fontFamily: fonts.display, fontWeight: 700,
        fontSize: 'clamp(1.2rem,4vw,1.6rem)', color: colors.cloud, lineHeight: 1.8,
      }}>
        <span>{parts[0]}</span>
        <span style={{
          display: 'inline-block', minWidth: 90, padding: '2px 10px', borderRadius: 12,
          borderBottom: `3px solid ${filled ? colors.sun : colors.mint}`,
          color: filled ? colors.sun : colors.mint,
        }}>
          {filled && selected !== null ? quiz.options[selected]?.word : '    '}
        </span>
        <span>{parts[1]}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
        {quiz.options.map((opt, idx) => {
          const isSelected = selected === idx && !answered;
          const isCorrectChip = answered && idx === quiz.correctIndex;
          const isWrongChip = answered && idx === selected && !isCorrectChip;
          return (
            <button
              key={idx}
              onClick={() => handleWordTap(idx)}
              disabled={answered}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 100,
                border: 'none', cursor: answered ? 'default' : 'pointer',
                fontFamily: fonts.display, fontWeight: 700, fontSize: '1.05rem', color: colors.ink,
                background: colors.cloud,
                boxShadow: isCorrectChip
                  ? `${shadows.chunkSm}, 0 0 0 4px rgba(62,224,184,.55), 0 0 20px rgba(62,224,184,.6)`
                  : shadows.chunkSm,
                opacity: isWrongChip ? 0.55 : 1,
                filter: isWrongChip ? 'saturate(.55)' : 'none',
                transform: isSelected ? 'translateY(-4px) scale(1.05)' : 'none',
                transition: 'all .2s',
              }}
            >
              <span ref={isCorrectChip ? correctChipRef : undefined}>
                <WordArt word={opt.word} size={28} />
              </span>
              {opt.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── GAME 4: Spell It Out ─────────────────────────────────────────────────────
// See the emoji → tap letter tiles in order to spell the word.
// Only available for words with mastery ≥ 50 (they already know it).
function SpellItOut({ quiz, onAnswer }) {
  const word    = quiz?.word ?? '';
  const letters = word.toUpperCase().split('');

  // Shuffle available letters (target word + decoys)
  const [tileLetters] = useState(() => {
    const decoys = 'AEIOURTNSLHDBMCFGPW'.split('').filter(l => !letters.includes(l));
    const extras = decoys.sort(() => Math.random() - 0.5).slice(0, Math.max(4, letters.length));
    return [...letters, ...extras].sort(() => Math.random() - 0.5);
  });

  const [typed,    setTyped]    = useState([]);     // [{letter, tileIdx}]
  const [usedIdx,  setUsedIdx]  = useState(new Set());
  const [answered, setAnswered] = useState(false);
  const [shakeIdx, setShakeIdx] = useState(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setTyped([]);
    setUsedIdx(new Set());
    setAnswered(false);
    startRef.current = Date.now();
  }, [quiz?.word]);

  const handleTileTap = (letter, tileIdx) => {
    if (answered || usedIdx.has(tileIdx)) return;
    const pos = typed.length;

    if (letter === letters[pos]) {
      // Correct letter
      const next = [...typed, { letter, tileIdx }];
      setTyped(next);
      setUsedIdx(prev => new Set([...prev, tileIdx]));

      if (next.length === letters.length) {
        // Word complete!
        setAnswered(true);
        const responseTimeMs = Date.now() - startRef.current;
        setTimeout(() => onAnswer({ correct: true, responseTimeMs }), 1200);
      }
    } else {
      // Wrong letter
      setShakeIdx(tileIdx);
      setTimeout(() => setShakeIdx(null), 400);

      // After 3 wrong on same position: highlight the correct tile
      // (Hint system — gentle for ages 4–8)
    }
  };

  const handleBackspace = () => {
    if (!typed.length || answered) return;
    const last = typed[typed.length - 1];
    setTyped(prev => prev.slice(0, -1));
    setUsedIdx(prev => {
      const next = new Set(prev);
      next.delete(last.tileIdx);
      return next;
    });
  };

  return (
    <div style={{ padding: '0 1.5rem 1.5rem', animation: 'mw-slide-up 0.35s ease' }}>
      {/* Target emoji (not the word — they spell it) */}
      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <div style={{ fontSize: '72px', animation: 'mw-bounce 2s ease-in-out infinite' }}>
          {quiz.emoji}
        </div>
        <p style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
          Spell the word!
        </p>
      </div>

      {/* Typed word display */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        minHeight: '60px',
      }}>
        {letters.map((l, i) => {
          const isTyped = i < typed.length;
          const isCorrect = answered && isTyped;
          return (
            <div key={i} style={{
              width: '52px', height: '52px',
              borderRadius: '12px',
              border: `2px solid ${isTyped ? T.teal : T.border}`,
              background: isTyped ? 'rgba(45,212,191,0.2)' : 'rgba(42,33,80,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Space Grotesk',
              fontSize: '1.6rem',
              color: isTyped ? T.teal : 'transparent',
              transition: 'all 0.15s',
              animation: isTyped ? `mw-letter-appear 0.2s ease ${i * 0.05}s both` : 'none',
            }}>
              {isTyped ? typed[i].letter : '_'}
            </div>
          );
        })}
        {/* Backspace */}
        {typed.length > 0 && !answered && (
          <button
            onClick={handleBackspace}
            style={{
              width: '52px', height: '52px', borderRadius: '12px',
              background: 'rgba(255,122,89,0.15)', border: `2px solid ${T.coral}`,
              color: T.coral, fontSize: '1.2rem', cursor: 'pointer',
            }}
          >←</button>
        )}
      </div>

      {/* Letter tiles */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0.5rem',
      }}>
        {tileLetters.map((letter, idx) => (
          <div
            key={idx}
            className={`mw-letter-tile ${usedIdx.has(idx) ? 'used' : ''} ${shakeIdx === idx ? 'wrong-tile' : ''}`}
            onClick={() => handleTileTap(letter, idx)}
          >
            {letter}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Session Complete screen ───────────────────────────────────────────────────
export function SessionComplete({ correctCount, total, encouragement, childName, wordsPlayed = [], onPlayAgain, onHome }) {
  const [confettiActive, setConfettiActive] = useState(true);
  const pct   = Math.round((correctCount / total) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;

  useEffect(() => {
    const t = setTimeout(() => setConfettiActive(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      animation: 'mw-slide-up 0.4s ease',
      overflowY: 'auto',
    }}>
      <ConfettiBurst active={confettiActive} />

      {/* Rocket bounce */}
      <div style={{ animation: 'mw-bounce 1s ease 0.2s both', display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 120 120" width="72" height="72"><AvatarRocket /></svg>
      </div>

      <h2 style={{
        fontFamily: 'Space Grotesk',
        fontSize: 'clamp(2rem, 6vw, 2.75rem)',
        color: T.gold,
        margin: '0.75rem 0 0.25rem',
        textShadow: `0 0 30px ${T.gold}88`,
      }}>
        Session Complete!
      </h2>

      {childName && (
        <p style={{ fontFamily: 'Atkinson Hyperlegible', fontSize: '1rem', color: T.muted, margin: '0 0 0.75rem' }}>
          Great work, {childName}!
        </p>
      )}

      {/* Stars */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.75rem 0' }}>
        {[1, 2, 3].map(s => (
          <span key={s} style={{
            opacity: s <= stars ? 1 : 0.15,
            animation: s <= stars ? `mw-pop 0.4s ease ${s * 0.15}s both` : 'none',
          }}>
            <IconStar size={40} color={T.gold} />
          </span>
        ))}
      </div>

      <p style={{ fontFamily: 'Space Grotesk', fontSize: '1.3rem', color: T.white, margin: '0.25rem 0 1.25rem' }}>
        {correctCount} / {total} correct!
      </p>

      {/* Words practiced pills */}
      {wordsPlayed.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
          maxWidth: '320px',
          marginBottom: '1.5rem',
        }}>
          {wordsPlayed.map((wp, i) => (
            <div key={i} style={{
              background: wp.correct ? 'rgba(45,212,191,0.15)' : 'rgba(255,122,89,0.1)',
              border: `1.5px solid ${wp.correct ? T.teal : T.coral}`,
              borderRadius: '50px',
              padding: '0.25rem 0.75rem',
              fontFamily: 'Atkinson Hyperlegible',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: wp.correct ? T.teal : T.coral,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}>
              <WordArt word={wp.word} size={20} />
              <span>{wp.word}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontFamily: 'Atkinson Hyperlegible', fontSize: '0.95rem', color: T.muted, margin: '0 0 2rem', maxWidth: '260px' }}>
        {encouragement}
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onPlayAgain}
          style={{
            fontFamily: 'Space Grotesk',
            fontSize: '1.1rem',
            background: T.teal,
            color: T.bg,
            border: 'none',
            borderRadius: '50px',
            padding: '0.875rem 2rem',
            cursor: 'pointer',
          }}
        >
          Keep Going!
        </button>
        <button
          onClick={onHome}
          style={{
            fontFamily: 'Space Grotesk',
            fontSize: '1.1rem',
            background: 'transparent',
            color: T.white,
            border: `2px solid ${T.border}`,
            borderRadius: '50px',
            padding: '0.875rem 2rem',
            cursor: 'pointer',
          }}
        >
          Home
        </button>
      </div>
    </div>
  );
}

// ─── Game type selector (shown before a game starts) ─────────────────────────
// MLC interaction-type bindings (confirmed with the user, see CLAUDE.md
// "Lesson-type bindings" — based on actual interaction mechanics, not
// surface prompt phrasing). null = doesn't cleanly fit any of the four,
// left unbound rather than forced (SpellItOut).
const MLC_TYPES = {
  word_match:    'Following Commands',
  sound_match:   'Following Commands',
  word_hunt:     'Answering Questions',
  rhyme_time:    'Answering Questions',
  // Phase 2 Step 7: rebound from flash_cards now that say_it does real
  // speech capture (Web Speech SpeechRecognition) instead of a
  // "hear, self-rate" scaffold — closes the gap flagged in
  // docs/mlc-engine-audit.md. flash_cards is left unbound rather than
  // double-counted against the same MLC category.
  say_it:        'Verbal Imitation',
  flash_cards:   null,
  story_builder: 'Sentence Completion',
  spell_it_out:  null,
};

const GAME_TYPES = [
  { id: 'word_match',   label: 'Word Match',   emoji: '👀', desc: 'See the word, tap the picture',  color: T.teal,   gradient: `linear-gradient(135deg, rgba(45,212,191,0.2), rgba(45,212,191,0.04))`,   available: true  },
  { id: 'sound_match',  label: 'Sound Match',  emoji: '🔊', desc: 'Hear the word, tap the picture', color: T.purple, gradient: `linear-gradient(135deg, rgba(123,104,238,0.2), rgba(123,104,238,0.04))`, available: true  },
  { id: 'word_hunt',    label: 'Word Hunt',    emoji: '🔍', desc: 'Find the matching word',         color: T.gold,   gradient: `linear-gradient(135deg, rgba(255,184,77,0.2), rgba(255,184,77,0.04))`, available: true  },
  { id: 'rhyme_time',   label: 'Rhyme Time',   emoji: '🎵', desc: 'Find the rhyming word',          color: T.pink,   gradient: `linear-gradient(135deg, rgba(255,139,148,0.2), rgba(255,139,148,0.04))`, available: true  },
  { id: 'flash_cards',  label: 'Flash Cards',  emoji: '⚡', desc: 'Quick-fire flashcard game',      color: T.coral,  gradient: `linear-gradient(135deg, rgba(255,122,89,0.2), rgba(255,122,89,0.04))`, available: true  },
  { id: 'story_builder',label: 'Story Builder',emoji: '📖', desc: 'Complete the sentence',          color: T.gold,   gradient: `linear-gradient(135deg, rgba(255,184,77,0.12), rgba(255,184,77,0.02))`,  available: true },
  { id: 'spell_it_out', label: 'Spell It Out', emoji: '🔤', desc: 'Tap the letters to spell it',   color: T.pink,   gradient: `linear-gradient(135deg, rgba(255,139,148,0.12), rgba(255,139,148,0.02))`,available: false },
  { id: 'say_it',       label: 'Say It with Nova', emoji: '🎤', desc: 'Say the word out loud',      color: T.coral,  gradient: `linear-gradient(135deg, rgba(255,122,89,0.2), rgba(255,122,89,0.04))`, available: true  },
];

const PREMIUM_FEATURES = [
  '🔊 Sound Match — hear and tap',
  '📖 Story Builder — fill the blank',
  '🔤 Spell It Out — letter tiles',
  '📚 Units 6–18 unlocked',
  '📊 Advanced parent analytics',
];

export function UpgradeModal({ onClose }) {
  const [notifyMe, setNotifyMe] = useState(false);
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }} onClick={onClose}>
      <div style={{
        background: T.bg,
        border: `2px solid ${T.gold}`,
        borderRadius: '24px',
        padding: '2rem 1.75rem',
        maxWidth: '340px',
        width: '100%',
        textAlign: 'center',
        animation: 'mw-pop 0.3s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>🌟</div>
        <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.5rem', color: T.gold, margin: '0 0 0.25rem' }}>
          Go Premium
        </h3>
        <p style={{ fontFamily: 'Atkinson Hyperlegible', fontSize: '0.875rem', color: T.muted, margin: '0 0 1.25rem' }}>
          Unlock all games and every word unit:
        </p>
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          {PREMIUM_FEATURES.map((f, i) => (
            <div key={i} style={{
              fontFamily: 'Atkinson Hyperlegible', fontSize: '0.9rem', color: T.white,
              padding: '0.35rem 0', borderBottom: i < PREMIUM_FEATURES.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>{f}</div>
          ))}
        </div>
        <button onClick={() => setNotifyMe(true)} style={{
          width: '100%',
          fontFamily: 'Space Grotesk', fontSize: '1rem',
          background: `linear-gradient(135deg, ${T.gold}, #FFB300)`,
          color: '#1A0A00', border: 'none', borderRadius: '50px',
          padding: '0.875rem 1rem', cursor: 'pointer', opacity: notifyMe ? 0.7 : 1,
          transition: 'opacity 0.2s ease',
        }}>
          {notifyMe ? "You're on the list! 🎉" : 'Start Free Trial — $9.99/mo'}
        </button>
        <p style={{ fontFamily: 'Atkinson Hyperlegible', fontSize: '0.75rem', color: T.muted, margin: '0.75rem 0 0' }}>
          {notifyMe ? "We'll email you the moment premium launches!" : "Coming soon — tap to get notified at launch"}
        </p>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: T.muted,
          fontFamily: 'Atkinson Hyperlegible', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.75rem',
        }}>
          Maybe later
        </button>
      </div>
    </div>,
    document.body
  );
}

export function GameTypeSelector({ onSelect, unlockedGames = ['word_match'] }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [recentlyDismissed, setRecentlyDismissed] = useState(false);
  const dismissedRef = useRef(false);

  const dismissUpgrade = useCallback(() => {
    setShowUpgrade(false);
    dismissedRef.current = true;
    setRecentlyDismissed(true);
    setTimeout(() => {
      dismissedRef.current = false;
      setRecentlyDismissed(false);
    }, 2000);
  }, []);

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: T.bg, animation: 'mw-slide-up 0.3s ease' }}>
      {showUpgrade && <UpgradeModal onClose={dismissUpgrade} />}

      <h2 style={{
        fontFamily: 'Space Grotesk',
        fontSize: '1.5rem',
        color: T.white,
        textAlign: 'center',
        margin: '0 0 1.25rem',
      }}>
        Choose a Game ✨
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
        {GAME_TYPES.map((game, idx) => {
          const isUnlocked = unlockedGames.includes(game.id);
          return (
            <button
              key={game.id}
              className="mw-option-btn"
              onClick={() => {
                if (isUnlocked) { onSelect(game.id); }
                else if (!dismissedRef.current) { setShowUpgrade(true); }
              }}
              style={{
                minHeight: '130px',
                opacity: isUnlocked ? 1 : (recentlyDismissed ? 0.35 : 0.55),
                borderColor: isUnlocked ? game.color : T.border,
                background: isUnlocked ? game.gradient : T.card,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: isUnlocked ? `0 4px 24px ${game.color}22, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                position: 'relative',
                cursor: 'pointer',
                animation: `mw-slide-up 0.35s ease ${idx * 0.06}s both`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { if (isUnlocked) e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 8px 32px ${game.color}44, inset 0 1px 0 rgba(255,255,255,0.1)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isUnlocked ? `0 4px 24px ${game.color}22, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none'; }}
            >
              {!isUnlocked && (
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: `${T.gold}22`, border: `1px solid ${T.gold}88`,
                  borderRadius: '20px', padding: '2px 8px',
                  fontSize: '0.65rem', color: T.gold, fontFamily: 'Atkinson Hyperlegible', fontWeight: 700,
                }}>🔒 Premium</div>
              )}
              <span style={{ fontSize: '2.5rem' }}>{game.emoji}</span>
              <span style={{ fontFamily: 'Space Grotesk', fontSize: '1rem', color: isUnlocked ? T.white : T.muted }}>
                {game.label}
              </span>
              <span style={{ fontFamily: 'Atkinson Hyperlegible', fontSize: '0.75rem', color: T.muted, textAlign: 'center', lineHeight: 1.3 }}>
                {game.desc}
              </span>
              {MLC_TYPES[game.id] && (
                <span style={{
                  fontFamily: 'Atkinson Hyperlegible', fontSize: '0.625rem', fontWeight: 700,
                  color: isUnlocked ? game.color : T.muted, opacity: 0.85, marginTop: '0.4rem',
                  textTransform: 'uppercase', letterSpacing: '0.03em',
                }}>
                  {MLC_TYPES[game.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Sprint 2 Part B — activity/word capability check. Word Match, Sound
// Match, Word Hunt, and Rhyme Time all present a word as "the picture" —
// wrong for a word with no real illustration (server already only builds
// picture-eligible distractor sets for these, but a session can still mix
// eligible/ineligible target words across its quiz list depending on
// what's due for review). Story Builder, Flash Cards, and Say It don't
// depend on a picture, so they get the full quiz list unfiltered.
const PICTURE_MATCH_GAME_TYPES = new Set(['word_match', 'sound_match', 'word_hunt', 'rhyme_time']);

// ─── Main GameEngine ──────────────────────────────────────────────────────────
export function GameEngine({
  sessionPlan,
  gameType     = 'word_match',
  childName,
  onProgress,
  onSessionEnd,
  onHome,
  onXP,
  userId,
  childId,
}) {
  useEffect(() => { injectCSS(); }, []);

  // Stop any audio playing when the game is unmounted (session ends / user goes home)
  useEffect(() => {
    return () => { stopCurrentAudio(); };
  }, []);

  const allQuizzes = sessionPlan?.quizzes ?? [];
  // Fall back to the unfiltered list only if filtering would leave nothing
  // to play (e.g. a session drawn entirely from function words) — an
  // empty session is a worse outcome than one non-ideal picture quiz.
  const pictureFiltered = allQuizzes.filter((q) => q.pictureEligible);
  const quizzes = PICTURE_MATCH_GAME_TYPES.has(gameType)
    ? (pictureFiltered.length > 0 ? pictureFiltered : allQuizzes)
    : allQuizzes;
  const encouragements = sessionPlan?.encouragements ?? ['Great job!'];

  const [currentIdx,        setCurrentIdx]        = useState(0);
  const [correctCount,      setCorrectCount]      = useState(0);
  const [showConfetti,      setShowConfetti]      = useState(false);
  const [sessionDone,       setSessionDone]       = useState(false);
  const [encouragIdx,       setEncouragIdx]       = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong,   setConsecutiveWrong]   = useState(0);
  const [wordsPlayed,        setWordsPlayed]        = useState([]);
  const [xpToast,           setXpToast]           = useState(null);
  const sessionStartRef = useRef(Date.now());
  const sessionXPRef    = useRef(0);
  const xpToastIdRef    = useRef(0);

  const currentQuiz = quizzes[currentIdx];
  const totalQuizzes = quizzes.length;

  // Pre-fetch session question audio at session start — fetch the first card's
  // audio first (so it's ready the instant the session opens), then fetch the
  // rest one at a time in the background. Firing every request in parallel was
  // congesting the ElevenLabs proxy and delaying the very first clip.
  useEffect(() => {
    const texts = quizzes.map(q => getPromptText(q, gameType)).filter(Boolean);
    let cancelled = false;
    (async () => {
      for (const text of texts) {
        if (cancelled) return;
        await fetchAudio(text);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback(({ correct, responseTimeMs, firstTry = true }) => {
    // XP calculation
    if (correct) {
      let xpEarned = 10;
      if (firstTry) xpEarned += 5;
      if (responseTimeMs < 3000) xpEarned += 5;
      sessionXPRef.current += xpEarned;
      const toastId = ++xpToastIdRef.current;
      setXpToast({ id: toastId, amount: xpEarned });
      setTimeout(() => setXpToast(t => t?.id === toastId ? null : t), 900);
    }

    const newCorrect = correctCount + (correct ? 1 : 0);
    if (correct) {
      setCorrectCount(newCorrect);
      setConsecutiveCorrect(n => n + 1);
      setConsecutiveWrong(0);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    } else {
      setConsecutiveWrong(n => n + 1);
      setConsecutiveCorrect(0);
    }

    const newWordsPlayed = [...wordsPlayed, { word: currentQuiz.word, correct }];
    setWordsPlayed(newWordsPlayed);

    // Report progress to parent (saves to Supabase)
    onProgress?.({
      word:          currentQuiz.word,
      correct,
      responseTimeMs,
      gameType,
      attemptNumber: 1,
    });

    setEncouragIdx(i => i + 1);

    // WordMatch already waits 1400ms before calling onAnswer — advance immediately
    if (currentIdx + 1 >= totalQuizzes) {
      const isPerfect = newCorrect === totalQuizzes;
      const totalXP = sessionXPRef.current + 20 + (isPerfect ? 50 : 0);
      setSessionDone(true);
      onXP?.(totalXP);
      onSessionEnd?.({
        wordsCorrect: newCorrect,
        totalWords:   totalQuizzes,
        timeSpentMs:  Date.now() - sessionStartRef.current,
        wordsPlayed:  newWordsPlayed,
      });
    } else {
      setCurrentIdx(i => i + 1);
    }
  }, [correctCount, wordsPlayed, currentQuiz, currentIdx, totalQuizzes, gameType, onProgress, onSessionEnd, onXP]);

  const handlePlayAgain = () => {
    setCurrentIdx(0);
    setCorrectCount(0);
    setSessionDone(false);
    setConsecutiveCorrect(0);
    setConsecutiveWrong(0);
    setWordsPlayed([]);
    sessionStartRef.current = Date.now();
    sessionXPRef.current = 0;
  };

  if (sessionDone) {
    return (
      <SessionComplete
        correctCount={correctCount}
        total={totalQuizzes}
        encouragement={encouragements[0]}
        childName={childName}
        wordsPlayed={wordsPlayed}
        onPlayAgain={handlePlayAgain}
        onHome={onHome}
      />
    );
  }

  if (!currentQuiz) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: T.muted, fontFamily: 'Atkinson Hyperlegible' }}>
        No quizzes loaded. Please check your session plan.
      </div>
    );
  }

  // The 5 E2-rebuilt activities self-manage their own confetti/stage
  // background (candy sky gradient, see docs/mockup-E2-no-emoji.html) and
  // would double-fire confetti if the orchestrator also triggered it.
  // Un-rebuilt game types (SoundMatch, SpellItOut, etc.) still fall back to
  // the orchestrator-level ConfettiBurst + Cloud background.
  //
  // word_builder added here after docs/WORDBUILDER_FIX_REPORT.md found it's
  // actually live and reachable from PlayScreen.jsx (it was mistakenly
  // conflated with the genuinely-unreachable SpellItOut during the earlier
  // UI polish pass and never audited).
  const isE2Activity = ['word_match', 'word_hunt', 'rhyme_time', 'story_builder', 'flash_cards', 'word_builder'].includes(gameType);

  return (
    <div style={{
      minHeight: '100vh',
      background: isE2Activity ? skyGradient : T.bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: fonts.body,
    }}>
      {!isE2Activity && <ConfettiBurst active={showConfetti} />}
      {xpToast && (
        <div key={xpToast.id} style={{
          position: 'fixed', top: '35%', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.sun,
          zIndex: 10001, animation: 'xp-float-up 0.9s ease forwards',
          pointerEvents: 'none', textShadow: '0 0 20px rgba(255,184,77,0.8)',
          whiteSpace: 'nowrap',
        }}>
          +{xpToast.amount} XP <IconStar size={20} color={colors.sun} />
        </div>
      )}

      {isE2Activity ? (
        <div style={{ maxWidth: 780, margin: '0 auto', width: '100%', padding: '28px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={onHome}
              aria-label="Close lesson"
              style={{
                width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
              }}
            >
              <IconClose size={20} color={colors.cloud} />
            </button>
            <StarProgress current={currentIdx + 1} total={totalQuizzes} />
          </div>
        </div>
      ) : (
        <SessionProgress
          current={currentIdx + 1}
          total={totalQuizzes}
          correctCount={correctCount}
        />
      )}

      {/* Render the correct game component */}
      {gameType === 'word_match' && (
        <WordMatch
          key={currentIdx}
          quiz={currentQuiz}
          onAnswer={handleAnswer}
          encouragement={encouragements[encouragIdx % encouragements.length]}
          showHint={consecutiveWrong >= 1}
        />
      )}
      {gameType === 'sound_match' && (
        <SoundMatch
          key={currentIdx}
          quiz={currentQuiz}
          onAnswer={handleAnswer}
          audioUrl={audioCache.get(currentQuiz.question ?? currentQuiz.word) ?? null}
        />
      )}
      {gameType === 'word_hunt' && (
        <WordHunt
          key={currentIdx}
          quiz={currentQuiz}
          onAnswer={handleAnswer}
          encouragement={encouragements[encouragIdx % encouragements.length]}
        />
      )}
      {gameType === 'rhyme_time' && (
        <RhymeTime
          key={currentIdx}
          quiz={currentQuiz}
          onAnswer={handleAnswer}
          encouragement={encouragements[encouragIdx % encouragements.length]}
        />
      )}
      {gameType === 'flash_cards' && (
        <FlashCardChallenge
          key={currentIdx}
          quiz={currentQuiz}
          nextQuiz={quizzes[currentIdx + 1] ?? null}
          onAnswer={handleAnswer}
        />
      )}
      {gameType === 'story_builder' && (
        <StoryBuilder key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'spell_it_out' && (
        <SpellItOut key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'word_builder' && (
        <WordBuilder key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'draw_it' && (
        <DrawIt key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} userId={userId} childId={childId} />
      )}
      {gameType === 'word_song' && (
        <WordSong key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'magic_video' && (
        <MagicVideo key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'story_time' && (
        <StoryTimeActivity key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'say_it' && (
        <SayItWithNova key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
    </div>
  );
}

export default GameEngine;
