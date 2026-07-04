import { colors, fonts, radii } from '../../theme/tokens';
import { IconTrophy, IconSpark } from '../icons';
import NovaSprite from './NovaSprite';
import WordArt from '../WordArt';
import QuestPathNode from './QuestPathNode';
import { getEligibleActivities } from '../../lib/activityDefs';
import { useTodayWordActivityQuery, summarizeTodayActivity } from '../../lib/queries/questProgress';
import { suggestActivity } from '../../lib/difficultyGovernor';

// Option B — the guided path. Replaces PlayScreen's static "Today's Quest"
// activity grid with a single vertical journey: one glowing "current" step,
// completed steps behind it with earned stars, locked steps ahead, a
// trophy reward at the end. See docs/OPTION_B_BUILD_REPORT.md for the full
// eligibility/sequencing/completion design rationale.
//
// Presentation only — does not itself write progress or fire celebrations;
// PlayScreen owns session lifecycle and queues the pathComplete celebration
// once `allDone` is true here (via the same today-activity query).
export default function QuestPath({ word, childId, recommendedRate, onSelectActivity, speak }) {
  const eligible = getEligibleActivities(word);
  const { data: todayRows, isLoading } = useTodayWordActivityQuery(childId, word?.word);
  const summary = summarizeTodayActivity(todayRows ?? []);

  const doneCount = eligible.filter((a) => summary.has(a.id)).length;
  const allDone = eligible.length > 0 && doneCount === eligible.length;
  const firstNotDoneIdx = eligible.findIndex((a) => !summary.has(a.id));
  const recommendedId = suggestActivity(recommendedRate ?? null);

  if (!word) return null;

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      {/* Hero header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.12)',
        borderRadius: radii.lg, padding: '14px 18px', marginBottom: '1.25rem',
      }}>
        <WordArt word={word.word} teachingTrack={word.teaching_track} size={52} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', color: colors.cloud }}>
            {word.word}
          </div>
          <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: '.8rem', color: 'rgba(255,255,255,.8)' }}>
            {isLoading ? 'Loading your quest…' : `${doneCount} of ${eligible.length} done today`}
          </div>
        </div>
        <NovaSprite state={allDone ? 'correct' : 'idle'} size={48} />
      </div>

      {/* Path */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {eligible.map((activity, idx) => {
          const isDone = summary.has(activity.id);
          const isCurrent = !isDone && idx === firstNotDoneIdx;
          const state = isDone ? 'completed' : isCurrent ? 'current' : 'locked';
          const stars = summary.get(activity.id)?.stars ?? 0;
          const showRecommended = isCurrent && activity.id === recommendedId;

          return (
            <div key={activity.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {idx > 0 && (
                <div style={{
                  width: 4, height: 20, borderRadius: 2,
                  background: summary.has(eligible[idx - 1].id) ? colors.mint : 'rgba(255,255,255,.25)',
                }} />
              )}
              <QuestPathNode
                activity={activity}
                state={state}
                stars={stars}
                // Locked nodes never navigate — QuestPathNode still speaks
                // the gentle nudge on tap ("Let's finish this one first!"),
                // it just has no onTap to call, so tapping a locked node is
                // never a dead end but also never opens the activity.
                onTap={state === 'locked' ? undefined : () => onSelectActivity(activity.id)}
                speak={speak}
              />
              {showRecommended && (
                <div style={{
                  fontFamily: fonts.body, fontWeight: 700, fontSize: '.65rem', color: colors.sun,
                  marginTop: 2, display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <IconSpark size={11} color={colors.sun} /> Nova recommends this one
                </div>
              )}
            </div>
          );
        })}

        {/* Reward */}
        <div style={{
          width: 4, height: 20, borderRadius: 2,
          background: allDone ? colors.mint : 'rgba(255,255,255,.25)',
        }} />
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: '18px 24px', borderRadius: radii.lg,
          background: allDone ? colors.sun : 'rgba(255,255,255,.12)',
          opacity: allDone ? 1 : 0.6, marginTop: 4,
        }}>
          <IconTrophy size={36} color={allDone ? colors.starText : 'rgba(255,255,255,.7)'} />
          <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.9rem', color: allDone ? colors.starText : 'rgba(255,255,255,.85)' }}>
            {allDone ? 'Quest complete!' : `${eligible.length - doneCount} more to go`}
          </span>
        </div>
      </div>
    </div>
  );
}
