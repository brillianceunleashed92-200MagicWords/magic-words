import { useState } from 'react';
import { createPortal } from 'react-dom';
import { colors, fonts, shadows, skyGradient } from '../../theme/tokens';
import NovaPortrait from './NovaPortrait';
import { useSpeak } from '../../lib/useSpeak';

// Shared full-screen storybook reader — one sentence per page, every word
// tappable (speaks), target word glows, Nova reading-pose cover, ends with
// an optional one-question comprehension check. Used by both the "Story
// Time" MLC activity (a simple local fallback story, Step 2) and the real
// AI Story Engine (Step 3) — same reading UI either way, only the story
// content's source differs.
export default function StoryReader({ story, onComplete }) {
  const [page, setPage] = useState(-1); // -1 = cover
  const [answered, setAnswered] = useState(false);
  const { speak } = useSpeak();
  const totalPages = story.sentences.length;
  const onLastPage = page === totalPages - 1;
  const hasQuestion = !!story.comprehensionQuestion;

  function speakWord(word) {
    speak(word.replace(/[^a-zA-Z']/g, ''));
  }

  function renderSentence(sentence) {
    return sentence.split(' ').map((word, i) => {
      const clean = word.replace(/[^a-zA-Z']/g, '');
      const isTarget = clean.toLowerCase() === story.targetWord.toLowerCase();
      return (
        <span
          key={i}
          onClick={() => speakWord(word)}
          style={{
            cursor: 'pointer', marginRight: 10, display: 'inline-block',
            color: isTarget ? colors.tang : colors.ink,
            fontWeight: isTarget ? 800 : 500,
            textShadow: isTarget ? `0 0 12px ${colors.tang}55` : 'none',
          }}
        >
          {word}
        </span>
      );
    });
  }

  return createPortal(
    <div className="candy-galaxy" style={{ position: 'fixed', inset: 0, zIndex: 9990, background: skyGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: colors.cloud, borderRadius: 32, padding: '2rem', maxWidth: 420, width: '100%', minHeight: 320, boxShadow: shadows.chunkLg, textAlign: 'center' }}>
        {page === -1 && (
          <>
            <NovaPortrait pose="read" size={140} style={{ margin: '0 auto 1rem' }} />
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.ink, marginBottom: '1.5rem' }}>
              {story.title}
            </div>
            <button onClick={() => setPage(0)} style={{
              background: colors.mint, color: colors.mintDeep, border: 'none', borderRadius: 100,
              padding: '0.85rem 2rem', fontFamily: fonts.display, fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
            }}>
              ▶ Start reading
            </button>
          </>
        )}

        {page >= 0 && page < totalPages && (
          <>
            <div style={{ fontFamily: fonts.body, fontSize: '1.4rem', lineHeight: 1.6, color: colors.ink, minHeight: 100 }}>
              {renderSentence(story.sentences[page])}
            </div>
            <div style={{ color: colors.mutedInk, fontSize: '.8rem', margin: '1rem 0' }}>
              Page {page + 1} of {totalPages}
            </div>
            <button
              onClick={() => {
                if (onLastPage && !hasQuestion) onComplete();
                else setPage((p) => p + 1);
              }}
              style={{
                background: colors.sky, color: '#fff', border: 'none', borderRadius: 100,
                padding: '0.75rem 1.75rem', fontFamily: fonts.display, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {onLastPage && !hasQuestion ? 'Finish' : 'Next →'}
            </button>
          </>
        )}

        {page === totalPages && hasQuestion && !answered && (
          <>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.15rem', color: colors.ink, marginBottom: '1.25rem' }}>
              {story.comprehensionQuestion.question}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {story.comprehensionQuestion.choices.map((choice, i) => (
                <button
                  key={choice}
                  onClick={() => { setAnswered(true); setTimeout(() => onComplete(i === story.comprehensionQuestion.correctIndex), 900); }}
                  style={{
                    background: 'rgba(0,0,0,.05)', border: 'none', borderRadius: 16, padding: '0.85rem',
                    fontFamily: fonts.body, fontSize: '1rem', color: colors.ink, cursor: 'pointer',
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
          </>
        )}

        {answered && (
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.2rem', color: colors.mintDeep }}>
            Great reading! ⭐
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
