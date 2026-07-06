import { useEffect, useRef, useState } from 'react';
import { colors, fonts, shadows } from '../theme/tokens';
import { fetchAudio, playAudio } from './gameAudio';
import { getPromptText } from './promptText';
import { IconMic, IconStar, IconSpeaker } from '../components/icons';
import { NovaPorthole } from './lessonChrome';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

function normalize(text) {
  return (text ?? '').toLowerCase().trim().replace(/[^a-z']/g, '');
}

// Prompt 7 Part 5 diagnostic instrumentation — structured console events
// (chosen over a Grown-Ups-gated visual readout: this needs to be
// reachable the instant a phone session starts, before anyone has found
// a debug menu, and Chrome/Safari's remote inspector already surfaces
// console output over a cable with no extra UI to build or maintain).
// One line per event, greppable, with a timestamp and enough state to
// diagnose a silent mobile failure without a live debugger attached:
// permission state, which recognition event fired, in what order.
function logSpeechEvent(event, data = {}) {
  // eslint-disable-next-line no-console
  console.log(`[SayItDiag] event=${event} ts=${Date.now()}`, data);
}

// Say It with Nova — Phase 2 Step 7, "Verbal Imitation" v1, migrated to
// Candy tokens/lessonChrome + desktop UX polish in Prompt 7 Part 5 (see
// docs/POLISH_PASS_REPORT.md's SAY IT section for the full audit: mic-
// centering, 5s no-speech timeout, pronunciation help, auto-listen, the
// word-6 celebration race this pass found and fixed, and the mobile-mic
// feasibility assessment + verdict). Real browser speech capture (Web
// Speech SpeechRecognition) — not scored pronunciation quality, just
// "did the transcript match the target word" (or a close inflection).
//
// Errorless-learning scaffold, matching WordMatch's pattern: first miss
// replays the word and invites a retry; a second miss completes the
// question so the child isn't stuck.
const NO_SPEECH_TIMEOUT_MS = 5000;

export default function SayItWithNova({ quiz, onAnswer }) {
  const [status, setStatus] = useState('idle'); // idle | listening | correct | wrong | timeout | unsupported | denied
  const [missCount, setMissCount] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [audioUrl, setAudioUrl] = useState(null);
  const [micGranted, setMicGranted] = useState(false);
  const recognitionRef = useRef(null);
  const doneRef = useRef(false);
  const noSpeechTimerRef = useRef(null);
  // Word-6 / mid-session misfire investigation (Prompt 7 Part 5): a
  // plausible race found by reading the code, not (yet) reproduced on a
  // real device — nothing stopped a second `startListening()` call while
  // the PREVIOUS SpeechRecognition instance's async browser callbacks
  // (onresult/onerror/onend) were still in flight. Two live recognition
  // sessions could exist briefly, and a late/stale callback from the
  // first one would still fire against closures capturing the OLD
  // missCount/status — able to complete or mis-score a question a beat
  // after a fresh attempt had already started. This sequence number is
  // bumped on every real `startListening()` call; every recognition
  // callback checks it's still current before acting on anything,
  // discarding stale events instead of processing them (same
  // "double-completion" shape as DRAW_IT_TRACING_REPORT.md's
  // completeStroke fix). Regression-tested in tests/say-it-race.spec.js
  // with a stubbed SpeechRecognition that fires events out of order.
  const recognitionSeqRef = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  const SpeechRecognitionCtor = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  useEffect(() => {
    if (!SpeechRecognitionCtor) {
      setStatus('unsupported');
      logSpeechEvent('unsupported', { word: quiz?.word });
    }
    return () => {
      recognitionSeqRef.current += 1; // invalidate any still-pending callbacks
      recognitionRef.current?.abort?.();
      if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mic permission state, checked once up front — feeds both the
  // diagnostic log and the auto-listen decision below. Safari doesn't
  // reliably support the 'microphone' permission name (throws or
  // resolves 'prompt' unconditionally in some versions) — treated as
  // "not yet granted" on any failure, which just means auto-listen
  // doesn't fire and the child taps the mic button manually instead
  // (the universal path, always available regardless of this check).
  useEffect(() => {
    if (!navigator.permissions?.query) { logSpeechEvent('permissions-api-unavailable'); return; }
    navigator.permissions.query({ name: 'microphone' })
      .then((status) => {
        logSpeechEvent('permission-state', { state: status.state });
        setMicGranted(status.state === 'granted');
      })
      .catch((err) => logSpeechEvent('permission-query-failed', { message: err?.message }));
  }, []);

  // Says the word aloud on mount (imitation requires a model to imitate)
  // — auto-listen starts recognition the instant this finishes playing,
  // IF mic permission is already granted. If it isn't (first time this
  // child has hit this activity, or permission was denied), the manual
  // mic button is the fallback path — always rendered, never hidden.
  useEffect(() => {
    doneRef.current = false;
    setMissCount(0);
    setStatus(SpeechRecognitionCtor ? 'idle' : 'unsupported');
    let cancelled = false;
    setAudioUrl(null);
    fetchAudio(getPromptText(quiz, 'say_it')).then((url) => {
      if (cancelled || !url) return;
      setAudioUrl(url);
      const audio = playAudio(url);
      if (audio && micGranted && SpeechRecognitionCtor) {
        audio.onended = () => { if (!cancelled) startListening(); };
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.word]);

  function finish(correct) {
    if (doneRef.current) return;
    doneRef.current = true;
    logSpeechEvent('finish', { correct, word: quiz?.word });
    onAnswer({ correct, responseTimeMs: Date.now() - startTime, firstTry: missCount === 0 });
  }

  function replayWord() {
    if (audioUrl) playAudio(audioUrl);
    logSpeechEvent('pronunciation-help-tapped', { word: quiz?.word });
  }

  function clearNoSpeechTimer() {
    if (noSpeechTimerRef.current) { clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null; }
  }

  function startListening() {
    if (!SpeechRecognitionCtor || doneRef.current) return;
    // Abort whatever the previous attempt left running and invalidate
    // its callbacks before starting a fresh one — see recognitionSeqRef
    // above for why.
    recognitionRef.current?.abort?.();
    const mySeq = ++recognitionSeqRef.current;
    setStatus('listening');
    logSpeechEvent('start', { word: quiz?.word, seq: mySeq });

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    clearNoSpeechTimer();
    noSpeechTimerRef.current = setTimeout(() => {
      if (recognitionSeqRef.current !== mySeq) return;
      logSpeechEvent('no-speech-timeout', { seq: mySeq });
      recognition.abort?.();
      setStatus('timeout');
    }, NO_SPEECH_TIMEOUT_MS);

    recognition.onresult = (event) => {
      if (recognitionSeqRef.current !== mySeq) { logSpeechEvent('stale-result-ignored', { seq: mySeq }); return; }
      clearNoSpeechTimer();
      const alternatives = Array.from(event.results[0]).map((r) => normalize(r.transcript));
      const target = normalize(quiz.word);
      const heard = alternatives.some((t) => t === target || t.includes(target) || target.includes(t));
      logSpeechEvent('result', { seq: mySeq, heard, alternatives });
      if (heard) {
        setStatus('correct');
        setTimeout(() => finish(true), 900);
      } else {
        setMissCount((prevMiss) => {
          if (prevMiss === 0) {
            setStatus('wrong');
            fetchAudio(getPromptText(quiz, 'say_it')).then(playAudio);
            return 1;
          }
          setStatus('wrong');
          setTimeout(() => finish(false), 1200);
          return prevMiss + 1;
        });
      }
    };

    recognition.onerror = (event) => {
      if (recognitionSeqRef.current !== mySeq) { logSpeechEvent('stale-error-ignored', { seq: mySeq }); return; }
      logSpeechEvent('error', { seq: mySeq, error: event.error });
      // Our own no-speech-timeout handler already called abort() and set
      // status to 'timeout' -- the 'aborted' error this produces is a
      // side effect of that call, not a new failure. Reproduced live on
      // production: without this guard, the abort's error event
      // immediately overwrote the "Didn't quite catch that" message back
      // to the generic idle state before a child could ever read it.
      if (event.error === 'aborted') return;
      clearNoSpeechTimer();
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('denied');
      } else if (event.error === 'no-speech') {
        setStatus('timeout');
      } else {
        setStatus('idle');
      }
    };

    recognition.onend = () => {
      if (recognitionSeqRef.current !== mySeq) return;
      logSpeechEvent('end', { seq: mySeq });
      setStatus((s) => (s === 'listening' ? 'idle' : s));
    };

    recognition.start();
  }

  // No mic access at all (unsupported browser or denied permission) —
  // an honest self-report floor, not a broken activity. Kept as a
  // graceful degrade rather than pulling Say It from the rotation on
  // these devices entirely: unlike Quiz Boss's old self-rating flaw
  // (a MEASURABLE alternative existed there and was being skipped), a
  // real verbal-production activity has no substitute measurement when
  // the mic is genuinely unavailable — self-report is the honest floor,
  // not a shortcut around one.
  if (status === 'unsupported' || status === 'denied') {
    return (
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px', textAlign: 'center' }}>
        <NovaPorthole
          novaState="idle"
          message={status === 'denied'
            ? "Nova couldn't hear the mic — that's okay, say it out loud and tap below!"
            : "This device can't listen yet — say it out loud and tap below!"}
        />
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '2.2rem', color: colors.cloud, margin: '1.5rem 0' }}>
          {quiz.word}
        </div>
        <button onClick={() => finish(true)} style={{
          padding: '0.9rem 1.9rem', minHeight: 44, borderRadius: 100, border: 'none', cursor: 'pointer',
          background: colors.mint, color: colors.mintDeep, fontFamily: fonts.display, fontWeight: 700, fontSize: '1rem',
          boxShadow: shadows.chunkSm,
        }}>
          I said it!
        </button>
      </div>
    );
  }

  const message =
    status === 'listening' ? "Nova is listening…" :
    status === 'correct' ? 'Nova heard you!' :
    status === 'timeout' ? "Didn't quite catch that — try again!" :
    status === 'wrong' && missCount === 1 ? "Almost! Listen again and try once more." :
    status === 'wrong' && missCount > 1 ? 'Good try!' :
    'Say it with Nova!';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <NovaPorthole novaState={status === 'correct' ? 'correct' : 'idle'} message={message} />
        </div>
        <button
          onClick={replayWord}
          disabled={!audioUrl}
          aria-label="Hear the pronunciation again"
          style={{
            width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: audioUrl ? 'pointer' : 'default', opacity: audioUrl ? 1 : 0.5, marginBottom: 20,
          }}
        >
          <IconSpeaker size={20} color={colors.cloud} />
        </button>
      </div>

      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '2.2rem', color: colors.cloud, margin: '1.5rem 0' }}>
        {quiz.word}
      </div>

      {status !== 'correct' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={startListening}
            disabled={status === 'listening'}
            aria-label="Tap to speak"
            style={{
              width: 84, height: 84, borderRadius: '50%', border: 'none', cursor: status === 'listening' ? 'default' : 'pointer',
              background: status === 'listening' ? colors.sky : colors.bubble, color: colors.cloud,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: shadows.chunk,
              animation: status === 'listening' && !reducedMotion ? 'mw-pop 1s ease-in-out infinite' : 'none',
            }}
          >
            <IconMic size={32} color={colors.cloud} />
          </button>
        </div>
      )}
      {status === 'correct' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IconStar size={56} color={colors.sun} />
        </div>
      )}
    </div>
  );
}
