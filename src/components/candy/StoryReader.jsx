import { useState } from 'react';
import { createPortal } from 'react-dom';
import { colors, fonts, shadows, skyGradient } from '../../theme/tokens';
import NovaPortrait from './NovaPortrait';
import { useWordSpeak } from '../../lib/useWordSpeak';
import { useKaraokeNarration } from './useKaraokeNarration';
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';
import { useSpeak } from '../../lib/useSpeak';
import { IconSpeaker, IconClose } from '../icons';

// Shared full-screen storybook reader — one sentence per page, read aloud
// with karaoke-style word highlighting, every word also individually
// tappable (speaks it again), target word glows, Nova reading-pose cover,
// ends with an optional one-question comprehension check whose answers
// stay locked until narration finishes. Used by both the "Story Time" MLC
// activity (guided-path, capped at 3 stories per session — see
// StoryTimeActivity.jsx) and the real AI Story Engine ("New Story
// Friday") — same reading UI either way, only the story content's source
// differs.
//
// `words` (optional — the full tracked-word list with audio_url) lets
// tapped individual words play real ElevenLabs audio instead of Web
// Speech synthesis; a story word with no match (e.g. the child's own
// name) falls back to synthesis automatically. Full-sentence narration
// (useKaraokeNarration) always goes through the shared TTS pipeline
// (fetchAudio/playAudio), regardless of `words`.
//
// `onExit` (optional) — Bug 5 fix: this is a full-screen fixed portal
// (inset:0, z-index 9990) rendered via createPortal directly onto
// document.body, on top of whatever chrome the caller has underneath —
// including GameEngine's own close/exit button for Story Time in the
// guided path. Before this prop existed there was no way to leave a story
// once opened (not even from the cover page) short of finishing it or a
// hard reload — confirmed live. When provided, renders its own close
// button (top-left, every page including the cover) using the same
// IconClose/aria-label convention as GameEngine's other activity headers.
export default function StoryReader({ story, onComplete, words, onExit }) {
  const [page, setPage] = useState(-1); // -1 = cover
  const [answered, setAnswered] = useState(false);
  const { speakWord: speakTrackedWord } = useWordSpeak(words);
  const { speak } = useSpeak();
  const reducedMotion = usePrefersReducedMotion();
  const totalPages = story.sentences.length;
  const onLastPage = page === totalPages - 1;
  const hasQuestion = !!story.comprehensionQuestion;
  const onQuestionPage = page === totalPages;

  // Narrates the current sentence page, or the comprehension question's
  // own prompt once the child reaches it — same hook either way, just a
  // different source string. `enabled` keeps it from firing on the cover
  // page (nothing to narrate yet).
  const narrationText = onQuestionPage ? story.comprehensionQuestion?.question : story.sentences[page];
  const { highlightedIndex, narrationDone, replay } = useKaraokeNarration(narrationText, page >= 0);

  function speakWord(word) {
    speakTrackedWord(word.replace(/[^a-zA-Z']/g, ''));
  }

  function renderSentence(sentence) {
    return sentence.split(' ').map((word, i) => {
      const clean = word.replace(/[^a-zA-Z']/g, '');
      const isTarget = clean.toLowerCase() === story.targetWord.toLowerCase();
      const isHighlighted = i === highlightedIndex;
      return (
        <span
          key={i}
          onClick={() => speakWord(word)}
          style={{
            cursor: 'pointer', marginRight: 10, display: 'inline-block',
            color: isTarget ? colors.tang : colors.ink,
            fontWeight: isTarget ? 800 : 500,
            textShadow: isTarget ? `0 0 12px ${colors.tang}55` : 'none',
            background: isHighlighted ? `${colors.sun}66` : 'transparent',
            borderRadius: 6,
            padding: '1px 4px',
            transition: reducedMotion ? 'none' : 'background 0.15s ease',
          }}
        >
          {word}
        </span>
      );
    });
  }

  function handleChoiceTap(i) {
    if (!narrationDone) {
      speak("Let's read first!");
      return;
    }
    setAnswered(true);
    setTimeout(() => onComplete(i === story.comprehensionQuestion.correctIndex), 900);
  }

  return createPortal(
    <div className="candy-galaxy" style={{ position: 'fixed', inset: 0, zIndex: 9990, background: skyGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {onExit && (
        <button
          onClick={onExit}
          aria-label="Exit and save progress"
          style={{
            position: 'absolute', top: 24, left: 24,
            width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <IconClose size={20} color={colors.cloud} />
        </button>
      )}
      <div style={{ background: colors.cloud, borderRadius: 32, padding: '2rem', maxWidth: 420, width: '100%', minHeight: 320, boxShadow: shadows.chunkLg, textAlign: 'center' }}>
        {page === -1 && (
          <>
            {story.artUrl ? (
              <img
                src={story.artUrl}
                alt=""
                style={{ width: 180, height: 180, objectFit: 'contain', margin: '0 auto 1rem', display: 'block' }}
              />
            ) : (
              <NovaPortrait pose="read" size={140} style={{ margin: '0 auto 1rem' }} />
            )}
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
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={replay}
                aria-label="Read this page again"
                style={{
                  width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <IconSpeaker size={18} color={colors.mutedInk} />
              </button>
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
            </div>
          </>
        )}

        {onQuestionPage && hasQuestion && !answered && (
          <>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.15rem', color: colors.ink, marginBottom: '1.25rem' }}>
              {renderSentence(story.comprehensionQuestion.question)}
            </div>
            {/* Errorless — choices are never hard-disabled (no punishment
                state), just not-yet-active: tapping early gives a gentle
                Nova nudge instead of answering (handleChoiceTap). */}
            <div style={{ display: 'grid', gap: 10, opacity: narrationDone ? 1 : 0.55 }}>
              {story.comprehensionQuestion.choices.map((choice, i) => (
                <button
                  key={choice}
                  onClick={() => handleChoiceTap(i)}
                  style={{
                    background: 'rgba(0,0,0,.05)', border: 'none', borderRadius: 16, padding: '0.85rem',
                    fontFamily: fonts.body, fontSize: '1rem', color: colors.ink, cursor: 'pointer',
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
            {!narrationDone && (
              <div style={{ fontFamily: fonts.body, fontSize: '.8rem', color: colors.mutedInk, marginTop: 10 }}>
                Listening…
              </div>
            )}
          </>
        )}

        {answered && (
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.2rem', color: colors.mintDeep }}>
            Great reading!
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
