// PlacementProbe — Prompt 8: Placement Adventure's single-question
// renderer. Built directly on lessonChrome primitives (NovaPorthole,
// AnswerTile) rather than reusing FindTheWord.jsx/WordHunt.jsx with a
// `placementMode` prop threaded through their errorless-scaffold state
// machines — a deliberate choice (see PLACEMENT_ADVENTURE_REPORT.md's
// CLIENT section): every future edit to those activities' scaffold logic
// would otherwise have to reason about an extra placement branch, and
// the MEASUREMENT EXCEPTION (DESIGN_BRIEF.md §5) is meant to stay fully
// isolated to onboarding, not bleed into the production lesson
// components. This file reuses only the manifest (getLookalikes) and the
// shared visual primitives, not the scaffold behavior.
//
// THE MEASUREMENT EXCEPTION, implemented here: no hint-glow, no second-
// chance completion, and — critically — a miss must be indistinguishable
// in TONE from a hit (only the recorded data differs). The tapped tile
// always gets the same correct-flash glow and the same neutral message
// regardless of whether the tap was actually right or wrong; there is no
// wiggle/soften state anywhere in this component.
import { useEffect, useState } from 'react';
import { colors, fonts } from '../../theme/tokens';
import { playAudio, fetchAudio } from '../../games/gameAudio';
import { IconSpeaker } from '../icons';
import { NovaPorthole, AnswerTile } from '../../games/lessonChrome';
import { getLookalikes } from '../../games/findTheWordManifest';
import WordArt from '../WordArt';

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function PlacementProbe({ probe, onAnswer }) {
  const [answered, setAnswered] = useState(false);
  const [tappedIdx, setTappedIdx] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [novaState, setNovaState] = useState('idle');

  const isPicture = probe.mechanic === 'picture';
  const [optionState] = useState(() => {
    if (isPicture) {
      const options = probe.options;
      return { options, correctIndex: options.indexOf(probe.word) };
    }
    const lookalikes = getLookalikes(probe.word) ?? [];
    const options = shuffled([probe.word, ...lookalikes.slice(0, 3)]);
    return { options, correctIndex: options.indexOf(probe.word) };
  });

  // Find the Word-style probes speak the bare word (audio-first, never
  // displayed as a cue); picture probes show the WordArt image instead
  // and don't need audio to pose the question (matches WordHunt's
  // convention) but still fetch it so the speaker-replay button works.
  useEffect(() => {
    let cancelled = false;
    setAudioUrl(null);
    fetchAudio(probe.word).then((url) => {
      if (cancelled) return;
      if (url) {
        setAudioUrl(url);
        if (!isPicture) playAudio(url);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probe.word]);

  const replayAudio = () => { if (audioUrl) playAudio(audioUrl); };

  function handleTap(idx) {
    if (answered) return;
    setAnswered(true);
    setTappedIdx(idx);
    setNovaState('correct');
    const correct = idx === optionState.correctIndex;
    setTimeout(() => onAnswer(correct), 900);
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <NovaPorthole
            novaState={novaState}
            message={answered ? "Let's try another!" : (isPicture ? 'Which word matches this picture?' : 'Find the word Nova said!')}
          />
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

      {isPicture && (
        <div style={{ textAlign: 'center', margin: '8px 0 28px' }}>
          <WordArt word={probe.word} size={110} style={{ margin: '0 auto' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 560, margin: '0 auto' }}>
        {optionState.options.map((word, idx) => (
          <AnswerTile
            key={idx}
            index={idx}
            onTap={() => handleTap(idx)}
            disabled={answered}
            state={idx === tappedIdx ? 'correct-flash' : undefined}
            minHeight={90}
          >
            <div style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.ink, fontSize: '1.4rem' }}>
              {word}
            </div>
          </AnswerTile>
        ))}
      </div>
    </div>
  );
}
