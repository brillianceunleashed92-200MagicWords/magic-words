// Find the Word — replaces Word Song (Prompt 6, Part 3). Dr. Blank's own
// technique: Nova SAYS the whole word once on mount (audio-first — the
// word is never displayed as a cue anywhere on screen, only heard); the
// child finds it among 3 look-alike REAL words in a 2x2 text grid. No
// phonics, no letter-level hinting — the only hint is replaying the word
// audio via the speaker button. Same shared chrome + errorless scaffold
// contract as WordMatch/WordHunt (wiggle+soften on first miss, hint-glow
// the correct tile, second miss completes).
//
// Distractors come from FIND_THE_WORD_LOOKALIKES (findTheWordManifest.js),
// NOT from quiz.options — the shared quiz object's options are selected by
// word_type/unit (right for a picture-match/sentence-fill task, wrong
// here: this activity needs orthographically similar real words, a
// completely different selection criterion), so it builds its own option
// set client-side from the target word alone.
import { useEffect, useRef, useState } from 'react';
import { colors, fonts } from '../theme/tokens';
import { playAudio, fetchAudio } from './gameAudio';
import { IconSpeaker } from '../components/icons';
import { NovaPorthole, AnswerTile, ConfettiStars } from './lessonChrome';
import { getLookalikes } from './findTheWordManifest';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildOptions(word) {
  const lookalikes = getLookalikes(word) ?? [];
  const options = shuffled([word, ...lookalikes.slice(0, 3)]);
  return { options, correctIndex: options.indexOf(word) };
}

export default function FindTheWord({ quiz, onAnswer }) {
  const [optionState,  setOptionState]  = useState(() => buildOptions(quiz?.word));
  const [answered,      setAnswered]      = useState(false);
  const [audioUrl,      setAudioUrl]      = useState(null);
  const [novaState,     setNovaState]     = useState('idle');
  const [message,       setMessage]       = useState('Find the word Nova said!');
  const [confetti,      setConfetti]      = useState(false);
  const [wrongTileIdx,  setWrongTileIdx]  = useState(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [missedOnce,    setMissedOnce]    = useState(false);
  const correctTileRef = useRef(null);
  const startRef = useRef(Date.now());
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setOptionState(buildOptions(quiz?.word));
    setAnswered(false);
    setWrongTileIdx(null);
    setRevealCorrect(false);
    setMissedOnce(false);
    setMessage('Find the word Nova said!');
    setNovaState('idle');
    startRef.current = Date.now();
  }, [quiz?.word]);

  // The question audio IS the target word, spoken in isolation — the
  // deliberate exception to every other activity's carrier-sentence
  // convention (see promptText.js). This is the whole task: Nova says
  // the word, the child recognizes it among look-alikes.
  useEffect(() => {
    if (!quiz?.word) return;
    let cancelled = false;
    setAudioUrl(null);
    fetchAudio(quiz.word).then((url) => {
      if (cancelled) return;
      if (url) { setAudioUrl(url); playAudio(url); }
    });
    return () => { cancelled = true; };
  }, [quiz?.word]);

  const replayAudio = () => { if (audioUrl) playAudio(audioUrl); };

  const handleTap = (idx) => {
    if (answered) return;
    const correct = idx === optionState.correctIndex;
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
      setMessage('Found it!');
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
      <ConfettiStars active={confetti && !reducedMotion} originRef={correctTileRef} />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 560, margin: '0 auto' }}>
        {optionState.options.map((word, idx) => {
          const isCorrectTile = idx === optionState.correctIndex;
          let state;
          if (idx === wrongTileIdx) state = 'wiggle-soften';
          else if (revealCorrect && isCorrectTile) state = 'hint-glow';
          else if (answered && isCorrectTile) state = 'correct-flash';
          return (
            <AnswerTile key={idx} index={idx} onTap={() => handleTap(idx)} disabled={answered} state={state} minHeight={90}>
              <div ref={isCorrectTile ? correctTileRef : undefined} style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.ink, fontSize: '1.4rem' }}>
                {word}
              </div>
            </AnswerTile>
          );
        })}
      </div>
    </div>
  );
}
