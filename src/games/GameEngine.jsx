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
import { colors as dawnTokens } from '../design-system/tokens';

// ─── Audio cache — text → blob URL, survives React re-renders ────────────────
const audioCache    = new Map(); // text → blob URL string
const audioFetching = new Map(); // text → Promise (in-flight dedup)

// Module-level current audio — ensures only one clip plays at a time
// and audio stops cleanly when the game unmounts.
let currentAudio = null;

function playAudio(url) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (!url) return null;
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play().catch(() => {});
  audio.onended = () => { if (currentAudio === audio) currentAudio = null; };
  return audio;
}

function fetchAudio(text) {
  if (!text) return Promise.resolve(null);
  if (audioCache.has(text)) return Promise.resolve(audioCache.get(text));
  if (audioFetching.has(text)) return audioFetching.get(text);

  const promise = fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
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

// Full-sentence TTS prompt for a quiz, tailored to the game type — used both to
// warm the audio cache at session start and to play the live prompt in-game, so
// the cached text key always matches what's actually spoken (no re-fetch delay).
function getPromptText(quiz, gameType) {
  if (!quiz) return null;
  switch (gameType) {
    case 'word_hunt':   return 'Which word matches this picture?';
    case 'rhyme_time':  return `Which word rhymes with ${quiz.word}?`;
    default:            return quiz.question ?? quiz.word;
  }
}

// ─── Rhyme map for RhymeTime game ────────────────────────────────────────────
const RHYME_MAP = {
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
// Dense, low-motion lesson-player palette — Cloud surface per CLAUDE.md's
// dashboard/lesson-player token assignment. Comet Teal owns "correct";
// Sunrise Coral is the energetic/attention accent (streaks, "wrong" feedback,
// CTAs) — not a fixed "correct = coral" rule, see CLAUDE.md token table.
const T = {
  bg:      dawnTokens.cloud,
  teal:    dawnTokens.cometTeal,
  gold:    dawnTokens.marigold,
  coral:   dawnTokens.sunriseCoral,
  pink:    '#FF8B94',
  purple:  '#7B68EE',
  white:   dawnTokens.dawnIndigo,
  muted:   `${dawnTokens.dawnIndigo}99`,
  card:    `${dawnTokens.dawnIndigo}0a`,
  cardHov: `${dawnTokens.dawnIndigo}1a`,
  border:  `${dawnTokens.dawnIndigo}1f`,
  correct: dawnTokens.cometTeal,
  wrong:   dawnTokens.sunriseCoral,
};

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
  el.textContent = GLOBAL_CSS;
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

// ─── Feedback overlay (shows after answer) ────────────────────────────────────
function FeedbackOverlay({ correct, message, emoji }) {
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: correct
        ? 'rgba(45,212,191,0.18)'
        : 'rgba(255,122,89,0.18)',
      backdropFilter: 'blur(4px)',
      animation: 'mw-pop 0.3s ease',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: '80px', animation: 'mw-celebrate 0.6s ease' }}>{emoji}</div>
      <div style={{
        fontFamily: 'Space Grotesk',
        fontSize: '2rem',
        color: correct ? T.teal : T.coral,
        marginTop: '1rem',
        textAlign: 'center',
        padding: '0 1rem',
      }}>{message}</div>
    </div>,
    document.body
  );
}

// ─── Word tile: large centered emoji ─────────────────────────────────────────
function WordTile({ emoji }) {
  return (
    <span style={{ fontSize: '4.5rem', lineHeight: 1, display: 'block', textAlign: 'center', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>{emoji}</span>
  );
}

// ─── GAME 1: Word Match ────────────────────────────────────────────────────────
// See word → tap the correct emoji. Classic MVP game, polished.
function WordMatch({ quiz, onAnswer, encouragement, showHint = false }) {
  const [selected,    setSelected]    = useState(null);
  const [answered,    setAnswered]    = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayData, setOverlayData] = useState(null);
  const [audioUrl,    setAudioUrl]    = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [novaState,   setNovaState]   = useState('idle');
  // Errorless-learning scaffold: a first wrong tap doesn't let the error
  // complete — it shakes the wrong tile, then highlights the correct one
  // and lets the child retry immediately (highlight stays until they
  // answer, not a flickering timed pulse — the cue should still be there
  // the instant input re-enables). Only a second miss on the same
  // question lets the error complete (overlay + advance), per CLAUDE.md's
  // errorless-learning open task.
  const [wrongTileIdx,   setWrongTileIdx]   = useState(null);
  const [shaking,        setShaking]        = useState(false);
  const [revealCorrect,  setRevealCorrect]  = useState(false);
  const [missedOnce,     setMissedOnce]     = useState(false);
  const startRef = useRef(Date.now());

  // Reset game state immediately — never wait for audio
  useEffect(() => {
    setSelected(null);
    setAnswered(false);
    setShowOverlay(false);
    setOverlayData(null);
    setWrongTileIdx(null);
    setShaking(false);
    setRevealCorrect(false);
    setMissedOnce(false);
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Fetch audio for the full question — UI is never blocked if audio is slow
  useEffect(() => {
    const audioText = quiz?.question ?? quiz?.word;
    if (!audioText) return;
    let cancelled = false;
    setAudioUrl(null);
    setAudioLoading(true);
    fetchAudio(audioText)
      .then(url => {
        if (cancelled) return;
        setAudioLoading(false);
        if (url) {
          setAudioUrl(url);
          playAudio(url);
        }
      })
      .catch(() => { if (!cancelled) setAudioLoading(false); });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const replayAudio = useCallback(() => {
    if (audioUrl) playAudio(audioUrl);
  }, [audioUrl]);

  const handleTap = useCallback((idx) => {
    if (answered || shaking) return;
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;

    if (!correct && !missedOnce) {
      // First miss on this question: don't let the error complete. Shake
      // the wrong tile, then highlight the correct one and let the child
      // retry — no overlay, no advance, no XP/mastery call yet. The
      // highlight stays until they answer, so the cue is still visible
      // the instant input re-enables.
      setMissedOnce(true);
      setNovaState('wrong');
      setWrongTileIdx(idx);
      setShaking(true);
      setTimeout(() => {
        setWrongTileIdx(null);
        setNovaState('idle');
        setShaking(false);
        setRevealCorrect(true);
      }, 450);
      return;
    }

    setSelected(idx);
    setAnswered(true);
    setNovaState(correct ? 'correct' : 'wrong');
    setOverlayData({
      correct,
      message: correct
        ? (encouragement ?? 'Great job! ⭐')
        : `Oops! That's okay — the ${quiz.word} is ${quiz.emoji}`,
      emoji: correct ? quiz.emoji : '💪',
    });
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
      setNovaState('idle');
      if (!correct) {
        // Replay question audio so child hears it again, then advance after 600ms
        const url = audioCache.get(quiz.question ?? quiz.word);
        if (url) playAudio(url);
        setTimeout(() => onAnswer({ correct, responseTimeMs, firstTry: true }), 600);
      } else {
        onAnswer({ correct, responseTimeMs, firstTry: true });
      }
    }, 1400);
  }, [answered, shaking, missedOnce, quiz, onAnswer, encouragement]);

  if (!quiz) return null;

  return (
    <>
      {showOverlay && overlayData && (
        <FeedbackOverlay
          correct={overlayData.correct}
          message={overlayData.message}
          emoji={overlayData.emoji}
        />
      )}
      {/* Nova mascot */}
      <div style={{
        position: 'fixed', top: 70, left: 16, zIndex: 200, fontSize: 40,
        animation: novaState === 'idle'    ? 'nova-float 3s ease-in-out infinite'
                 : novaState === 'correct' ? 'nova-bounce 0.6s ease'
                 : 'nova-shake 0.4s ease',
        pointerEvents: 'none',
      }}>
        👨‍🚀
      </div>
      <div style={{ padding: '0 1.5rem 1.5rem', animation: 'mw-slide-up 0.35s ease' }}>
        {/* Target word + replay button */}
        <div style={{ textAlign: 'center', margin: '1.5rem 0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <div style={{
              fontFamily: 'Space Grotesk',
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              color: T.white,
              animation: 'mw-word-glow 3s ease-in-out infinite',
              letterSpacing: '2px',
            }}>
              {quiz.word}
            </div>
            <button
              onClick={replayAudio}
              disabled={!audioUrl}
              style={{
                background: 'rgba(45,212,191,0.12)',
                border: `2px solid ${T.teal}`,
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                fontSize: '1.25rem',
                cursor: audioUrl ? 'pointer' : 'default',
                opacity: !audioUrl ? 0.45 : 1,
                animation: audioLoading ? 'mw-pulse-glow 1s ease-in-out infinite' : 'none',
                transition: 'opacity 0.3s',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🔊
            </button>
          </div>
          <div style={{
            fontFamily: 'Atkinson Hyperlegible',
            fontSize: '1rem',
            color: T.muted,
            marginTop: '0.25rem',
          }}>
            {formatQuestion(quiz.word, quiz.wordClass ?? 'noun')}
          </div>
        </div>

        {/* Emoji options grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.875rem',
        }}>
          {quiz.options.map((opt, idx) => {
            let className = 'mw-option-btn';
            const isCorrectTile = idx === quiz.correctIndex;
            if (answered) {
              if (isCorrectTile)         className += ' correct revealed';
              else if (idx === selected) className += ' wrong';
            }
            if (idx === wrongTileIdx) className += ' wrong';
            // Hint — pulse on correct tile after 1 consecutive wrong question
            // (session-level), OR persistently once this question's own
            // first miss has been modeled (errorless-learning scaffold —
            // stays lit until answered, see handleTap).
            const showPulse = (revealCorrect || (showHint && !answered)) && isCorrectTile;
            const hintStyle = showPulse
              ? { animation: 'mw-pulse-glow 0.8s ease-in-out infinite', borderColor: 'rgba(45,212,191,0.5)' }
              : {};
            return (
              <button
                key={idx}
                className={className}
                onClick={() => handleTap(idx)}
                disabled={answered || shaking}
                style={{
                  ...(showPulse ? {} : { animationDelay: (idx * 0.07) + 's' }),
                  cursor: (answered || shaking) ? 'default' : 'pointer',
                  ...hintStyle,
                }}
              >
                <WordTile emoji={opt.emoji} />
              </button>
            );
          })}
        </div>
      </div>
    </>
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

      {/* Image/emoji options — same grid as WordMatch */}
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
              <span style={{ fontSize: '3rem', lineHeight: 1 }}>{opt.emoji}</span>
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

// ─── GAME NEW-A: Word Hunt ────────────────────────────────────────────────────
// Show the emoji at the top — find the correct WORD from 4 options.
// Inverse of WordMatch: emoji-first instead of word-first.
function WordHunt({ quiz, onAnswer, encouragement }) {
  const [selected,    setSelected]    = useState(null);
  const [answered,    setAnswered]    = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayData, setOverlayData] = useState(null);
  const [novaState,   setNovaState]   = useState('idle');
  const startRef = useRef(Date.now());

  useEffect(() => {
    setSelected(null);
    setAnswered(false);
    setShowOverlay(false);
    setOverlayData(null);
    setNovaState('idle');
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Speak the full prompt — never just the bare word, so the child isn't told the answer
  useEffect(() => {
    let cancelled = false;
    fetchAudio('Which word matches this picture?').then(url => {
      if (!cancelled && url) playAudio(url);
    });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const handleTap = (idx) => {
    if (answered) return;
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;
    setSelected(idx);
    setAnswered(true);
    setNovaState(correct ? 'correct' : 'wrong');
    setOverlayData({
      correct,
      message: correct ? (encouragement ?? 'Found it! ⭐') : `It's "${quiz.word}"!`,
      emoji: correct ? quiz.emoji : '💪',
    });
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
      setNovaState('idle');
      onAnswer({ correct, responseTimeMs, firstTry: true });
    }, 1400);
  };

  if (!quiz) return null;

  return (
    <>
      {showOverlay && overlayData && (
        <FeedbackOverlay correct={overlayData.correct} message={overlayData.message} emoji={overlayData.emoji} />
      )}
      <div style={{ position: 'fixed', top: 70, left: 16, zIndex: 200, fontSize: 40,
        animation: novaState === 'idle' ? 'nova-float 3s ease-in-out infinite' : novaState === 'correct' ? 'nova-bounce 0.6s ease' : 'nova-shake 0.4s ease',
        pointerEvents: 'none' }}>👨‍🚀</div>
      <div style={{ padding: '0 1.5rem 1.5rem', animation: 'mw-slide-up 0.35s ease' }}>
        <div style={{ textAlign: 'center', margin: '1.5rem 0 2rem' }}>
          <div style={{ fontSize: '80px', animation: 'mw-bounce 2s ease-in-out infinite', lineHeight: 1 }}>
            {quiz.emoji}
          </div>
          <div style={{ fontFamily: 'Atkinson Hyperlegible', fontSize: '1rem', color: T.muted, marginTop: '0.75rem' }}>
            Which word matches this picture? 🔍
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
          {quiz.options.map((opt, idx) => {
            let className = 'mw-option-btn';
            if (answered) {
              if (idx === quiz.correctIndex) className += ' correct revealed';
              else if (idx === selected)     className += ' wrong';
            }
            return (
              <button key={idx} className={className} onClick={() => handleTap(idx)} disabled={answered}
                style={{ animationDelay: (idx * 0.07) + 's', cursor: answered ? 'default' : 'pointer', minHeight: 90 }}>
                <span style={{ fontFamily: 'Space Grotesk', fontSize: '1.7rem', color: T.white }}>{opt.word}</span>
                {answered && idx === quiz.correctIndex && (
                  <span style={{ fontSize: '1.2rem', marginTop: 4 }}>{opt.emoji}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── GAME NEW-B: Rhyme Time ───────────────────────────────────────────────────
// Show a word at the top — tap the word that RHYMES with it.
function RhymeTime({ quiz, onAnswer, encouragement }) {
  const [answered,    setAnswered]    = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayData, setOverlayData] = useState(null);
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
    setSelected(null);
    setShowOverlay(false);
    setOverlayData(null);
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Speak the full prompt — "Which word rhymes with cat?" not just "cat"
  useEffect(() => {
    if (!quiz?.word) return;
    let cancelled = false;
    fetchAudio(`Which word rhymes with ${quiz.word}?`).then(url => {
      if (!cancelled && url) playAudio(url);
    });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const handleTap = (idx) => {
    if (answered) return;
    const isCorrect = idx === correctIdx;
    const responseTimeMs = Date.now() - startRef.current;
    setSelected(idx);
    setAnswered(true);
    setOverlayData({
      correct: isCorrect,
      message: isCorrect ? (encouragement ?? '🎵 You found the rhyme!') : `"${quiz.word}" rhymes with "${rhymeAnswer ?? options?.[correctIdx]?.word}"`,
      emoji: isCorrect ? '🎵' : '💪',
    });
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
      onAnswer({ correct: isCorrect, responseTimeMs, firstTry: true });
    }, 1400);
  };

  if (!quiz) return null;

  const displayOptions = options ?? quiz.options.map((o, i) => ({ word: o.word, correct: i === quiz.correctIndex }));

  return (
    <>
      {showOverlay && overlayData && (
        <FeedbackOverlay correct={overlayData.correct} message={overlayData.message} emoji={overlayData.emoji} />
      )}
      <div style={{ padding: '0 1.5rem 1.5rem', animation: 'mw-slide-up 0.35s ease' }}>
        <div style={{ textAlign: 'center', margin: '1.5rem 0 2rem' }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 'clamp(2.5rem, 10vw, 4rem)', color: T.gold,
            textShadow: `0 0 30px ${T.gold}88`, animation: 'mw-word-glow 3s ease-in-out infinite' }}>
            {quiz.word}
          </div>
          <div style={{ fontFamily: 'Atkinson Hyperlegible', fontSize: '0.95rem', color: T.muted, marginTop: '0.5rem' }}>
            🎵 Which word rhymes with this?
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
          {displayOptions.map((opt, idx) => {
            let bg = T.card, border = T.border;
            if (answered) {
              if (idx === correctIdx)    { bg = 'rgba(45,212,191,0.2)'; border = T.teal; }
              else if (idx === selected) { bg = 'rgba(255,122,89,0.2)'; border = T.coral; }
            }
            return (
              <button key={idx} onClick={() => handleTap(idx)} disabled={answered}
                className={`mw-option-btn${answered && idx === correctIdx ? ' correct revealed' : ''}${answered && idx === selected && idx !== correctIdx ? ' wrong' : ''}`}
                style={{ animationDelay: (idx * 0.07) + 's', cursor: answered ? 'default' : 'pointer', minHeight: 80 }}>
                <span style={{ fontFamily: 'Space Grotesk', fontSize: '1.6rem', color: T.white }}>{opt.word}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── GAME NEW-C: Flash Card Challenge ────────────────────────────────────────
// Show emoji face-up — tap to reveal the word, then self-rate: know it or need practice.
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
    const text = quiz?.question ?? quiz?.word;
    if (text) fetchAudio(text);
    const nextText = nextQuiz?.question ?? nextQuiz?.word;
    if (nextText) fetchAudio(nextText);
  }, [quiz?.word, nextQuiz?.word]);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    const text = quiz?.question ?? quiz?.word;
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
    <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '60vh', justifyContent: 'center', animation: 'mw-slide-up 0.35s ease' }}>
      <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        Flash Card Challenge ⚡
      </div>
      {/* The flash card */}
      <div onClick={handleReveal} style={{
        width: '100%', maxWidth: 320, minHeight: 200,
        background: revealed
          ? `linear-gradient(135deg, ${T.teal}33, ${T.teal}1a)`
          : `linear-gradient(135deg, ${T.gold}26, ${T.gold}1a)`,
        border: `2px solid ${revealed ? T.teal : T.gold}`,
        borderRadius: 24, padding: '2rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: revealed ? 'default' : 'pointer',
        transition: 'all 0.3s',
        boxShadow: `0 8px 30px ${revealed ? `${T.teal}33` : `${T.gold}33`}`,
        animation: 'mw-pop 0.3s ease',
      }}>
        <div style={{ fontSize: '80px', marginBottom: '0.75rem' }}>{quiz.emoji}</div>
        {revealed ? (
          <div style={{ fontFamily: 'Space Grotesk', fontSize: '2.5rem', color: T.teal,
            textShadow: `0 0 20px ${T.teal}55`, animation: 'mw-pop 0.25s ease' }}>
            {quiz.word}
          </div>
        ) : (
          <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.gold, fontSize: '1rem', fontWeight: 700 }}>
            Tap to reveal! 👆
          </div>
        )}
      </div>
      {/* Self-rating buttons appear after reveal */}
      {revealed && !answered && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', animation: 'mw-slide-up 0.3s ease' }}>
          <button onClick={() => handleKnow(false)} style={{
            fontFamily: 'Space Grotesk', fontSize: '1rem',
            background: 'rgba(255,122,89,0.15)', border: `2px solid ${T.coral}`,
            color: T.coral, borderRadius: '50px', padding: '0.875rem 1.25rem', cursor: 'pointer',
          }}>Need practice 💪</button>
          <button onClick={() => handleKnow(true)} style={{
            fontFamily: 'Space Grotesk', fontSize: '1rem',
            background: 'rgba(45,212,191,0.15)', border: `2px solid ${T.teal}`,
            color: T.teal, borderRadius: '50px', padding: '0.875rem 1.25rem', cursor: 'pointer',
          }}>I know it! ⭐</button>
        </div>
      )}
    </div>
  );
}

// ─── GAME 3: Story Builder ────────────────────────────────────────────────────
// A sentence with a blank — drag or tap the correct word to fill it.
// Uses tap-to-select (mobile-friendly) rather than pure drag-and-drop.
function StoryBuilder({ quiz, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [filled,   setFilled]   = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setSelected(null);
    setAnswered(false);
    setFilled(false);
    startRef.current = Date.now();
  }, [quiz?.word]);

  // quiz.sentence = "The ___ jumped over the puddle."
  // quiz.options = [{word, emoji}, ...]
  // quiz.correctIndex = int

  const handleWordTap = (idx) => {
    if (answered) return;
    if (selected === idx) {
      // Second tap on selected = confirm
      confirmAnswer(idx);
    } else {
      setSelected(idx);
    }
  };

  const handleDropZoneTap = () => {
    if (selected !== null && !answered) {
      confirmAnswer(selected);
    }
  };

  const confirmAnswer = (idx) => {
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;
    setFilled(true);
    setAnswered(true);
    setTimeout(() => onAnswer({ correct, responseTimeMs }), 1600);
  };

  const parts = (quiz?.sentence ?? '').split('___');

  return (
    <div style={{ padding: '0 1.5rem 1.5rem', animation: 'mw-slide-up 0.35s ease' }}>
      {/* Sentence with blank */}
      <div style={{
        textAlign: 'center',
        margin: '1.5rem 0',
        fontFamily: 'Space Grotesk',
        fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
        color: T.white,
        lineHeight: 1.8,
      }}>
        <span>{parts[0]}</span>
        <span
          className={`mw-drop-zone ${selected !== null && !filled ? 'over' : ''} ${filled ? 'filled' : ''}`}
          onClick={handleDropZoneTap}
        >
          {filled && selected !== null
            ? quiz.options[selected]?.word
            : '\u00A0\u00A0\u00A0\u00A0'}
        </span>
        <span>{parts[1]}</span>
      </div>

      {/* Instruction */}
      <p style={{
        textAlign: 'center',
        fontFamily: 'Atkinson Hyperlegible',
        color: T.muted,
        fontSize: '0.9rem',
        margin: '0 0 1.5rem',
      }}>
        {selected === null ? 'Tap a word to choose it' : 'Tap again to place it ↑'}
      </p>

      {/* Word choices */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        justifyContent: 'center',
      }}>
        {quiz.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect  = answered && idx === quiz.correctIndex;
          const isWrong    = answered && idx === selected && !isCorrect;

          return (
            <button
              key={idx}
              className={`mw-drag-word ${answered && idx === selected ? 'used' : ''}`}
              onClick={() => handleWordTap(idx)}
              disabled={answered}
              style={{
                borderColor: isSelected  ? T.teal
                           : isCorrect   ? T.teal
                           : isWrong     ? T.coral
                           : T.border,
                background:  isSelected  ? 'rgba(45,212,191,0.2)'
                           : isCorrect   ? 'rgba(45,212,191,0.15)'
                           : isWrong     ? 'rgba(255,122,89,0.15)'
                           : T.card,
                transform: isSelected && !answered ? 'scale(1.08) translateY(-4px)' : undefined,
              }}
            >
              {opt.emoji} {opt.word}
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
      <div style={{ fontSize: '72px', animation: 'mw-bounce 1s ease 0.2s both' }}>🚀</div>

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
          Great work, {childName}! 🌟
        </p>
      )}

      {/* Stars */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.75rem 0' }}>
        {[1, 2, 3].map(s => (
          <span key={s} style={{
            fontSize: '2.5rem',
            opacity: s <= stars ? 1 : 0.15,
            animation: s <= stars ? `mw-pop 0.4s ease ${s * 0.15}s both` : 'none',
          }}>⭐</span>
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
              <span>{wp.emoji}</span>
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
          Keep Going! 🚀
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
          Home 🏠
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
  flash_cards:   'Verbal Imitation',
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

// ─── Main GameEngine ──────────────────────────────────────────────────────────
export function GameEngine({
  sessionPlan,
  gameType     = 'word_match',
  childName,
  onProgress,
  onSessionEnd,
  onHome,
  onXP,
}) {
  useEffect(() => { injectCSS(); }, []);

  // Stop any audio playing when the game is unmounted (session ends / user goes home)
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
    };
  }, []);

  const quizzes        = sessionPlan?.quizzes ?? [];
  const encouragements = sessionPlan?.encouragements ?? ['Great job! ⭐'];

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
      const toastId = Date.now();
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

    const newWordsPlayed = [...wordsPlayed, { word: currentQuiz.word, emoji: currentQuiz.emoji, correct }];
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

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Atkinson Hyperlegible', sans-serif",
    }}>
      <ConfettiBurst active={showConfetti} />
      {xpToast && (
        <div key={xpToast.id} style={{
          position: 'fixed', top: '35%', left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'Space Grotesk', fontSize: '1.5rem', color: '#FFE66D',
          zIndex: 10001, animation: 'xp-float-up 0.9s ease forwards',
          pointerEvents: 'none', textShadow: '0 0 20px rgba(255,184,77,0.8)',
          whiteSpace: 'nowrap',
        }}>
          +{xpToast.amount} XP ⭐
        </div>
      )}

      <SessionProgress
        current={currentIdx + 1}
        total={totalQuizzes}
        correctCount={correctCount}
      />

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
    </div>
  );
}

export default GameEngine;
