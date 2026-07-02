import { useEffect, useRef, useState } from 'react';
import { T } from './gameTheme';
import { fetchAudio, playAudio } from './gameAudio';

function normalize(text) {
  return (text ?? '').toLowerCase().trim().replace(/[^a-z']/g, '');
}

// Say It with Nova — Phase 2 Step 7, "Verbal Imitation" v1. Real
// browser speech capture (Web Speech SpeechRecognition), closing the
// gap flagged in docs/mlc-engine-audit.md: FlashCardChallenge's
// "Verbal Imitation" binding was a "hear, self-rate" scaffold with no
// actual speech input. This is a genuine, if simple, capture-and-match —
// not scored pronunciation quality, just "did the transcript match the
// target word" (or a close inflection of it).
//
// Errorless-learning scaffold, matching WordMatch's pattern (Phase 5b
// item 4): first miss replays the word and invites a retry; a second
// miss completes the question so the child isn't stuck.
export default function SayItWithNova({ quiz, onAnswer }) {
  const [status, setStatus] = useState('idle'); // idle | listening | correct | wrong | unsupported | denied
  const [missCount, setMissCount] = useState(0);
  const [startTime] = useState(() => Date.now());
  const recognitionRef = useRef(null);
  const doneRef = useRef(false);

  const SpeechRecognitionCtor = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  useEffect(() => {
    if (!SpeechRecognitionCtor) setStatus('unsupported');
    return () => { recognitionRef.current?.abort?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(correct) {
    if (doneRef.current) return;
    doneRef.current = true;
    onAnswer({ correct, responseTimeMs: Date.now() - startTime, firstTry: missCount === 0 });
  }

  function startListening() {
    if (!SpeechRecognitionCtor) return;
    setStatus('listening');
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const alternatives = Array.from(event.results[0]).map((r) => normalize(r.transcript));
      const target = normalize(quiz.word);
      const heard = alternatives.some((t) => t === target || t.includes(target) || target.includes(t));
      if (heard) {
        setStatus('correct');
        setTimeout(() => finish(true), 900);
      } else if (missCount === 0) {
        setMissCount(1);
        setStatus('wrong');
        fetchAudio(quiz.word).then(playAudio);
      } else {
        setStatus('wrong');
        setTimeout(() => finish(false), 1200);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('denied');
      } else {
        setStatus('idle');
      }
    };

    recognition.onend = () => {
      setStatus((s) => (s === 'listening' ? 'idle' : s));
    };

    recognition.start();
  }

  // No mic access at all (unsupported browser or denied permission) —
  // same honest self-rate fallback FlashCardChallenge already uses,
  // rather than leaving the child stuck on a broken activity.
  if (status === 'unsupported' || status === 'denied') {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎤</div>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: '2.5rem', color: T.white, marginBottom: '0.75rem' }}>
          {quiz.word} {quiz.emoji}
        </div>
        <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, marginBottom: '1.5rem', maxWidth: 280, margin: '0 auto 1.5rem' }}>
          {status === 'denied'
            ? "Nova couldn't hear the mic — that's okay, say it out loud and tap below!"
            : "This device can't listen yet — say it out loud and tap below!"}
        </div>
        <button onClick={() => finish(true)} style={{
          padding: '0.85rem 1.75rem', borderRadius: 100, border: 'none', cursor: 'pointer',
          background: T.teal, color: T.bg, fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem',
        }}>
          I said it! ✅
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '0.5rem', animation: status === 'correct' ? 'mw-pop 0.5s ease' : undefined }}>
        {status === 'correct' ? '🎉' : status === 'wrong' ? '🎤' : '🎤'}
      </div>
      <div style={{ fontFamily: 'Space Grotesk', fontSize: '2.5rem', color: T.white, marginBottom: '0.75rem' }}>
        {quiz.word} {quiz.emoji}
      </div>
      <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, marginBottom: '1.5rem' }}>
        {status === 'listening' && "Nova is listening…"}
        {status === 'correct' && 'Nova heard you! ⭐'}
        {status === 'wrong' && missCount === 1 && "Almost! Listen again and try once more."}
        {status === 'wrong' && missCount > 1 && "Good try!"}
        {status === 'idle' && missCount === 0 && 'Say it with Nova!'}
      </div>
      {status !== 'correct' && (
        <button
          onClick={startListening}
          disabled={status === 'listening'}
          style={{
            width: 84, height: 84, borderRadius: '50%', border: 'none', cursor: status === 'listening' ? 'default' : 'pointer',
            background: status === 'listening' ? T.purple : T.coral, color: '#fff', fontSize: '2rem',
            animation: status === 'listening' ? 'mw-pop 1s ease-in-out infinite' : undefined,
          }}
        >
          🎤
        </button>
      )}
    </div>
  );
}
