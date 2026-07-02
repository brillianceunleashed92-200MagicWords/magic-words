import { useEffect, useMemo, useState } from 'react';
import { colors, fonts, skyGradient, shadows } from '../theme/tokens';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import { useSessionPlan } from '../hooks/useSessionPlan';
import { GameEngine, SessionComplete } from '../games/GameEngine';
import { GalaxyLoader } from '../components/AuthGuard';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';
import { useSaveWordProgressMutation } from '../lib/queries/wordProgress';
import { useSaveXPMutation } from '../lib/queries/userStats';
import { useEarnSparksMutation } from '../lib/queries/sparks';
import { useUpdateStreakMutation } from '../lib/queries/streaks';
import { useUIStore } from '../stores/useUIStore';
import { useSpeak } from '../lib/useSpeak';
import { logSessionResult, getRollingSuccessRate, suggestActivity } from '../lib/difficultyGovernor';
import { useParentSettingsQuery } from '../lib/queries/parentSettings';
import { useSessionTimeLimit } from '../lib/useSessionTimeLimit';
import NovaPortrait from '../components/candy/NovaPortrait';

const MASTERED_THRESHOLD = 80;
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

// The 5 named Candy Galaxy activities mapped onto the existing MLC-bound
// game components (kept as-is, not rewritten — see docs/mlc-engine-audit.md
// section 5/6 for why each mapping was chosen).
const ACTIVITIES = [
  { id: 'word_match', label: 'Tap & Hear', icon: '👂' },
  { id: 'word_hunt', label: 'Word Hunt', icon: '🔍' },
  { id: 'story_builder', label: 'Fill the Story', icon: '📖' },
  { id: 'rhyme_time', label: 'Match & Sort', icon: '🎵' },
  { id: 'flash_cards', label: 'Quiz Boss', icon: '👑' },
  { id: 'word_builder', label: 'Word Builder', icon: '🧩' },
  { id: 'draw_it', label: 'Draw It', icon: '🎨' },
  { id: 'story_time', label: 'Story Time', icon: '📚' },
  { id: 'word_song', label: 'Word Song', icon: '🎶' },
  { id: 'magic_video', label: 'Magic Video', icon: '🎬' },
];

export default function PlayScreen({ focusWord, onExit }) {
  const { user } = useAuth();
  const { words, currentWord, unitsById, childId, activeChild } = useCandyGalaxyData();
  const [gameType, setGameType] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);
  const { speak } = useSpeak();
  const queueCelebration = useUIStore((s) => s.queueCelebration);
  const parentSettingsQ = useParentSettingsQuery(user?.id);
  const { minutesToday, limitReached } = useSessionTimeLimit(childId, parentSettingsQ.data?.daily_minutes_limit);

  const wordProgressForPlan = useMemo(
    () => words.map((w) => ({ word: w.word, mastery: w.mastery, last_practiced: null })),
    [words]
  );
  const { sessionPlan, planLoading, planError, generatePlanForWord } = useSessionPlan(user, words.length ? wordProgressForPlan : null);

  // A word tapped directly on the Home path/Galaxy map should drive the
  // session, not whatever the default sequencing would pick.
  useEffect(() => {
    if (focusWord?.word) generatePlanForWord(focusWord.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusWord?.word]);

  const saveWordProgress = useSaveWordProgressMutation(user?.id, childId);
  const saveXP = useSaveXPMutation(user?.id, childId);
  const earnSparks = useEarnSparksMutation(childId);
  const updateStreak = useUpdateStreakMutation(user?.id, childId);

  const suggestedActivity = suggestActivity(getRollingSuccessRate());

  async function handleProgress({ word, correct, responseTimeMs, gameType: playedGameType }) {
    const before = words.find((w) => w.word === word);
    const prevMastery = before?.mastery ?? 0;
    const result = await saveWordProgress.mutateAsync({ word, correct });

    // Fire-and-forget — feeds the parent portal's "minutes this week" stat
    // (blueprint 4.1). Not awaited: a logging failure shouldn't affect the
    // child's session in any way.
    supabase.from('learning_events').insert({
      user_id: user?.id,
      child_id: childId,
      word,
      game_type: playedGameType ?? gameType,
      correct,
      response_time_ms: responseTimeMs ?? null,
      attempt_number: 1,
    }).then(({ error }) => { if (error) console.error('[learning_events]', error.message); });

    if (prevMastery < MASTERED_THRESHOLD && result.mastery >= MASTERED_THRESHOLD) {
      const wordData = before ?? { word };
      queueCelebration({ type: 'wordMastered', payload: { word: wordData.word } });

      const unit = wordData.unit;
      if (unit != null) {
        const unitWords = unitsById.get(unit) ?? [];
        const unitNowComplete = unitWords.length > 0 && unitWords.every((w) =>
          w.word === word ? true : w.mastery >= MASTERED_THRESHOLD
        );
        if (unitNowComplete) queueCelebration({ type: 'unitBoss', payload: { unit } });
      }
    }
  }

  async function handleXP(totalSessionXP) {
    await saveXP.mutateAsync(totalSessionXP);
    // v1 Sparks formula: half of session XP, rounded — a simple, tunable
    // starting ratio (blueprint only specifies "earned on completions").
    const sparksEarned = Math.max(1, Math.round(totalSessionXP / 2));
    await earnSparks.mutateAsync(sparksEarned);
    return sparksEarned;
  }

  async function handleSessionEnd({ wordsCorrect, totalWords, wordsPlayed }) {
    setSessionResult({ wordsCorrect, totalWords, wordsPlayed: wordsPlayed ?? [] });
    logSessionResult({ wordsCorrect, totalWords });
    const streakResult = await updateStreak.mutateAsync();
    if (STREAK_MILESTONES.includes(streakResult?.current_streak)) {
      queueCelebration({ type: 'streakMilestone', payload: { streak: streakResult.current_streak } });
    }
  }

  // Soft time-limit lockout (blueprint 4.3 "Time controls" — parent-set
  // daily_minutes_limit, enforced with a gentle Nova moment, not a wall of
  // text). Checked before the activity picker so a limit reached mid-quest
  // still finishes the current session (this check only gates *starting*
  // a new one — see handleSessionEnd/PlayScreen's gameType flow).
  if (limitReached && !gameType) {
    return (
      <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <NovaPortrait pose="wave" size={120} />
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', color: colors.cloud, marginTop: '1rem' }}>
          Time for a break! ✨
        </div>
        <div style={{ color: 'rgba(255,255,255,.85)', marginTop: 8, maxWidth: 280 }}>
          You've played {minutesToday} minutes today — Nova will be here tomorrow!
        </div>
        <button onClick={onExit} style={{
          marginTop: '1.5rem', background: colors.cloud, border: 'none', borderRadius: 100,
          padding: '0.75rem 1.75rem', fontFamily: fonts.display, fontWeight: 700, cursor: 'pointer',
        }}>
          Back Home
        </button>
      </div>
    );
  }

  if (!gameType) {
    return (
      <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, padding: '1.5rem', fontFamily: fonts.body }}>
        <button onClick={onExit} style={{
          background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 100, color: colors.cloud,
          padding: '10px 18px', fontFamily: fonts.display, fontWeight: 700, cursor: 'pointer', marginBottom: '1rem',
        }}>
          ← Home
        </button>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.cloud, textAlign: 'center', margin: '0.5rem 0 1.5rem' }}>
          Today's Quest ✨
        </h2>
        {currentWord && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.85)', fontWeight: 600, marginBottom: '1.5rem' }}>
            Focus word: <strong>{currentWord.word}</strong> {currentWord.emoji}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem', maxWidth: 420, margin: '0 auto' }}>
          {ACTIVITIES.map((a) => (
            <button
              key={a.id}
              onClick={() => { speak(a.label); setGameType(a.id); }}
              style={{
                minHeight: 130,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: colors.cloud, color: colors.ink,
                border: suggestedActivity === a.id ? `3px solid ${colors.sun}` : 'none',
                borderRadius: 26, boxShadow: shadows.chunk, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '2.2rem' }}>{a.icon}</span>
              <span style={{ fontFamily: fonts.display, fontWeight: 700 }}>{a.label}</span>
              {suggestedActivity === a.id && (
                <span style={{ fontSize: '.65rem', fontWeight: 800, color: colors.tang }}>RECOMMENDED</span>
              )}
            </button>
          ))}
        </div>
        {planError && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.7)', marginTop: '1.5rem', fontSize: '.85rem' }}>
            ⚠️ Offline mode — your progress still saves normally.
          </div>
        )}
      </div>
    );
  }

  if (planLoading || !sessionPlan) {
    return <GalaxyLoader message="Preparing your quest…" />;
  }

  if (sessionResult) {
    return (
      <SessionComplete
        correctCount={sessionResult.wordsCorrect}
        total={sessionResult.totalWords}
        encouragement={sessionPlan?.encouragements?.[0]}
        childName={activeChild?.name ?? 'Star Learner'}
        wordsPlayed={sessionResult.wordsPlayed}
        onPlayAgain={() => { setSessionResult(null); setGameType(null); }}
        onHome={onExit}
      />
    );
  }

  return (
    <GameEngine
      sessionPlan={sessionPlan}
      gameType={gameType}
      childName={activeChild?.name ?? 'Star Learner'}
      onProgress={handleProgress}
      onSessionEnd={handleSessionEnd}
      onHome={onExit}
      onXP={handleXP}
      userId={user?.id}
      childId={childId}
    />
  );
}
