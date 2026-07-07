import { useEffect, useRef, useState } from 'react';
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
import { useAddTracingMomentMutation } from '../lib/queries/magicMoments';
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
import { isRealMastery } from '../lib/masteryCalibration';

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
// Fixed bonus for finishing every eligible activity in a word's guided
// path for the day — comfortably under earn_sparks' 500/call cap
// (migration 0015), clearly bigger than a typical single-session award
// (round(sessionXP/2), usually single-to-low-double digits) so it reads
// as a genuine bonus, not "the same reward, slightly bigger."
const PATH_COMPLETE_SPARKS_BONUS = 25;

export default function PlayScreen({ focusWord, onExit }) {
  const { user } = useAuth();
  const { words, currentWord, unitsById, childId, activeChild, plan, masteredCount } = useCandyGalaxyData();
  const [gameType, setGameType] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);
  // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 5 — scaffold-down v1: session-local,
  // per-word tracking. { [word]: { consecutiveWrong, pinnedActivityId } }.
  // Real state (not a ref) so QuestPath re-renders with the new pin the
  // instant it changes, not just whenever some unrelated state update
  // happens to fire next.
  const [scaffoldState, setScaffoldState] = useState({});
  const { speak } = useSpeak();
  const queueCelebration = useUIStore((s) => s.queueCelebration);
  const parentSettingsQ = useParentSettingsQuery(user?.id);
  const { minutesToday, limitReached } = useSessionTimeLimit(childId, parentSettingsQ.data?.daily_minutes_limit);

  const {
    sessionPlan, planLoading, planError, generatePlanForWord,
    reviewSessionPlan, reviewPlanLoading, generateReviewPlan,
  } = useSessionPlan(user, childId, plan, activeChild?.placement_unit);
  const queryClient = useQueryClient();

  // Quiz Boss (Prompt 6 Part 4) draws its own server-authoritative
  // review-pool plan the moment it's selected, distinct from the shared
  // adaptive `sessionPlan` every other activity uses.
  const isQuizBoss = gameType === 'flash_cards';
  useEffect(() => {
    if (isQuizBoss && user && childId) generateReviewPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuizBoss, user?.id, childId]);

  const activeSessionPlan = isQuizBoss ? reviewSessionPlan : sessionPlan;
  const activePlanLoading = isQuizBoss ? reviewPlanLoading : planLoading;

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
  const addTracingMoment = useAddTracingMomentMutation(childId);

  // Option B guided path — the full word record (word_type/has_art) for
  // whichever word this session is actually about, falling back to the
  // adaptive currentWord if no specific focusWord was tapped.
  const pathWord = words.find((w) => w.word === (focusWord?.word ?? currentWord?.word)) ?? currentWord;
  const eligibleActivities = getEligibleActivities(pathWord);
  const todayActivityQ = useTodayWordActivityQuery(childId, pathWord?.word);
  const todayActivitySummary = summarizeTodayActivity(todayActivityQ.data ?? []);

  // learning_events writes are deliberately fire-and-forget within a
  // session (a slow/failed log write must never stall the child's next
  // question — see the insert below). But the guided path's completion
  // check reads that same table moments later, right after the *last*
  // question's write fires, so without this the read can race ahead of
  // the write — especially for the very last question, whose insert has
  // the least time to land before handleSessionEnd runs. Tracking each
  // insert's promise here and awaiting them all in handleSessionEnd
  // closes that race without slowing down gameplay in between answers.
  const pendingLearningEventsRef = useRef([]);

  // Session Complete redesign — tracks which words crossed the exact same
  // mastery-celebration threshold (isRealMastery: mastery >= 80 AND
  // attempt_count >= 3) during THIS session, so the recap's "now shining"
  // chip highlight agrees with whenever the wordMastered celebration
  // actually fired (same check, just also recorded here instead of only
  // driving queueCelebration). Reset once consumed in handleSessionEnd.
  const masteredThisSessionRef = useRef([]);
  // Reused for the rewards row: GameEngine calls onXP (see handleXP) and
  // onSessionEnd back to back in the same synchronous branch, so storing
  // the values here as the very first (synchronous) line of handleXP
  // guarantees they're populated before handleSessionEnd reads them —
  // no need to change GameEngine's onXP/onSessionEnd contract.
  const lastSessionRewardsRef = useRef({ xp: 0, sparks: 0 });

  async function handleProgress({ word, correct, responseTimeMs, gameType: playedGameType }) {
    const before = words.find((w) => w.word === word);
    const prevMastery = before?.mastery ?? 0;
    const result = await saveWordProgress.mutateAsync({ word, correct });

    // Fire-and-forget with respect to gameplay pacing (not awaited here —
    // the child's next question is never blocked on this), but tracked so
    // handleSessionEnd can wait for it before trusting a subsequent read.
    // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 4 — attempt_number was previously
    // always hardcoded to 1, regardless of how many times this word had
    // actually been attempted. `result` (above) is the just-upserted
    // word_progress row `saveWordProgress.mutateAsync` already awaited, so
    // `result.attempt_count` is the word's true running attempt index at
    // the moment of THIS write — no extra session-local counter needed,
    // since the mutation's own `.select().single()` return value is
    // already the authoritative post-write count. Reliable from this
    // deploy forward only; historical rows are not backfilled (see
    // ATTEMPT_NUMBER section of the report).
    const insertPromise = supabase.from('learning_events').insert({
      user_id: user?.id,
      child_id: childId,
      word,
      game_type: playedGameType ?? gameType,
      correct,
      response_time_ms: responseTimeMs ?? null,
      attempt_number: result.attempt_count,
    }).then(({ error }) => { if (error) console.error('[learning_events]', error.message); });
    pendingLearningEventsRef.current.push(insertPromise);

    // Prompt 7 Part 6: Draw It's letter-tracing rebuild left the Moments
    // feed with no content source for this activity (no drawn artifact
    // to store anymore) — a completed trace is itself worth a lightweight
    // moment. Fire-and-forget like the learning_events insert above; a
    // failed moment insert shouldn't affect gameplay or word_progress.
    if ((playedGameType ?? gameType) === 'draw_it' && correct) {
      addTracingMoment.mutateAsync(word).catch((err) => console.error('[magic_moments]', err.message));
    }

    const wasMasteredBefore = isRealMastery(prevMastery, before?.attemptCount);
    const isMasteredNow = isRealMastery(result.mastery, result.attempt_count);
    if (!wasMasteredBefore && isMasteredNow) {
      masteredThisSessionRef.current.push(word);
      const wordData = before ?? { word };
      queueCelebration({ type: 'wordMastered', payload: { word: wordData.word } });

      const unit = wordData.unit;
      if (unit != null) {
        const unitWords = unitsById.get(unit) ?? [];
        const unitNowComplete = unitWords.length > 0 && unitWords.every((w) =>
          w.word === word ? isMasteredNow : isRealMastery(w.mastery, w.attemptCount)
        );
        if (unitNowComplete) queueCelebration({ type: 'unitBoss', payload: { unit } });
      }
    }

    // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 5 — scaffold-down v1. Every
    // `correct: false` reaching this point is already a "completed" error
    // (each activity's own errorless scaffold absorbs a first miss
    // internally and never calls onProgress for it — confirmed by reading
    // WordMatch/WordHunt/FindTheWord's own handleTap, which only fires
    // onAnswer on a SECOND miss). Two of those in a row on the same word,
    // with no correct completion between them, pins the word's next
    // activity to its easiest eligible tier until answered correctly there.
    setScaffoldState((prev) => {
      const entry = prev[word] ?? { consecutiveWrong: 0, pinnedActivityId: null };
      const playedId = playedGameType ?? gameType;
      if (correct) {
        const releasesPin = entry.pinnedActivityId != null && playedId === entry.pinnedActivityId;
        if (entry.consecutiveWrong === 0 && !releasesPin) return prev; // no-op, skip a pointless re-render
        return { ...prev, [word]: { consecutiveWrong: 0, pinnedActivityId: releasesPin ? null : entry.pinnedActivityId } };
      }
      const consecutiveWrong = entry.consecutiveWrong + 1;
      let pinnedActivityId = entry.pinnedActivityId;
      if (consecutiveWrong >= 2 && !pinnedActivityId) {
        const wordRecord = before ?? words.find((w) => w.word === word);
        pinnedActivityId = getEligibleActivities(wordRecord)[0]?.id ?? null;
        if (pinnedActivityId) fireScaffoldDownTelemetry(word, pinnedActivityId);
      }
      return { ...prev, [word]: { consecutiveWrong, pinnedActivityId } };
    });
  }

  // Fire-and-forget — telemetry must never affect gameplay. product_events
  // is service-role-only to write (migration 0032), so the client can't
  // insert directly; api/track.js is the one client-originated event
  // endpoint, with a strict server-side allowlist per event type.
  async function fireScaffoldDownTelemetry(word, activityId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ eventType: 'scaffold_down', childId, payload: { word, activityId } }),
      });
    } catch (err) {
      console.error('[scaffold_down telemetry]', err.message);
    }
  }

  async function handleXP(totalSessionXP) {
    // v1 Sparks formula: half of session XP, rounded — a simple, tunable
    // starting ratio (blueprint only specifies "earned on completions").
    const sparksEarned = Math.max(1, Math.round(totalSessionXP / 2));
    lastSessionRewardsRef.current = { xp: totalSessionXP, sparks: sparksEarned };
    await saveXP.mutateAsync(totalSessionXP);
    await earnSparks.mutateAsync(sparksEarned);
    return sparksEarned;
  }

  // Shared by both the natural session-end path and the early-exit path
  // (mission B3 requires exit to reuse the same completion mechanism, not
  // exit-specific logic). Only treats `playedGameType` as "done for
  // pathWord today" if pathWord was actually among the words answered
  // this session — closes a gap the natural-completion path alone used
  // to have (it assumed finishing *a* session for this gameType meant
  // pathWord's own node was done, which holds in practice since the
  // focus word is always reordered to the front of its own session, but
  // wasn't a hard guarantee — an early exit specifically can end a
  // session before pathWord was ever reached, so this can no longer be
  // assumed either path).
  async function checkAndFirePathComplete(wordsPlayedThisSession, playedGameType) {
    if (!pathWord || eligibleActivities.length === 0) return;
    const touchedPathWord = (wordsPlayedThisSession ?? []).some((w) => w.word === pathWord.word);
    if (!touchedPathWord) return;

    const wasAllDoneBefore = eligibleActivities.every((a) => todayActivitySummary.has(a.id));
    const isAllDoneNow = eligibleActivities.every((a) => a.id === playedGameType || todayActivitySummary.has(a.id));
    if (!wasAllDoneBefore && isAllDoneNow) {
      await earnSparks.mutateAsync(PATH_COMPLETE_SPARKS_BONUS);
      queueCelebration({ type: 'pathComplete', payload: { word: pathWord.word, sparksBonus: PATH_COMPLETE_SPARKS_BONUS } });
    }
  }

  async function handleSessionEnd({ wordsCorrect, totalWords, wordsPlayed }) {
    // Wait for every learning_events insert this session queued (see
    // handleProgress) before doing anything that reads that table or
    // hands off to a screen that will — otherwise the completion check
    // just below, and the guided path's own re-fetch after navigating
    // back, can race ahead of the *last* question's write, which is the
    // one with the least time to land before this function runs.
    const pending = pendingLearningEventsRef.current;
    pendingLearningEventsRef.current = [];
    await Promise.allSettled(pending);

    const masteredThisSession = masteredThisSessionRef.current;
    masteredThisSessionRef.current = [];

    setSessionResult({
      wordsCorrect,
      totalWords,
      wordsPlayed: wordsPlayed ?? [],
      masteredThisSession,
      ...lastSessionRewardsRef.current,
    });
    logSessionResult({ wordsCorrect, totalWords });
    const streakResult = await updateStreak.mutateAsync();
    if (STREAK_MILESTONES.includes(streakResult?.current_streak)) {
      queueCelebration({ type: 'streakMilestone', payload: { streak: streakResult.current_streak } });
    }

    await checkAndFirePathComplete(wordsPlayed, gameType);
    await queryClient.invalidateQueries({ queryKey: ['todayWordActivity', childId, pathWord?.word] });
  }

  // Universal exit-that-saves (mission B3) — called from GameEngine's
  // close button on EVERY activity, mid-session. Banks whatever progress
  // was earned so far through the exact same pipeline a natural session
  // end uses (learning_events already wrote per-question via
  // handleProgress; this awaits those writes, awards partial XP/Sparks,
  // runs the same path-completion check, and invalidates the same query)
  // — no exit-specific completion logic, and no navigation until all of
  // that has actually finished, so an early exit can't reintroduce the
  // fire-and-forget race Prompt 1 closed for the natural-completion path.
  async function handleExitEarly({ wordsCorrect, totalWords, wordsPlayed, partialXP, gameType: exitedGameType }) {
    const pending = pendingLearningEventsRef.current;
    pendingLearningEventsRef.current = [];
    await Promise.allSettled(pending);

    // Only bank XP/Sparks/streak if the child actually answered something
    // — an exit with zero progress shouldn't manufacture a reward.
    // Deliberately no completion (+20) or perfect (+50) bonus here (see
    // GameEngine's handleAnswer): those represent finishing a session,
    // which didn't happen.
    if (partialXP > 0) {
      await saveXP.mutateAsync(partialXP);
      const sparksEarned = Math.max(1, Math.round(partialXP / 2));
      await earnSparks.mutateAsync(sparksEarned);
      logSessionResult({ wordsCorrect, totalWords: (wordsPlayed ?? []).length || totalWords });
      const streakResult = await updateStreak.mutateAsync();
      if (STREAK_MILESTONES.includes(streakResult?.current_streak)) {
        queueCelebration({ type: 'streakMilestone', payload: { streak: streakResult.current_streak } });
      }
    }

    await checkAndFirePathComplete(wordsPlayed, exitedGameType);
    await queryClient.invalidateQueries({ queryKey: ['todayWordActivity', childId, pathWord?.word] });

    // Defensive reset in case this PlayScreen instance somehow survives
    // navigation (it shouldn't — CandyGalaxyShell unmounts it when navTab
    // changes — but a stale gameType/sessionResult would otherwise jump
    // straight back into a session instead of the guided path).
    setGameType(null);
    setSessionResult(null);
    onExit();
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
        {/* Prompt 7 Part 3: sticky — the Guided Path's activity list runs
            long (up to 11 nodes), and this was the only way back to Home
            while mid-scroll before this fix. `top: 0` pins it to the
            viewport edge; its own translucent chunk-sm background reads
            fine against the single continuous sky gradient behind it at
            any scroll position (no per-section color shift to clash with). */}
        <button onClick={onExit} style={{
          position: 'sticky', top: 12, zIndex: 20,
          background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 100, color: colors.cloud,
          padding: '10px 18px', minHeight: 44, fontFamily: fonts.display, fontWeight: 700, cursor: 'pointer', marginBottom: '1rem',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          boxShadow: shadows.chunkSm, backdropFilter: 'blur(6px)',
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
          pinnedActivityId={pathWord ? scaffoldState[pathWord.word]?.pinnedActivityId ?? null : null}
        />
        {planError && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.7)', marginTop: '1.5rem', fontSize: '.85rem' }}>
            Offline mode — your progress still saves normally.
          </div>
        )}
      </div>
    );
  }

  if (activePlanLoading || !activeSessionPlan) {
    return <GalaxyLoader message={isQuizBoss ? 'Summoning the Quiz Boss…' : 'Preparing your quest…'} />;
  }

  if (sessionResult) {
    return (
      <SessionComplete
        correctCount={sessionResult.wordsCorrect}
        total={sessionResult.totalWords}
        childName={activeChild?.name}
        wordsPlayed={sessionResult.wordsPlayed}
        masteredThisSession={sessionResult.masteredThisSession}
        xpEarned={sessionResult.xp}
        sparksEarned={sessionResult.sparks}
        masteredCount={masteredCount}
        totalWordCount={words.length}
        gameType={gameType}
        onPlayAgain={() => { setSessionResult(null); setGameType(null); }}
        onHome={onExit}
      />
    );
  }

  return (
    <GameEngine
      sessionPlan={activeSessionPlan}
      gameType={gameType}
      childName={activeChild?.name ?? 'Star Learner'}
      onProgress={handleProgress}
      onSessionEnd={handleSessionEnd}
      onHome={onExit}
      onExitEarly={handleExitEarly}
      onXP={handleXP}
      userId={user?.id}
      childId={childId}
    />
  );
}
