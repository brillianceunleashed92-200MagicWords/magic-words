import { useCallback, useEffect, useState } from 'react';
import { colors, fonts, shadows, skyGradient } from '../theme/tokens';
import { supabase } from '../supabaseClient';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';
import PlacementProbe from '../components/candy/PlacementProbe';
import { IconClose, IconStar } from '../components/icons';
import ChunkyButton from '../components/candy/ChunkyButton';

async function callCheckin(childId, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch('/api/session-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ childId, checkinMode: true, ...body }),
  });
  if (!response.ok) throw new Error(`Check-in request failed: ${response.status}`);
  const { checkin } = await response.json();
  return checkin;
}

// FEAT_PLACEMENT_CHECKIN_R1 — Star Check-In. Same shape as
// PlacementAdventureScreen (Prompt 8) on purpose: reuses PlacementProbe
// directly, the same "collect answers in memory only, report back per
// rung" orchestration, and the same errorless-adjacent "any request
// failure exits quietly rather than stranding the child" rule. §5a's
// measurement carve-out applies inside PlacementProbe exactly as it does
// for placement — no separate copy of that exception needed here.
// Parent-initiated (a DashboardTab card), but the ladder itself is
// entirely child-facing and carries zero assessment language, same as
// placement's own probe screens.
export default function CheckInScreen({ childId, onComplete, onExit }) {
  const reducedMotion = usePrefersReducedMotion();
  const [rungData, setRungData] = useState(null);
  const [probeIdx, setProbeIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [transitioning, setTransitioning] = useState(false);
  const [result, setResult] = useState(null); // { rawMeasured, appliedMeasured }
  const [error, setError] = useState(false);

  const fetchRung = useCallback(async (body) => {
    try {
      const checkin = await callCheckin(childId, body);
      if (checkin.done) {
        setResult({ rawMeasured: checkin.rawMeasured, appliedMeasured: checkin.appliedMeasured });
        return;
      }
      setRungData(checkin);
      setProbeIdx(0);
      setAnswers([]);
    } catch {
      // A failed check-in call must never strand the child mid-adventure
      // — quietly return them home rather than showing any error/retry
      // language (errorless-adjacent, same reasoning as placement).
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
    // No product event on this path (design lock: check-in has no
    // parent-facing "choice screen" to abandon out of the way placement
    // does, so an early exit isn't logged as a separate signal) -- fire
    // the skip no-op purely so the server-side call shape stays
    // consistent with placement's, then leave immediately.
    supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token;
      fetch('/api/session-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ childId, checkinMode: true, skip: true }),
      }).catch(() => {});
    });
    onExit();
  }

  if (error) {
    onExit();
    return null;
  }

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: colors.cloud, borderRadius: 32, padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 400, boxShadow: shadows.chunk }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IconStar size={48} color={colors.sun} /></div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', color: colors.ink, marginBottom: 10 }}>
            Great flying, Star Learner!
          </div>
          <div style={{ color: colors.mutedInk, marginBottom: 24 }}>
            Nova's checked in on your progress — back to the galaxy!
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
        <div style={{ color: colors.cloud, fontFamily: fonts.display }}>Nova's coming to check in…</div>
      </div>
    );
  }

  const probe = rungData.words[probeIdx];

  return (
    <div style={{ minHeight: '100vh', background: skyGradient, paddingBottom: 40 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleExit}
          aria-label="Exit check-in"
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
