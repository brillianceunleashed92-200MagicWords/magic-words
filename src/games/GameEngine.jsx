// src/games/GameEngine.jsx
// The complete game engine for 200 Magic Words.
// All games read from sessionPlan (pre-generated) — zero AI calls during play.
//
// Live game types (each self-manages its own Candy chrome — see
// `isE2Activity`'s removal note below): word_match, word_hunt, rhyme_time,
// story_builder, flash_cards (QuizBoss), find_the_word, word_builder,
// draw_it, story_time, say_it.
//
// Props:
//   sessionPlan    — from useSessionPlan hook
//   onProgress     — callback({ word, correct, responseTimeMs, gameType })
//   onSessionEnd   — callback({ wordsCorrect, totalWords, timeSpentMs })
//   childName      — for personalized encouragement

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import WordBuilder from './WordBuilder';
import DrawIt from './DrawIt';
import FindTheWord from './FindTheWord';
import QuizBoss from './QuizBoss';
import StoryTimeActivity from './StoryTimeActivity';
import SayItWithNova from './SayItWithNova';
import { audioCache, playAudio, fetchAudio, stopCurrentAudio } from './gameAudio';
import { playCorrectChime, playIncorrectTone } from './soundEffects';
import { getPromptText } from './promptText';
import { useMuted } from '../lib/useMuted';
import { colors, fonts, shadows, skyGradient } from '../theme/tokens';
import WordArt, { WORD_ART_REGISTRY } from '../components/WordArt';
import { IconClose, IconSpeaker, IconStar, IconSpark } from '../components/icons';
import { StarProgress, NovaPorthole, AnswerTile, ConfettiStars, LESSON_CHROME_KEYFRAMES } from './lessonChrome';
import NovaSprite from '../components/candy/NovaSprite';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';
import { SCORELESS_GAME_TYPES } from '../lib/queries/questProgress';

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
// Trimmed Prompt 10: this used to also hold the `.mw-option-btn`/
// `.mw-letter-tile`/`.mw-drag-word`/`.mw-drop-zone` classes and their
// `mw-shake`/`mw-bounce`/`mw-celebrate`/`mw-confetti`/`mw-pulse-glow`/
// `mw-letter-appear`/`mw-word-glow` keyframes — traced every single one to
// a usage site and confirmed all were exclusively inside the now-deleted
// SoundMatch/SpellItOut/SessionProgress/ConfettiBurst/GameTypeSelector.
// `mw-pop` and `mw-slide-up` stay: both are live (StoryBuilder's placed-
// word animation, SessionComplete's entrance + star pop).
const GLOBAL_CSS = `
  @keyframes mw-pop {
    0%   { transform: scale(0.7); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes mw-slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  /* Session Complete — Nova "shining brighter" glow (two concentric rings,
     sun/bubble per DESIGN_BRIEF §1's accent-color roles). Static when
     prefers-reduced-motion (see the JS check gating the animation name). */
  @keyframes session-complete-glow-1 {
    0%, 100% { transform: scale(1);    opacity: .55; }
    50%      { transform: scale(1.12); opacity: .8; }
  }
  @keyframes session-complete-glow-2 {
    0%, 100% { transform: scale(1);    opacity: .35; }
    50%      { transform: scale(1.18); opacity: .6; }
  }
  .session-complete-btn:active {
    transform: translateY(6px) !important;
    box-shadow: 0 2px 0 rgba(0,0,0,.16) !important;
  }
`;

function injectCSS() {
  if (document.getElementById('mw-game-styles')) return;
  const el = document.createElement('style');
  el.id = 'mw-game-styles';
  el.textContent = GLOBAL_CSS + LESSON_CHROME_KEYFRAMES;
  document.head.appendChild(el);
}

// ConfettiBurst and SessionProgress (the pre-Candy-Galaxy orchestrator-level
// chrome for un-rebuilt game types) removed Prompt 10 — every live gameType
// is now E2-rebuilt (self-managed confetti/stage chrome), so the
// `!isE2Activity` branch that rendered these was dead code.
//
// FeedbackOverlay and WordTile (old full-screen-color-wash feedback and
// emoji/legacy-icon word rendering) removed earlier — the 5 E2-rebuilt
// activities use lessonChrome.jsx (tile-level feedback, no full-screen
// overlay ever, per docs/DESIGN_BRIEF.md §7 "no red error states") and
// WordArt.jsx instead.

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

// SoundMatch (un-rebuilt legacy game type, /app-legacy only) removed
// Prompt 10.

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
  // Hint audit (Prompt 7 Part 4): WordHunt had no replay affordance at
  // all before this — the prompt auto-played once on mount with no way
  // to hear it again. Same minimum every other activity already has.
  const [audioUrl, setAudioUrl] = useState(null);
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
    setAudioUrl(null);
    fetchAudio('Which word matches this picture?').then(url => {
      if (cancelled) return;
      if (url) { setAudioUrl(url); playAudio(url); }
    });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const replayAudio = useCallback(() => { if (audioUrl) playAudio(audioUrl); }, [audioUrl]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <NovaPorthole novaState={novaState} message={message} />
        </div>
        <button
          onClick={replayAudio}
          disabled={!audioUrl}
          aria-label="Hear the word again"
          style={{
            width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: audioUrl ? 'pointer' : 'default', opacity: audioUrl ? 1 : 0.5, marginBottom: 20,
          }}
        >
          <IconSpeaker size={20} color={colors.cloud} />
        </button>
      </div>
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
  // Hint audit (Prompt 7 Part 4): same replay gap as WordHunt had.
  const [audioUrl, setAudioUrl] = useState(null);

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
    setAudioUrl(null);
    fetchAudio(`Which word rhymes with ${quiz.word}?`).then(url => {
      if (cancelled) return;
      if (url) { setAudioUrl(url); playAudio(url); }
    });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const replayAudio = useCallback(() => { if (audioUrl) playAudio(audioUrl); }, [audioUrl]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <NovaPorthole novaState={novaState} message={message} />
        </div>
        <button
          onClick={replayAudio}
          disabled={!audioUrl}
          aria-label="Hear the word again"
          style={{
            width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: audioUrl ? 'pointer' : 'default', opacity: audioUrl ? 1 : 0.5, marginBottom: 20,
          }}
        >
          <IconSpeaker size={20} color={colors.cloud} />
        </button>
      </div>
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

// Quiz Boss (app-measured review battle) now lives in ./QuizBoss.jsx — see
// docs/ACTIVITY_ROSTER_REPORT.md QUIZ BOSS section for why the old
// self-rating FlashCardChallenge ("I know it / need practice", which just
// echoed the child's own tap back as `correct` — never actually measured
// anything) was replaced rather than patched.

// ─── ACTIVITY: Fill the Story (StoryBuilder) ───────────────────────────────
// A sentence with a blank — single tap on a chip places it. Errorless
// scaffold matches WordMatch's exact contract (DESIGN_BRIEF §5): a first
// wrong tap wiggles+softens that chip and hint-glows the correct one
// instead of completing the error; only a second miss on the same
// question lets it complete. `has_art` targets show the target word's own
// WordArt as a meaning cue alongside the question (persists through
// answering — there's no separate post-answer reveal moment anymore);
// no-art targets (including every function word, since `pictureEligible`
// is false for those by construction) render exactly as before, cue-free.
function StoryBuilder({ quiz, onAnswer, encouragement }) {
  const [answered,     setAnswered]     = useState(false);
  const [placedIdx,    setPlacedIdx]    = useState(null);
  const [novaState,    setNovaState]    = useState('idle');
  const [message,      setMessage]      = useState('Tap a word to place it');
  const [confetti,     setConfetti]     = useState(false);
  const [wrongChipIdx, setWrongChipIdx] = useState(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [missedOnce,   setMissedOnce]   = useState(false);
  const [audioUrl,     setAudioUrl]     = useState(null);
  const correctChipRef = useRef(null);
  const startRef = useRef(Date.now());
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setAnswered(false);
    setPlacedIdx(null);
    setNovaState('idle');
    setMessage('Tap a word to place it');
    setWrongChipIdx(null);
    setRevealCorrect(false);
    setMissedOnce(false);
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Previously silent — every other activity now speaks a carrier prompt
  // on mount, this one had none at all.
  useEffect(() => {
    setAudioUrl(null);
    fetchAudio(getPromptText(quiz, 'story_builder')).then((url) => {
      if (url) { setAudioUrl(url); playAudio(url); }
    });
  }, [quiz?.word]);

  // Hint audit (Prompt 8 Part 4 housekeeping): the one deferred replay
  // gap flagged in the Prompt 7 polish pass's hint audit -- same pattern
  // as WordHunt/RhymeTime/FindTheWord's speaker button.
  const replayAudio = useCallback(() => { if (audioUrl) playAudio(audioUrl); }, [audioUrl]);

  // quiz.sentence = "Watch Nova ___!"
  // quiz.options = [{word}, ...]
  // quiz.correctIndex = int
  // quiz.pictureEligible = has_art && word_type !== 'function' (server/client both compute this)

  const handleChipTap = async (idx) => {
    if (answered) return;
    const correct = idx === quiz.correctIndex;
    const responseTimeMs = Date.now() - startRef.current;

    if (!correct && !missedOnce) {
      // First miss: wiggle+soften, then hint-glow the correct chip and let
      // the child retry immediately — does not complete the error.
      setMissedOnce(true);
      setWrongChipIdx(idx);
      setMessage("Not quite — try the glowing one!");
      setTimeout(() => {
        setWrongChipIdx(null);
        setRevealCorrect(true);
      }, 450);
      return;
    }

    setAnswered(true);
    setPlacedIdx(idx); // single tap places — spring pop into the blank

    if (correct) {
      // Sound choreography per the audio-consolidation rules: success sound
      // only (no spoken word) at the feedback moment, THEN the completed
      // sentence read aloud once, THEN the celebration — nothing overlaps.
      // handleAnswer (GameEngine's session-level callback) skips its own
      // generic chime for story_builder specifically so this is the only
      // chime played; it still plays the incorrect tone on a wrong answer.
      await playCorrectChime();
      const completedSentence = (quiz.sentence ?? '').replace('___', quiz.word);
      const url = await fetchAudio(completedSentence);
      // Race against a timeout — same guard DrawIt.jsx's word-complete audio
      // uses (docs/DRAW_IT_TRACING_REPORT.md): a backgrounded/suspended tab
      // can leave an Audio element's play() neither resolving, rejecting,
      // nor ever firing 'ended'/'error'. Without this, a stalled read-back
      // clip would permanently block the celebration and onAnswer.
      await Promise.race([
        new Promise((resolve) => {
          const audio = url ? playAudio(url) : null;
          if (!audio) { resolve(); return; }
          audio.onended = resolve;
          audio.onerror = resolve;
        }),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
      setNovaState('correct');
      setConfetti(true);
      setMessage(encouragement ?? `That fits perfectly — "${quiz.word}"!`);
      setTimeout(() => setConfetti(false), 900);
      setTimeout(() => { setNovaState('idle'); onAnswer({ correct: true, responseTimeMs, firstTry: true }); }, 1200);
    } else {
      setMessage(`That's okay — it's "${quiz.word}"!`);
      setTimeout(() => { onAnswer({ correct: false, responseTimeMs, firstTry: true }); }, 1700);
    }
  };

  const parts = (quiz?.sentence ?? '').split('___');
  const showCue = !!quiz?.pictureEligible;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <ConfettiStars active={confetti && !reducedMotion} originRef={correctChipRef} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <NovaPorthole novaState={novaState} message={message} />
        </div>
        <button
          onClick={replayAudio}
          disabled={!audioUrl}
          aria-label="Hear the sentence again"
          style={{
            width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: audioUrl ? 'pointer' : 'default', opacity: audioUrl ? 1 : 0.5, marginBottom: 20,
          }}
        >
          <IconSpeaker size={20} color={colors.cloud} />
        </button>
      </div>

      {/* Picture-as-cue — for has_art targets only, shown WITH the question
          (before answering), not as a post-answer reveal. The child maps
          meaning -> whole word, then confirms by placing the matching
          chip. No-art targets (incl. every function word) render nothing
          here, same as before this rebuild. */}
      {showCue && (
        <div style={{
          display: 'flex', justifyContent: 'center', margin: '0 0 18px',
          animation: reducedMotion ? 'none' : 'mw-pop 0.4s ease',
        }}>
          <div style={{
            background: colors.cloud, borderRadius: 24, padding: 14,
            boxShadow: shadows.chunkSm,
          }}>
            <WordArt word={quiz.word} size={92} />
          </div>
        </div>
      )}

      <div style={{
        textAlign: 'center', margin: '8px 0 24px', fontFamily: fonts.display, fontWeight: 700,
        fontSize: 'clamp(1.2rem,4vw,1.6rem)', color: colors.cloud, lineHeight: 1.8,
      }}>
        <span>{parts[0]}</span>
        <span style={{
          display: 'inline-block', minWidth: 90, padding: '2px 10px', borderRadius: 12,
          borderBottom: `3px solid ${placedIdx !== null ? colors.sun : colors.mint}`,
          color: placedIdx !== null ? colors.sun : colors.mint,
        }}>
          {placedIdx !== null
            ? <span style={{ display: 'inline-block', animation: reducedMotion ? 'none' : 'mw-pop 0.35s cubic-bezier(.2,.9,.3,1.5)' }}>{quiz.options[placedIdx]?.word}</span>
            : '    '}
        </span>
        <span>{parts[1]}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
        {quiz.options.map((opt, idx) => {
          const isCorrectChip = idx === quiz.correctIndex;
          const isWiggleSoften = idx === wrongChipIdx;
          const isHintGlow = (revealCorrect || answered) && isCorrectChip && idx !== placedIdx;
          return (
            <button
              key={idx}
              onClick={() => handleChipTap(idx)}
              disabled={answered}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 100,
                border: 'none', cursor: answered ? 'default' : 'pointer',
                fontFamily: fonts.display, fontWeight: 700, fontSize: '1.05rem', color: colors.ink,
                background: colors.cloud, minHeight: 44,
                boxShadow: isHintGlow
                  ? `${shadows.chunkSm}, 0 0 0 4px rgba(62,224,184,.55), 0 0 20px rgba(62,224,184,.6)`
                  : shadows.chunkSm,
                opacity: isWiggleSoften ? 0.55 : 1,
                filter: isWiggleSoften ? 'saturate(.55)' : 'none',
                transform: idx === placedIdx && !reducedMotion ? 'translateY(-4px) scale(1.05)' : 'none',
                transition: 'transform .2s, opacity .2s, filter .2s, box-shadow .2s',
                animation: reducedMotion
                  ? 'none'
                  : isWiggleSoften ? 'lessonWiggle .45s ease' : isHintGlow ? 'lessonHintPulse 1.4s ease-in-out infinite' : 'none',
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

// SpellItOut (un-rebuilt legacy game type, /app-legacy only) removed
// Prompt 10.

// ─── Session Complete screen ───────────────────────────────────────────────────
// Effort/process praise (Dweck growth-mindset framing — see mission
// "Fix 1"): trait praise ("you're so smart") can undermine persistence,
// effort praise builds it. Varies deterministically by session shape
// (words practiced + correct count) rather than Math.random(), matching
// this codebase's existing purity convention (see WordBuilder.jsx).
const EFFORT_PRAISE = [
  'You worked so hard on those words!',
  'You kept trying until they stuck!',
  'Look how much you practiced!',
  'Your practice is really paying off!',
  'You stuck with it — that’s how words stick!',
];

function pickEffortPraise(wordsCount, correctCount) {
  const idx = (wordsCount * 3 + correctCount) % EFFORT_PRAISE.length;
  return EFFORT_PRAISE[idx];
}

export function SessionComplete({
  correctCount, total, childName, wordsPlayed = [], masteredThisSession = [],
  xpEarned = 0, sparksEarned = 0, masteredCount = 0, totalWordCount = 0,
  gameType, onPlayAgain, onHome,
}) {
  const [confettiActive, setConfettiActive] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  // Bug 3 fix: draw_it/word_builder always report
  // `correct: true` (no real pass/fail — see SCORELESS_GAME_TYPES' own
  // comment in questProgress.js for why each one specifically), so their
  // correctCount/total is always 100% — deriving "3 stars" from that isn't
  // wrong math, it's an honest computation over a value that never varies,
  // which reads as an inflated/fake rating. Same fixed 1-star floor as the
  // guided-path's own per-node summary, so this screen and that one agree.
  const pct   = Math.round((correctCount / total) * 100);
  const stars = SCORELESS_GAME_TYPES.has(gameType) ? 1 : (pct >= 90 ? 3 : pct >= 60 ? 2 : 1);
  const masteredSet = useMemo(() => new Set(masteredThisSession), [masteredThisSession]);
  const effortLine = useMemo(() => pickEffortPraise(wordsPlayed.length, correctCount), [wordsPlayed.length, correctCount]);

  useEffect(() => {
    const t = setTimeout(() => setConfettiActive(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: skyGradient,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      textAlign: 'center',
      animation: 'mw-slide-up 0.4s ease',
      overflowY: 'auto',
    }}>
      <ConfettiStars active={confettiActive && !reducedMotion} />

      {/* Nova, celebrating — porthole treatment per DESIGN_BRIEF §4, with a
          layered sun/bubble glow behind it to read as "Nova is shining
          brighter." Static (no pulse) under reduced-motion; the porthole
          itself still renders. */}
      <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.bubble}55, transparent 70%)`,
          animation: reducedMotion ? 'none' : 'session-complete-glow-2 2.4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 14, borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.sun}66, transparent 70%)`,
          animation: reducedMotion ? 'none' : 'session-complete-glow-1 2.4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'relative', width: 108, height: 108, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, #7A6BF0, ${colors.skyDeep} 70%)`,
          border: '5px solid rgba(255,255,255,.9)', boxShadow: shadows.chunk,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <NovaSprite state="correct" size={92} />
        </div>
      </div>

      <h2 style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 'clamp(1.75rem, 6vw, 2.25rem)',
        color: colors.cloud,
        margin: '0.25rem 0 0.25rem',
      }}>
        Session Complete!
      </h2>

      <p style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: '1rem', color: 'rgba(255,255,255,.85)', margin: '0 0 1rem' }}>
        {childName ? `You powered Nova up, ${childName}!` : 'Amazing work!'}
      </p>

      {/* Stars */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0 0 1.25rem' }}>
        {[1, 2, 3].map(s => (
          <span key={s} style={{
            opacity: s <= stars ? 1 : 0.25,
            animation: s <= stars && !reducedMotion ? `mw-pop 0.4s ease ${s * 0.15}s both` : 'none',
          }}>
            <IconStar size={40} color={colors.sun} />
          </span>
        ))}
      </div>

      {/* Rewards row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, width: '100%', maxWidth: 380 }}>
        <div style={{
          flex: 1, background: colors.cloud, borderRadius: 24, padding: '14px 10px',
          boxShadow: shadows.chunkSm,
        }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.6rem', color: colors.sky }}>
            +{xpEarned}
          </div>
          <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: '.8rem', color: colors.ink, opacity: .7 }}>
            XP earned
          </div>
        </div>
        <div style={{
          flex: 1, background: colors.cloud, borderRadius: 24, padding: '14px 10px',
          boxShadow: shadows.chunkSm,
        }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.6rem', color: colors.sun, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            +{sparksEarned} <IconSpark size={20} color={colors.sun} />
          </div>
          <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: '.8rem', color: colors.ink, opacity: .7 }}>
            Sparks earned
          </div>
        </div>
      </div>

      {/* Words-learned card */}
      {wordsPlayed.length > 0 && (
        <div style={{
          background: colors.cloud, borderRadius: 28, padding: '18px 18px 20px',
          boxShadow: shadows.chunkSm, width: '100%', maxWidth: 380, marginBottom: 20,
        }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '.95rem', color: colors.ink, marginBottom: 12 }}>
            Words you practiced
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            {wordsPlayed.map((wp, i) => {
              const nowShining = masteredSet.has(wp.word);
              return (
                <div key={i} style={{
                  background: nowShining ? `${colors.sun}22` : 'rgba(42,33,96,.05)',
                  border: `1.5px solid ${nowShining ? colors.sun : 'transparent'}`,
                  borderRadius: 999,
                  padding: '4px 12px 4px 4px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <WordArt word={wp.word} size={24} />
                  <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: '.85rem', color: colors.ink }}>
                    {wp.word}
                  </span>
                  {nowShining && <IconStar size={13} color={colors.sun} />}
                </div>
              );
            })}
          </div>
          {totalWordCount > 0 && (
            <>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(42,33,96,.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(100, Math.round((masteredCount / totalWordCount) * 100))}%`,
                  background: colors.sun, borderRadius: 6,
                  transition: reducedMotion ? 'none' : 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: '.8rem', color: colors.ink, opacity: .7, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {masteredCount} / {totalWordCount} words shining <IconStar size={12} color={colors.sun} />
              </div>
            </>
          )}
        </div>
      )}

      <p style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: '.95rem', color: 'rgba(255,255,255,.85)', margin: '0 0 1.75rem', maxWidth: 300 }}>
        {effortLine}
      </p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="session-complete-btn"
          onClick={onPlayAgain}
          style={{
            fontFamily: fonts.display, fontWeight: 700, fontSize: '1.05rem',
            background: colors.mint, color: colors.ink,
            border: 'none', borderRadius: 100, boxShadow: shadows.chunk,
            padding: '0.9rem 2rem', minHeight: 48, cursor: 'pointer',
          }}
        >
          Keep going
        </button>
        <button
          className="session-complete-btn"
          onClick={onHome}
          style={{
            fontFamily: fonts.display, fontWeight: 700, fontSize: '1.05rem',
            background: colors.cloud, color: colors.ink,
            border: 'none', borderRadius: 100, boxShadow: shadows.chunk,
            padding: '0.9rem 2rem', minHeight: 48, cursor: 'pointer',
          }}
        >
          Home
        </button>
      </div>
    </div>
  );
}

// MLC_TYPES/GAME_TYPES/PREMIUM_FEATURES, UpgradeModal, and GameTypeSelector
// (the pre-Candy-Galaxy "choose a game" + paywall screens, /app-legacy
// only) removed Prompt 10. The live paywall surfaces are
// `src/screens/parent/UpgradeBanner.jsx` (real Stripe checkout) and the
// guided path (`src/components/candy/QuestPath.jsx`) picks the activity
// automatically — nothing live ever showed this picker.

// Sprint 2 Part B — activity/word capability check. Word Match, Word Hunt,
// and Rhyme Time all present a word as "the picture" — wrong for a word
// with no real illustration (server already only builds picture-eligible
// distractor sets for these, but a session can still mix eligible/
// ineligible target words across its quiz list depending on what's due
// for review). Story Builder, Flash Cards, and Say It don't depend on a
// picture, so they get the full quiz list unfiltered. `sound_match`
// removed from this set (Prompt 10) — that gameType can no longer occur.
const PICTURE_MATCH_GAME_TYPES = new Set(['word_match', 'word_hunt', 'rhyme_time']);

// ─── Main GameEngine ──────────────────────────────────────────────────────────
export function GameEngine({
  sessionPlan,
  gameType     = 'word_match',
  childName,
  onProgress,
  onSessionEnd,
  onHome,
  onExitEarly,
  onXP,
  userId,
  childId,
}) {
  useEffect(() => { injectCSS(); }, []);

  // Stop any audio playing when the game is unmounted (session ends / user goes home)
  useEffect(() => {
    return () => { stopCurrentAudio(); };
  }, []);

  const [muted, toggleMuted] = useMuted();
  const reducedMotion = usePrefersReducedMotion();

  const allQuizzes = sessionPlan?.quizzes ?? [];
  // Fall back to the unfiltered list only if filtering would leave nothing
  // to play (e.g. a session drawn entirely from function words) — an
  // empty session is a worse outcome than one non-ideal picture quiz.
  const pictureFiltered = allQuizzes.filter((q) => q.pictureEligible);
  const filteredQuizzes = PICTURE_MATCH_GAME_TYPES.has(gameType)
    ? (pictureFiltered.length > 0 ? pictureFiltered : allQuizzes)
    : allQuizzes;
  // Story Time (mission A1): short, frequent sessions beat one long one —
  // capped at 3 stories regardless of how many words the underlying
  // session plan has, so the same "finish the session" pipeline every
  // other activity uses (onXP/onSessionEnd firing once currentIdx reaches
  // the end) naturally fires after the 3rd story instead of the 6-8 a
  // normal session would otherwise run.
  const quizzes = gameType === 'story_time' ? filteredQuizzes.slice(0, 3) : filteredQuizzes;
  const encouragements = sessionPlan?.encouragements ?? ['Great job!'];

  const [currentIdx,        setCurrentIdx]        = useState(0);
  const [correctCount,      setCorrectCount]      = useState(0);
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

  const handleAnswer = useCallback(async ({ correct, responseTimeMs, firstTry = true }) => {
    // XP calculation
    if (correct) {
      let xpEarned = 10;
      if (firstTry) xpEarned += 5;
      if (responseTimeMs < 3000) xpEarned += 5;
      sessionXPRef.current += xpEarned;
      // Prompt 7 Part 3: lingers ~3s now (was 900ms — gone before a
      // parent glancing over could register it). Still pointer-events:
      // none (see the toast's own style below), so it never blocks the
      // next question's input even though it visually persists longer.
      const toastId = ++xpToastIdRef.current;
      setXpToast({ id: toastId, amount: xpEarned });
      setTimeout(() => setXpToast(t => t?.id === toastId ? null : t), 3000);
    }

    const newCorrect = correctCount + (correct ? 1 : 0);
    if (correct) {
      setCorrectCount(newCorrect);
      setConsecutiveCorrect(n => n + 1);
      setConsecutiveWrong(0);
    } else {
      setConsecutiveWrong(n => n + 1);
      setConsecutiveCorrect(0);
    }

    const newWordsPlayed = [...wordsPlayed, { word: currentQuiz.word, correct }];
    setWordsPlayed(newWordsPlayed);

    // Report progress to parent (saves to Supabase). attempt_number is
    // computed by PlayScreen.handleProgress itself from the mutation's own
    // return value (FEAT_PEDAGOGY_CALIBRATION_R1 Phase 4) — this used to
    // pass a hardcoded, never-read `attemptNumber: 1` here, which looked
    // wired but wasn't.
    onProgress?.({
      word:          currentQuiz.word,
      correct,
      responseTimeMs,
      gameType,
    });

    setEncouragIdx(i => i + 1);

    // Sound choreography — correct answer plays a SOUND ONLY, no spoken
    // word (mission "audio consolidation" Bug 2). An earlier pass here
    // also spoke Nova's encouragement text after the chime; that was
    // pulled back out — per this pass's own instructions, a fuller
    // "chime -> Nova -> next question" choreography + mute toggle is a
    // later prompt, and until then correct-answer audio should be just
    // the success sound, cleanly, with nothing else layered on top. The
    // encouragement STRING itself is unused here now, but stays visible
    // as on-screen text via each activity's own `encouragement` prop
    // (e.g. WordMatch's Nova speech bubble) — only the SPOKEN version is
    // removed. Awaited before advancing so the next question's own
    // auto-play (each activity's mount effect) never starts until the
    // chime has actually finished — still routed through soundEffects.js's
    // oscillator Promise, so nothing here can overlap other audio.
    //
    // story_builder is the one exception on the correct path: it plays its
    // own success chime BEFORE the read-back sentence (Fill the Story
    // rebuild's "sound -> read-back -> celebration" sequence), so this
    // generic chime would be a duplicate/second sound layered after the
    // read-back if it also fired here. The incorrect path is untouched —
    // story_builder still has no read-back on a wrong answer, so the
    // shared tone stays exactly as it is for every activity.
    if (correct) {
      if (gameType !== 'story_builder' && gameType !== 'draw_it') await playCorrectChime();
    } else {
      await playIncorrectTone();
    }

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

  // Universal exit-that-saves (mission B3): every activity's close button
  // routes here instead of calling onHome directly. Hands whatever
  // progress has accumulated so far — correct count, words actually
  // played this session, and XP earned (deliberately NOT the +20
  // completion / +50 perfect bonuses handleAnswer's natural-end path
  // adds, since the session didn't actually finish) — to PlayScreen's
  // onExitEarly, which banks it through the same shared pipeline
  // (learning_events already wrote per-question; this awards XP/Sparks,
  // runs the same path-completion check onSessionEnd uses, and awaits
  // every pending write) BEFORE navigating away. Does not call onHome
  // itself — onExitEarly is responsible for navigating once its async
  // banking work is done, so nothing can race ahead of an in-flight write.
  const handleExitEarly = useCallback(async () => {
    stopCurrentAudio();
    if (!onExitEarly) { onHome?.(); return; }
    await onExitEarly({
      wordsCorrect: correctCount,
      totalWords: totalQuizzes,
      wordsPlayed,
      partialXP: sessionXPRef.current,
      gameType,
    });
  }, [onExitEarly, onHome, correctCount, totalQuizzes, wordsPlayed, gameType]);

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
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: `${colors.ink}99`, fontFamily: 'Atkinson Hyperlegible' }}>
        No quizzes loaded. Please check your session plan.
      </div>
    );
  }

  // Every live gameType is E2-rebuilt (self-manages its own confetti/stage
  // background, candy sky gradient, see docs/mockup-E2-no-emoji.html) —
  // the `isE2Activity` flag + `!isE2Activity` orchestrator-level chrome
  // (ConfettiBurst, SessionProgress, T.bg) it used to fall back to for
  // un-rebuilt legacy game types (SoundMatch, SpellItOut) was removed
  // Prompt 10 alongside those types themselves.

  return (
    <div style={{
      minHeight: '100vh',
      background: skyGradient,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: fonts.body,
    }}>
      {xpToast && (
        <div key={xpToast.id} style={{
          position: 'fixed', top: '35%', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.sun,
          zIndex: 10001, animation: reducedMotion ? 'none' : 'xp-float-up 3s ease forwards',
          pointerEvents: 'none', textShadow: '0 0 20px rgba(255,184,77,0.8)',
          whiteSpace: 'nowrap',
        }}>
          +{xpToast.amount} XP <IconStar size={20} color={colors.sun} />
        </div>
      )}

      <div style={{ maxWidth: 780, margin: '0 auto', width: '100%', padding: '28px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={handleExitEarly}
            aria-label="Exit and save progress"
            style={{
              width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
            }}
          >
            <IconClose size={20} color={colors.cloud} />
          </button>
          <StarProgress current={currentIdx + 1} total={totalQuizzes} />
          <button
            onClick={() => toggleMuted(!muted)}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            style={{
              width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
            }}
          >
            <IconSpeaker size={18} color={colors.cloud} muted={muted} />
          </button>
        </div>
      </div>

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
        <QuizBoss key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'find_the_word' && (
        <FindTheWord key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'story_builder' && (
        <StoryBuilder
          key={currentIdx}
          quiz={currentQuiz}
          onAnswer={handleAnswer}
          encouragement={encouragements[encouragIdx % encouragements.length]}
        />
      )}
      {gameType === 'word_builder' && (
        <WordBuilder key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
      {gameType === 'draw_it' && (
        <DrawIt key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} encouragement={encouragements[encouragIdx % encouragements.length]} />
      )}
      {gameType === 'story_time' && (
        <StoryTimeActivity key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} onExit={handleExitEarly} />
      )}
      {gameType === 'say_it' && (
        <SayItWithNova key={currentIdx} quiz={currentQuiz} onAnswer={handleAnswer} />
      )}
    </div>
  );
}

export default GameEngine;
