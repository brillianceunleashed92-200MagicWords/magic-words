// Quiz Boss — app-measured review battle (Prompt 6, Part 4). Replaces the
// old self-rating flashcard flow ("I know it / need practice" — unreliable
// for ages 4-8, and never actually measured anything: it just echoed the
// child's own tap straight back as `correct`). Every question here is a
// real recognition question the app measures:
//   - no art on the target word  -> audio-word, pick-the-word (Find the
//     Word's audio-first mechanic, same look-alike manifest)
//   - has_art on the target word -> picture, pick-the-word (Word Hunt's
//     mechanic, same word_type-based options the shared quiz already
//     carries)
// The battle itself (5-6 previously-encountered words, server-authoritative
// spaced-repetition selection) is just GameEngine's existing per-word loop
// fed a review-only session plan (see PlayScreen.jsx's reviewSessionPlan) —
// no separate internal battle loop needed. The boss is theater: it is
// ALWAYS defeated at the end regardless of accuracy (errorless spirit —
// the child cannot lose the battle), rendered via the shared StarProgress
// meter GameEngine already shows at the top of every isE2Activity screen,
// relabeled here as boss energy. This component adds only a small
// existing-primitive (IconTrophy) impact pulse on each answer — bigger for
// a correct hit, smaller for a miss — visual flavor only, no new mascot.
import { useEffect, useRef, useState } from 'react';
import { colors, fonts } from '../theme/tokens';
import { playAudio, fetchAudio } from './gameAudio';
import { IconSpeaker, IconTrophy } from '../components/icons';
import { NovaPorthole, AnswerTile, ConfettiStars } from './lessonChrome';
import { getLookalikes } from './findTheWordManifest';
import WordArt from '../components/WordArt';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildAudioOptions(word) {
  const lookalikes = getLookalikes(word) ?? [];
  const options = shuffled([word, ...lookalikes.slice(0, 3)]);
  return { options, correctIndex: options.indexOf(word) };
}

export default function QuizBoss({ quiz, onAnswer }) {
  const pictureMode = !!quiz?.pictureEligible;
  const reducedMotion = usePrefersReducedMotion();

  const [optionState, setOptionState] = useState(() =>
    pictureMode
      ? { options: (quiz?.options ?? []).map((o) => o.word), correctIndex: quiz?.correctIndex ?? 0 }
      : buildAudioOptions(quiz?.word)
  );
  const [answered,      setAnswered]      = useState(false);
  const [audioUrl,      setAudioUrl]      = useState(null);
  const [novaState,     setNovaState]     = useState('idle');
  const [message,       setMessage]       = useState(pictureMode ? 'Which word matches this picture?' : 'Find the word Nova said!');
  const [confetti,      setConfetti]      = useState(false);
  const [wrongTileIdx,  setWrongTileIdx]  = useState(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [missedOnce,    setMissedOnce]    = useState(false);
  const [impact,        setImpact]        = useState(null); // 'big' | 'small' | null
  const correctTileRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setOptionState(
      pictureMode
        ? { options: (quiz?.options ?? []).map((o) => o.word), correctIndex: quiz?.correctIndex ?? 0 }
        : buildAudioOptions(quiz?.word)
    );
    setAnswered(false);
    setWrongTileIdx(null);
    setRevealCorrect(false);
    setMissedOnce(false);
    setImpact(null);
    setMessage(pictureMode ? 'Which word matches this picture?' : 'Find the word Nova said!');
    setNovaState('idle');
    startRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.word]);

  useEffect(() => {
    if (!quiz?.word) return;
    let cancelled = false;
    setAudioUrl(null);
    const text = pictureMode ? 'Which word matches this picture?' : quiz.word;
    fetchAudio(text).then((url) => {
      if (cancelled) return;
      if (url) { setAudioUrl(url); playAudio(url); }
    });
    return () => { cancelled = true; };
  }, [quiz?.word, pictureMode]);

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
    setImpact(correct ? 'big' : 'small');
    if (correct) {
      setNovaState('correct');
      setConfetti(true);
      setMessage('Boss hit!');
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

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{
          transform: impact && !reducedMotion ? `scale(${impact === 'big' ? 1.35 : 1.12})` : 'scale(1)',
          transition: 'transform .35s cubic-bezier(.3,1.7,.4,1)',
          filter: impact === 'big' ? 'drop-shadow(0 0 14px rgba(255,197,49,.8))' : 'none',
        }}>
          <IconTrophy size={40} color={colors.sun} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <NovaPorthole novaState={novaState} message={message} />
        </div>
        {!pictureMode && (
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
        )}
      </div>

      {pictureMode && (
        <div style={{ textAlign: 'center', margin: '8px 0 28px' }}>
          <WordArt word={quiz.word} size={110} style={{ margin: '0 auto' }} />
        </div>
      )}

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
