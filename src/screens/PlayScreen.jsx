import { useEffect, useState } from 'react';
import { colors, fonts, skyGradient } from '../theme/tokens';
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
import { logSessionResult, getRollingSuccessRate } from '../lib/difficultyGovernor';
import { useParentSettingsQuery } from '../lib/queries/parentSettings';
import { useSessionTimeLimit } from '../lib/useSessionTimeLimit';
import NovaPortrait from '../components/candy/NovaPortrait';
import QuestPath from '../components/candy/QuestPath';
import { getEligibleActivities } from '../lib/activityDefs';
import { useTodayWordActivityQuery, summarizeTodayActivity } from '../lib/queries/questProgress';
import { useQueryClient } from '@tanstack/react-query';
import { IconSpark, IconArrow } from '../components/icons';

const MASTERED_THRESHOLD = 80;
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
// Fixed bonus for finishing every eligible activity in a word's guided
// path for the day — comfortably under earn_sparks' 500/call cap
// (migration 0015), clearly bigger than a typical single-session award
// (round(sessionXP/2), usually single-to-low-double digits) so it reads
// as a genuine bonus, not "the same reward, slightly bigger."
const PATH_COMPLETE_SPARKS_BONUS = 25;

export default function PlayScreen({ focusWord, onExit }) {
  const { user } = useAuth();
  const { words, currentWord, unitsById, childId, activeChild, plan } = useCandyGalaxyData();
  const [gameType, setGameType] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);
  const { speak } = useSpeak();
  const queueCelebration = useUIStore((s) => s.queueCelebration);
  const parentSettingsQ = useParentSettingsQuery(user?.id);
  const { minutesToday, limitReached } = useSessionTimeLimit(childId, parentSettingsQ.data?.daily_minutes_limit);

  const { sessionPlan, planLoading, planError, generatePlanForWord } = useSessionPlan(user, childId, plan);
  const queryClient = useQueryClient();

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

  // Option B guided path — the full word record (word_type/has_art) for
  // whichever word this session is actually about, falling back to the
  // adaptive currentWord if no specific focusWord was tapped.
  const pathWord = words.find((w) => w.word === (focusWord?.word ?? currentWord?.word)) ?? currentWord;
  const eligibleActivities = getEligibleActivities(pathWord);
  const todayActivityQ = useTodayWordActivityQuery(childId, pathWord?.word);
  const todayActivitySummary = summarizeTodayActivity(todayActivityQ.data ?? []);

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

    // Option B guided path reward — did finishing THIS activity complete
    // every eligible activity for the focus word today? Checked against
    // todayActivitySummary from before this session started (closed over
    // from render) with gameType folded in directly, rather than
    // re-querying learning_events — that insert is fire-and-forget (see
    // handleProgress) and its last row may not have landed yet, but we
    // already know for certain gameType just finished.
    if (pathWord && eligibleActivities.length > 0) {
      const wasAllDoneBefore = eligibleActivities.every((a) => todayActivitySummary.has(a.id));
      const isAllDoneNow = eligibleActivities.every((a) => a.id === gameType || todayActivitySummary.has(a.id));
      if (!wasAllDoneBefore && isAllDoneNow) {
        await earnSparks.mutateAsync(PATH_COMPLETE_SPARKS_BONUS);
        queueCelebration({ type: 'pathComplete', payload: { word: pathWord.word, sparksBonus: PATH_COMPLETE_SPARKS_BONUS } });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['todayWordActivity', childId, pathWord?.word] });
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
          Time for a break!
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
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <IconArrow size={14} direction="left" color={colors.cloud} /> Home
        </button>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.cloud, textAlign: 'center', margin: '0.5rem 0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IconSpark size={20} color={colors.sun} /> Today's Quest
        </h2>
        <QuestPath
          word={pathWord}
          childId={childId}
          recommendedRate={getRollingSuccessRate()}
          onSelectActivity={(id) => setGameType(id)}
          speak={speak}
        />
        {planError && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.7)', marginTop: '1.5rem', fontSize: '.85rem' }}>
            Offline mode — your progress still saves normally.
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
