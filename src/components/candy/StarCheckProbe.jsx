// StarCheckProbe — The Star Check's single-probe renderer. A SEPARATE
// component from PlacementProbe.jsx (scope wall for this run: that file
// is v1's and must not be touched), but implements the identical
// measurement exception (DESIGN_BRIEF_V2.md): the tapped tile always gets
// the same neutral "correct-flash" treatment regardless of actual
// correctness, and the target word is spoken via TTS, never printed as a
// heading/prompt — it only ever appears as one of the tile options
// themselves (unavoidable for a look-alike read-the-word probe; the
// meaning probe never prints it at all, only pictures).
import { useEffect, useState } from 'react';
import { colors, fonts } from '../../theme/tokens';
import { playAudio, fetchAudio } from '../../games/gameAudio';
import { IconSpeaker } from '../icons';
import { NovaPorthole, AnswerTile } from '../../games/lessonChrome';
import { STAR_CHECK_PICS } from '../../lib/starCheckIcons';

export default function StarCheckProbe({ probe, onAnswer }) {
  const [answered, setAnswered] = useState(false);
  const [tappedIdx, setTappedIdx] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [novaState, setNovaState] = useState('idle');

  const isMeaning = probe.mechanic === 'meaning';

  useEffect(() => {
    let cancelled = false;
    setAnswered(false);
    setTappedIdx(null);
    setAudioUrl(null);
    setNovaState('idle');
    if (!probe.vo) return undefined;
    fetchAudio(probe.vo).then((url) => {
      if (cancelled) return;
      if (url) { setAudioUrl(url); playAudio(url); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probe.vo, probe.word, probe.mechanic]);

  const replayAudio = () => { if (audioUrl) playAudio(audioUrl); };

  function handleTap(idx, option) {
    if (answered) return;
    setAnswered(true);
    setTappedIdx(idx);
    setNovaState('correct');
    const correct = option === probe.word;
    setTimeout(() => onAnswer(correct), 900);
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', marginBottom: 6 }}>
        Level {probe.level} · word {probe.wordNumber} of {probe.totalWords} · {isMeaning ? 'meaning probe' : 'look-alike probe'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <NovaPorthole
            novaState={novaState}
            message={answered ? "Let's try another!" : (isMeaning ? 'Listen and find the word!' : 'Listen close — this one is tricky!')}
          />
        </div>
        <button
          onClick={replayAudio}
          disabled={!audioUrl}
          aria-label="Hear it again"
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
        {probe.options.map((option, idx) => (
          <AnswerTile
            key={idx}
            index={idx}
            onTap={() => handleTap(idx, option)}
            disabled={answered}
            state={idx === tappedIdx ? 'correct-flash' : undefined}
            minHeight={isMeaning ? 130 : 90}
          >
            {isMeaning && STAR_CHECK_PICS[option] ? (
              // Static, build-generated SVG markup (scripts/extract-star-check-icons.mjs),
              // never user input — safe to inject directly.
              <div style={{ width: 80, height: 80, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: STAR_CHECK_PICS[option] }} />
            ) : (
              <div style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.ink, fontSize: '1.4rem' }}>
                {option}
              </div>
            )}
          </AnswerTile>
        ))}
      </div>
    </div>
  );
}
