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

// ─── Audio cache — word → blob URL, survives React re-renders ────────────────
const audioCache    = new Map(); // word → blob URL string
const audioFetching = new Map(); // word → Promise (in-flight dedup)

function fetchAudio(word) {
  if (!word) return Promise.resolve(null);
  if (audioCache.has(word)) return Promise.resolve(audioCache.get(word));
  if (audioFetching.has(word)) return audioFetching.get(word);

  const promise = fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  })
    .then(res => (res.ok ? res.blob() : null))
    .then(blob => {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      audioCache.set(word, url);
      return url;
    })
    .catch(() => null)
    .finally(() => audioFetching.delete(word));

  audioFetching.set(word, promise);
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

// ─── Design tokens (matches your existing theme) ──────────────────────────────
const T = {
  bg:      '#0F0A1E',
  teal:    '#4ECDC4',
  gold:    '#FFE66D',
  coral:   '#FF6B6B',
  pink:    '#FF8B94',
  purple:  '#7B68EE',
  white:   'rgba(255,255,255,0.95)',
  muted:   'rgba(255,255,255,0.55)',
  card:    'rgba(255,255,255,0.06)',
  cardHov: 'rgba(255,255,255,0.12)',
  border:  'rgba(255,255,255,0.12)',
  correct: '#4ECDC4',
  wrong:   '#FF6B6B',
};

// ─── Shared CSS injected once ─────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;900&display=swap');

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
    0%, 100% { box-shadow: 0 0 0 0 rgba(78,205,196,0); }
    50%       { box-shadow: 0 0 0 12px rgba(78,205,196,0.2); }
  }
  @keyframes mw-letter-appear {
    from { transform: scale(0) rotate(-15deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes mw-word-glow {
    0%, 100% { text-shadow: 0 0 20px rgba(78,205,196,0.3); }
    50%       { text-shadow: 0 0 40px rgba(78,205,196,0.8), 0 0 60px rgba(78,205,196,0.4); }
  }

  .mw-option-btn {
    background: ${T.card};
    border: 2px solid ${T.border};
    border-radius: 20px;
    cursor: pointer;
    transition: transform 0.15s, background 0.15s, border-color 0.15s;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 110px;
    font-family: 'Nunito', sans-serif;
    color: ${T.white};
    -webkit-tap-highlight-color: transparent;
  }
  .mw-option-btn:hover:not(:disabled) {
    background: ${T.cardHov};
    border-color: rgba(255,255,255,0.25);
    transform: translateY(-2px) scale(1.02);
  }
  .mw-option-btn:active:not(:disabled) {
    transform: scale(0.96);
  }
  .mw-option-btn.correct {
    background: rgba(78,205,196,0.2);
    border-color: ${T.correct};
    animation: mw-bounce 0.5s ease;
  }
  .mw-option-btn.wrong {
    background: rgba(255,107,107,0.2);
    border-color: ${T.wrong};
    animation: mw-shake 0.4s ease;
  }
  .mw-option-btn.revealed {
    background: rgba(78,205,196,0.1);
    border-color: rgba(78,205,196,0.4);
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
    font-family: 'Fredoka One', cursive;
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
    background: rgba(78,205,196,0.25);
    border-color: ${T.teal};
    animation: mw-letter-appear 0.2s ease;
  }
  .mw-letter-tile.wrong-tile {
    background: rgba(255,107,107,0.25);
    border-color: ${T.coral};
    animation: mw-shake 0.3s ease;
  }

  .mw-drag-word {
    background: ${T.card};
    border: 2px solid ${T.border};
    border-radius: 50px;
    padding: 0.5rem 1.25rem;
    font-family: 'Fredoka One', cursive;
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
    font-family: 'Fredoka One', cursive;
    font-size: 1.3rem;
    color: ${T.teal};
    vertical-align: bottom;
    transition: background 0.15s;
  }
  .mw-drop-zone.over { background: rgba(78,205,196,0.15); border-radius: 8px 8px 0 0; }
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
        <span style={{ fontFamily: 'Fredoka One', color: T.teal, fontSize: '0.9rem' }}>
          Word {current} of {total}
        </span>
        <span style={{ fontFamily: 'Fredoka One', color: T.gold, fontSize: '1.125rem' }}>
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
              background: (done || active) ? T.teal : 'rgba(255,255,255,0.1)',
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
        ? 'rgba(78,205,196,0.18)'
        : 'rgba(255,107,107,0.18)',
      backdropFilter: 'blur(4px)',
      animation: 'mw-pop 0.3s ease',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: '80px', animation: 'mw-celebrate 0.6s ease' }}>{emoji}</div>
      <div style={{
        fontFamily: 'Fredoka One',
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

// ─── Word tile: Unsplash image for content words, emoji fallback ──────────────
function WordTile({ word, emoji, wordClass }) {
  const [imgError,  setImgError]  = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isContent = wordClass !== 'function' && !(_WORD_CLASS_MAP[word] === 'function');

  if (!isContent || imgError) {
    return <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>{emoji}</span>;
  }
  return (
    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0 }}>
      {!imgLoaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '14px',
          animation: 'mw-pulse-glow 1s ease-in-out infinite',
        }} />
      )}
      <img
        src={`https://picsum.photos/seed/${encodeURIComponent(word)}/160/160`}
        alt={word}
        style={{ width: '80px', height: '80px', objectFit: 'cover', display: imgLoaded ? 'block' : 'none' }}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
      />
    </div>
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
  const startRef = useRef(Date.now());

  // Reset game state immediately — never wait for audio
  useEffect(() => {
    setSelected(null);
    setAnswered(false);
    setShowOverlay(false);
    setOverlayData(null);
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Fetch audio separately — UI is never blocked if audio is slow or fails
  useEffect(() => {
    if (!quiz?.word) return;
    let cancelled = false;
    setAudioUrl(null);
    setAudioLoading(true);
    fetchAudio(quiz.word)
      .then(url => {
        if (cancelled) return;
        setAudioLoading(false);
        if (url) {
          setAudioUrl(url);
          new Audio(url).play().catch(() => {});
        }
      })
      .catch(() => { if (!cancelled) setAudioLoading(false); });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const replayAudio = useCallback(() => {
    if (audioUrl) new Audio(audioUrl).play().catch(() => {});
  }, [audioUrl]);

  const handleTap = useCallback((idx) => {
    if (answered) return;
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;
    setSelected(idx);
    setAnswered(true);
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
      if (!correct) {
        // Replay word audio so child hears it again, then hold on the correct tile for 600ms
        const url = audioCache.get(quiz.word);
        if (url) new Audio(url).play().catch(() => {});
        setTimeout(() => onAnswer({ correct, responseTimeMs }), 600);
      } else {
        onAnswer({ correct, responseTimeMs });
      }
    }, 1400);
  }, [answered, quiz, onAnswer, encouragement]);

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
      <div style={{ padding: '0 1.5rem 1.5rem', animation: 'mw-slide-up 0.35s ease' }}>
        {/* Target word + replay button */}
        <div style={{ textAlign: 'center', margin: '1.5rem 0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <div style={{
              fontFamily: 'Fredoka One',
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
                background: 'rgba(78,205,196,0.12)',
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
            fontFamily: 'Nunito',
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
            // FIX 7: hint — pulse on correct tile after 2 consecutive wrong
            const hintStyle = showHint && !answered && isCorrectTile
              ? { animation: 'mw-pulse-glow 0.8s ease-in-out infinite', borderColor: 'rgba(78,205,196,0.5)' }
              : {};
            return (
              <button
                key={idx}
                className={className}
                onClick={() => handleTap(idx)}
                disabled={answered}
                style={{
                  animationDelay: (idx * 0.07) + 's',
                  cursor: answered ? 'default' : 'pointer',
                  ...hintStyle,
                }}
              >
                <WordTile word={opt.word} emoji={opt.emoji} wordClass={quiz.wordClass} />
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
    const audio = new Audio(audioUrl);
    audio.play().then(() => {
      setAudioPlayed(true);
      startRef.current = Date.now();
    }).catch(() => {
      setAudioError(true);
      setAudioPlayed(true);
      startRef.current = Date.now();
    });
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
            background: audioPlayed ? 'rgba(78,205,196,0.15)' : 'rgba(78,205,196,0.25)',
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
            fontFamily: 'Fredoka One',
            fontSize: '2.5rem',
            color: T.teal,
            marginTop: '1rem',
          }}>{quiz.word}</div>
        )}

        <div style={{
          fontFamily: 'Nunito',
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
        fontFamily: 'Fredoka One',
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
        fontFamily: 'Nunito',
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
                background:  isSelected  ? 'rgba(78,205,196,0.2)'
                           : isCorrect   ? 'rgba(78,205,196,0.15)'
                           : isWrong     ? 'rgba(255,107,107,0.15)'
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
        <p style={{ fontFamily: 'Nunito', color: T.muted, fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
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
              background: isTyped ? 'rgba(78,205,196,0.2)' : 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fredoka One',
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
              background: 'rgba(255,107,107,0.15)', border: `2px solid ${T.coral}`,
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
        fontFamily: 'Fredoka One',
        fontSize: 'clamp(2rem, 6vw, 2.75rem)',
        color: T.gold,
        margin: '0.75rem 0 0.25rem',
        textShadow: `0 0 30px ${T.gold}88`,
      }}>
        Session Complete!
      </h2>

      {childName && (
        <p style={{ fontFamily: 'Nunito', fontSize: '1rem', color: T.muted, margin: '0 0 0.75rem' }}>
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

      <p style={{ fontFamily: 'Fredoka One', fontSize: '1.3rem', color: T.white, margin: '0.25rem 0 1.25rem' }}>
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
              background: wp.correct ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,107,0.1)',
              border: `1.5px solid ${wp.correct ? T.teal : T.coral}`,
              borderRadius: '50px',
              padding: '0.25rem 0.75rem',
              fontFamily: 'Nunito',
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

      <p style={{ fontFamily: 'Nunito', fontSize: '0.95rem', color: T.muted, margin: '0 0 2rem', maxWidth: '260px' }}>
        {encouragement}
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onPlayAgain}
          style={{
            fontFamily: 'Fredoka One',
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
            fontFamily: 'Fredoka One',
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
const GAME_TYPES = [
  { id: 'word_match',    label: 'Word Match',    emoji: '👀', desc: 'See the word, tap the picture',   color: T.teal,   available: true  },
  { id: 'sound_match',  label: 'Sound Match',   emoji: '🔊', desc: 'Hear the word, tap the picture',  color: T.purple, available: false },
  { id: 'story_builder',label: 'Story Builder', emoji: '📖', desc: 'Complete the sentence',           color: T.gold,   available: false },
  { id: 'spell_it_out', label: 'Spell It Out',  emoji: '🔤', desc: 'Tap the letters to spell it',    color: T.pink,   available: false },
];

const PREMIUM_FEATURES = [
  '🔊 Sound Match — hear and tap',
  '📖 Story Builder — fill the blank',
  '🔤 Spell It Out — letter tiles',
  '📚 Units 6–18 unlocked',
  '📊 Advanced parent analytics',
];

function UpgradeModal({ onClose }) {
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }} onClick={onClose}>
      <div style={{
        background: '#1A1030',
        border: `2px solid ${T.gold}`,
        borderRadius: '24px',
        padding: '2rem 1.75rem',
        maxWidth: '340px',
        width: '100%',
        textAlign: 'center',
        animation: 'mw-pop 0.3s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>🌟</div>
        <h3 style={{ fontFamily: 'Fredoka One', fontSize: '1.5rem', color: T.gold, margin: '0 0 0.25rem' }}>
          Go Premium
        </h3>
        <p style={{ fontFamily: 'Nunito', fontSize: '0.875rem', color: T.muted, margin: '0 0 1.25rem' }}>
          Unlock all games and every word unit:
        </p>
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          {PREMIUM_FEATURES.map((f, i) => (
            <div key={i} style={{
              fontFamily: 'Nunito', fontSize: '0.9rem', color: T.white,
              padding: '0.35rem 0', borderBottom: i < PREMIUM_FEATURES.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>{f}</div>
          ))}
        </div>
        <button style={{
          width: '100%',
          fontFamily: 'Fredoka One', fontSize: '1rem',
          background: `linear-gradient(135deg, ${T.gold}, #FFB300)`,
          color: '#1A0A00', border: 'none', borderRadius: '50px',
          padding: '0.875rem 1rem', cursor: 'not-allowed', opacity: 0.7,
        }}>
          Start Free Trial — $9.99/mo
        </button>
        <p style={{ fontFamily: 'Nunito', fontSize: '0.75rem', color: T.muted, margin: '0.75rem 0 0' }}>
          Coming soon — we'll let you know!
        </p>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: T.muted,
          fontFamily: 'Nunito', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.75rem',
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

  return (
    <div style={{ padding: '1.5rem', animation: 'mw-slide-up 0.3s ease' }}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      <h2 style={{
        fontFamily: 'Fredoka One',
        fontSize: '1.5rem',
        color: T.white,
        textAlign: 'center',
        margin: '0 0 1.25rem',
      }}>
        Choose a Game ✨
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
        {GAME_TYPES.map(game => {
          const isUnlocked = unlockedGames.includes(game.id);
          return (
            <button
              key={game.id}
              className="mw-option-btn"
              onClick={() => isUnlocked ? onSelect(game.id) : setShowUpgrade(true)}
              style={{
                minHeight: '120px',
                opacity: isUnlocked ? 1 : 0.6,
                borderColor: isUnlocked ? game.color : T.border,
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {!isUnlocked && (
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: `${T.gold}22`,
                  border: `1px solid ${T.gold}88`,
                  borderRadius: '20px',
                  padding: '2px 8px',
                  fontSize: '0.65rem',
                  color: T.gold,
                  fontFamily: 'Nunito',
                  fontWeight: 700,
                }}>🔒 Premium</div>
              )}
              <span style={{ fontSize: '2.25rem' }}>{game.emoji}</span>
              <span style={{ fontFamily: 'Fredoka One', fontSize: '0.95rem', color: isUnlocked ? T.white : T.muted }}>
                {game.label}
              </span>
              <span style={{ fontFamily: 'Nunito', fontSize: '0.75rem', color: T.muted, textAlign: 'center', lineHeight: 1.3 }}>
                {game.desc}
              </span>
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
}) {
  useEffect(() => { injectCSS(); }, []);

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
  const sessionStartRef = useRef(Date.now());

  const currentQuiz = quizzes[currentIdx];
  const totalQuizzes = quizzes.length;

  // Pre-fetch ALL session words' audio in parallel at session start
  useEffect(() => {
    quizzes.forEach(q => { if (q?.word) fetchAudio(q.word); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback(({ correct, responseTimeMs }) => {
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
      setSessionDone(true);
      onSessionEnd?.({
        wordsCorrect: newCorrect,
        totalWords:   totalQuizzes,
        timeSpentMs:  Date.now() - sessionStartRef.current,
        wordsPlayed:  newWordsPlayed,
      });
    } else {
      setCurrentIdx(i => i + 1);
    }
  }, [correctCount, wordsPlayed, currentQuiz, currentIdx, totalQuizzes, gameType, onProgress, onSessionEnd]);

  const handlePlayAgain = () => {
    setCurrentIdx(0);
    setCorrectCount(0);
    setSessionDone(false);
    setConsecutiveCorrect(0);
    setConsecutiveWrong(0);
    setWordsPlayed([]);
    sessionStartRef.current = Date.now();
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
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: T.muted, fontFamily: 'Nunito' }}>
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
      fontFamily: 'Nunito, sans-serif',
    }}>
      <ConfettiBurst active={showConfetti} />

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
          showHint={consecutiveWrong >= 2}
        />
      )}
      {gameType === 'sound_match' && (
        <SoundMatch
          key={currentIdx}
          quiz={currentQuiz}
          onAnswer={handleAnswer}
          audioUrl={currentQuiz.audioUrl ?? null}
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
