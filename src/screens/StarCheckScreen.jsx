// StarCheckScreen.jsx — "The Star Check" (Dr. Marion Blank's 25-word
// placement screener, mockup O). Deliberately a DIFFERENT surface from
// "Star Check-In" (StarCheckInCard.jsx / CheckInScreen.jsx, the existing
// 30-day re-check) — the master doc's item 22 conflation lesson: client
// data can't distinguish placement from check-in (both write the same
// placement_completed_at column), so naming them almost-identically was a
// real, previously-caught mistake. This screen is the CHILD-CREATION /
// RETAKE placement flow; it never touches Star Check-In's code paths.
import { useCallback, useEffect, useState } from 'react';
import { colors, fonts, shadows, skyGradient } from '../theme/tokens';
import { supabase } from '../supabaseClient';
import { IconClose, IconStar } from '../components/icons';
import ChunkyButton from '../components/candy/ChunkyButton';
import StarCheckWarmup from '../components/candy/StarCheckWarmup';
import StarCheckProbe from '../components/candy/StarCheckProbe';

const TOTAL_LEVELS = 5;

async function callStarCheck(childId, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch('/api/session-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ childId, starCheckMode: true, ...body }),
  });
  if (!response.ok) throw new Error(`Star Check request failed: ${response.status}`);
  const { starCheck } = await response.json();
  return starCheck;
}

function ClimbRungs({ levelsPassed }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto 18px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>
        The Star Check
      </span>
      <div style={{ flex: 1, display: 'flex', gap: 7, alignItems: 'center' }}>
        {Array.from({ length: TOTAL_LEVELS }, (_, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '50%',
            background: i < levelsPassed ? colors.sun : 'rgba(255,255,255,.18)',
            boxShadow: i < levelsPassed ? '0 0 10px rgba(255,197,49,.7)' : 'none',
            transition: 'all .4s',
          }} />
        ))}
      </div>
      <IconStar size={22} color={colors.sun} />
    </div>
  );
}

// Orchestrates the server-adjudicated check (STAR_CHECK_R1): intro ->
// warm-up sequencing gate -> per-word probes (meaning, then look-alike)
// with a level-lift interstitial between levels -> scoreless result.
// Mirrors PlacementAdventureScreen's plumbing shape (fetch one step at a
// time, collect nothing client-side beyond the signed ladderState token,
// degrade to the beginner path on any request failure) without touching
// that file — this is a wholly separate v2 screen.
export default function StarCheckScreen({ childId, onComplete, onExit }) {
  const [phase, setPhase] = useState('intro'); // intro | warmup | probe | levelLift | done
  const [probeData, setProbeData] = useState(null);
  const [levelsPassed, setLevelsPassed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);

  const fetchStep = useCallback(async (body) => {
    try {
      const starCheck = await callStarCheck(childId, body);
      if (starCheck.done) {
        setResult({ placementUnit: starCheck.placementUnit, trueMeasuredUnit: starCheck.trueMeasuredUnit });
        setPhase('done');
        return;
      }
      setProbeData(starCheck);
      if (starCheck.levelUp) {
        setLevelsPassed(starCheck.levelReached - 1);
        setPhase('levelLift');
      } else {
        setPhase('probe');
      }
    } catch {
      // A failed call must never strand the child mid-onboarding --
      // degrade to the beginner path exactly as if "start at the
      // beginning" had been chosen, same principle as v1.
      setError(true);
    }
  }, [childId]);

  function handleAnswer(correct) {
    fetchStep({ ladderState: probeData.ladderState, answer: correct });
  }

  function handleExit() {
    // Fire-and-forget skip log -- exiting must never wait on a network
    // round-trip.
    supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token;
      fetch('/api/session-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ childId, starCheckMode: true, skip: true }),
      }).catch(() => {});
    });
    onExit();
  }

  if (error) {
    onComplete({ placementUnit: null, trueMeasuredUnit: null, degraded: true });
    return null;
  }

  const ExitButton = (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
      <button
        onClick={handleExit}
        aria-label="Exit The Star Check"
        style={{
          width: 44, height: 44, borderRadius: 16, background: 'rgba(255,255,255,.14)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <IconClose size={20} color={colors.cloud} />
      </button>
    </div>
  );

  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, padding: '2rem 1.25rem', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
          <div style={{ background: colors.cloud, borderRadius: 30, padding: 26, textAlign: 'center', boxShadow: shadows.chunk }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.7rem', color: colors.ink, marginBottom: 10 }}>
              Find your starting star
            </div>
            <div style={{ fontSize: '.9rem', fontWeight: 600, color: colors.mutedInk, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 14px' }}>
              Nova will show you some words — a few easy ones, a few tricky ones. There are no wrong answers here.
              Show her what you know, and she'll find the perfect place for your adventure to begin.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', padding: '7px 13px', borderRadius: 100, background: colors.sun, color: colors.starText }}>usually just a few minutes</span>
              <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', padding: '7px 13px', borderRadius: 100, background: colors.mint, color: colors.mintDeep }}>it can end early — that's normal!</span>
              <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', padding: '7px 13px', borderRadius: 100, background: '#EDEBFA', color: colors.ink }}>no scores, no marks</span>
            </div>
            <ChunkyButton variant="sun" onClick={() => setPhase('warmup')} style={{ width: '100%' }}>
              Let's go, Nova!
            </ChunkyButton>
          </div>
          <button
            onClick={handleExit}
            style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontFamily: fonts.display, fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'warmup') {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, paddingBottom: 40 }}>
        {ExitButton}
        <ClimbRungs levelsPassed={levelsPassed} />
        <StarCheckWarmup onDone={(struggled) => fetchStep({ warmupStruggled: struggled })} />
      </div>
    );
  }

  if (phase === 'levelLift') {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24 }}>
        <IconStar size={70} color={colors.sun} />
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.7rem', color: colors.cloud }}>Level star found!</div>
        <div style={{ background: colors.cloud, color: colors.ink, borderRadius: 22, padding: '12px 18px', fontFamily: fonts.display, fontWeight: 700 }}>
          Up we float — new stars ahead!
        </div>
        <ChunkyButton variant="mint" onClick={() => setPhase('probe')}>Keep going</ChunkyButton>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: colors.cloud, borderRadius: 32, padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 400, boxShadow: shadows.chunk }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IconStar size={48} color={colors.sun} /></div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', color: colors.ink, marginBottom: 10 }}>
            You found your starting star!
          </div>
          <div style={{ color: colors.mutedInk, marginBottom: 24 }}>
            {/* Scoreless per DESIGN_BRIEF_V2.md: no counts, no percentages,
                no pass/fail language. Free-tier child never sees a number
                above their plan's floor -- placementUnit is already
                min(measured, cap); the TRUE measured level only ever
                surfaces in the Parent Portal. */}
            Unit {result?.placementUnit ?? 1} is ready to go!
          </div>
          <ChunkyButton onClick={() => onComplete(result)} variant="mint" style={{ width: '100%' }}>
            Let's fly!
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // phase === 'probe'
  if (!probeData) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.cloud, fontFamily: fonts.display }}>Finding your starting star…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: skyGradient, paddingBottom: 40 }}>
      {ExitButton}
      <ClimbRungs levelsPassed={levelsPassed} />
      <StarCheckProbe key={`${probeData.level}-${probeData.wordNumber}-${probeData.mechanic}`} probe={probeData} onAnswer={handleAnswer} />
    </div>
  );
}
