import { useCallback, useEffect, useState } from 'react';
import { colors, fonts, shadows, skyGradient } from '../theme/tokens';
import { supabase } from '../supabaseClient';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';
import PlacementProbe from '../components/candy/PlacementProbe';
import { IconClose, IconStar } from '../components/icons';
import ChunkyButton from '../components/candy/ChunkyButton';

async function callPlacement(childId, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch('/api/session-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ childId, placementMode: true, ...body }),
  });
  if (!response.ok) throw new Error(`Placement request failed: ${response.status}`);
  const { placement } = await response.json();
  return placement;
}

// Orchestrates the server-adjudicated ladder (Prompt 8): fetches one
// rung's probe words at a time, collects answers in memory only (nothing
// persisted client-side beyond the signed ladderState token itself),
// reports them back, and either advances to the next rung, finalizes,
// or -- on any request failure -- degrades to the beginner path rather
// than leaving the child stuck (an errorless-adjacent principle applied
// to the plumbing itself, not just the on-screen feedback).
export default function PlacementAdventureScreen({ childId, onComplete, onExit }) {
  const reducedMotion = usePrefersReducedMotion();
  const [rungData, setRungData] = useState(null); // { rung, rungUnit, words, ladderState }
  const [probeIdx, setProbeIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [transitioning, setTransitioning] = useState(false);
  const [result, setResult] = useState(null); // { placementUnit, trueMeasuredUnit }
  const [error, setError] = useState(false);

  const fetchRung = useCallback(async (body) => {
    try {
      const placement = await callPlacement(childId, body);
      if (placement.done) {
        setResult({ placementUnit: placement.placementUnit, trueMeasuredUnit: placement.trueMeasuredUnit });
        return;
      }
      setRungData(placement);
      setProbeIdx(0);
      setAnswers([]);
    } catch {
      // A failed placement call must never strand the child mid-onboarding
      // -- degrade to the beginner path (Unit 1, no floor) exactly as if
      // "start at the beginning" had been chosen.
      setError(true);
    }
  }, [childId]);

  useEffect(() => { fetchRung({}); }, [fetchRung]);

  function handleAnswer(correct) {
    const nextAnswers = [...answers, correct];
    if (nextAnswers.length < rungData.words.length) {
      setAnswers(nextAnswers);
      setProbeIdx(probeIdx + 1);
      return;
    }
    // Rung complete -- report back. A brief, reduced-motion-aware "on to
    // the next star" beat plays first so the ladder doesn't feel like an
    // abrupt quiz-app page reload between rungs.
    if (reducedMotion) {
      fetchRung({ ladderState: rungData.ladderState, answers: nextAnswers });
    } else {
      setTransitioning(true);
      setTimeout(() => {
        setTransitioning(false);
        fetchRung({ ladderState: rungData.ladderState, answers: nextAnswers });
      }, 1300);
    }
  }

  function handleExit() {
    // Fire-and-forget skip log -- exiting must never wait on a network
    // round-trip; "skipped, Unit 1, retake available" is already the
    // correct state the instant this returns to Home (no placement_unit
    // was ever written for this attempt).
    supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token;
      fetch('/api/session-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ childId, placementMode: true, skip: true }),
      }).catch(() => {});
    });
    onExit();
  }

  if (error) {
    // Degrade silently to the beginner outcome -- no error language shown
    // to the child, matching the errorless spirit of the whole flow.
    onComplete({ placementUnit: null, trueMeasuredUnit: null, degraded: true });
    return null;
  }

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: colors.cloud, borderRadius: 32, padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 400, boxShadow: shadows.chunk }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IconStar size={48} color={colors.sun} /></div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', color: colors.ink, marginBottom: 10 }}>
            Nova found your starting star!
          </div>
          <div style={{ color: colors.mutedInk, marginBottom: 24 }}>
            {/* Free-tier child never sees a number above their plan's floor
                here -- placementUnit is already min(measured, cap); the
                TRUE measured level only ever surfaces in the Parent
                Portal (DashboardTab), never at the child. */}
            Unit {result.placementUnit ?? 1} is ready to go!
          </div>
          <ChunkyButton onClick={() => onComplete(result)} variant="mint" style={{ width: '100%' }}>
            Let's fly!
          </ChunkyButton>
        </div>
      </div>
    );
  }

  if (transitioning) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, fontSize: '1.1rem' }}>
          On to the next star!
        </div>
      </div>
    );
  }

  if (!rungData) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.cloud, fontFamily: fonts.display }}>Finding your starting star…</div>
      </div>
    );
  }

  const probe = rungData.words[probeIdx];

  return (
    <div style={{ minHeight: '100vh', background: skyGradient, paddingBottom: 40 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleExit}
          aria-label="Exit placement"
          style={{
            width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <IconClose size={20} color={colors.cloud} />
        </button>
      </div>
      <PlacementProbe key={`${rungData.rung}-${probeIdx}`} probe={probe} onAnswer={handleAnswer} />
    </div>
  );
}
