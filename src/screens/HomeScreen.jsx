import { useMemo } from 'react';
import { colors, fonts, skyGradient } from '../theme/tokens';
import CloudCard from '../components/candy/CloudCard';
import ChunkyButton from '../components/candy/ChunkyButton';
import Pill from '../components/candy/Pill';
import GalaxyPath from '../components/candy/GalaxyPath';
import WordBubble from '../components/candy/WordBubble';
import TrophyCard from '../components/candy/TrophyCard';
import NovaPortrait from '../components/candy/NovaPortrait';
import ChildSwitcher from '../components/candy/ChildSwitcher';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';
import { useWordSpeak } from '../lib/useWordSpeak';
import { useStoriesQuery, isNewStoryDue } from '../lib/queries/stories';
import { isRealMastery } from '../lib/masteryCalibration';
import WordArt from '../components/WordArt';
import { IconSpark, IconGalaxy, IconBubble, IconTrophy, IconStar, IconPlay } from '../components/icons';
import { AvatarRocket } from '../components/icons/AvatarGlyphs';
import { InterestCrown } from '../components/icons/InterestGlyphs';

const TrophyStarIcon = () => <IconStar size={30} color={colors.starText} />;
const TrophyRocketIcon = () => <svg viewBox="0 0 120 120" width="34" height="34"><AvatarRocket /></svg>;
const TrophyCrownIcon = () => <InterestCrown size={30} />;
const RocketInline = () => <svg viewBox="0 0 120 120" width="34" height="34"><AvatarRocket /></svg>;

const PATH_PREVIEW_SIZE = 7; // matches mockup D's "current unit + next" node count

function childDisplayName(activeChild, user) {
  if (activeChild?.name) return activeChild.name;
  const raw = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Star Learner';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function HomeScreen({ onStartQuest, onOpenWord, onAddChild, onOpenStory }) {
  const {
    user, children, activeChild, setActiveChildId, maxChildren,
    words, currentWord, masteredCount, sparks, streak, sleepyStars, isLoading,
  } = useCandyGalaxyData();
  const { speak, speakWord } = useWordSpeak(words);
  const sleepyWord = sleepyStars[0];
  const storiesQ = useStoriesQuery(activeChild?.id);
  const storyDue = !storiesQ.isLoading && isNewStoryDue(storiesQ.data);

  const pathWords = useMemo(() => {
    if (!currentWord) return [];
    const idx = words.findIndex((w) => w.word === currentWord.word);
    const start = Math.max(0, idx - 1);
    return words.slice(start, start + PATH_PREVIEW_SIZE).map((w) => ({
      ...w,
      status: w.premiumLocked ? 'premium' : isRealMastery(w.mastery, w.attemptCount) ? 'done' : w.word === currentWord.word ? 'current' : 'locked',
      percent: w.mastery,
    }));
  }, [words, currentWord]);

  const bubbleWords = useMemo(
    () => words.filter((w) => w.mastery > 0).slice(0, 8),
    [words]
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          Loading your galaxy… <IconSpark size={20} color={colors.sun} />
        </div>
      </div>
    );
  }

  return (
    <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, fontFamily: fonts.body, paddingBottom: 140 }}>
      <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto', padding: '0 20px' }}>

        {/* CHILD SWITCHER */}
        <div style={{ paddingTop: 20 }}>
          <ChildSwitcher
            children={children}
            activeChildId={activeChild?.id}
            onSelect={setActiveChildId}
            onAddChild={onAddChild}
            canAddChild={children.length < maxChildren}
            speak={speak}
          />
        </div>

        {/* HERO */}
        <div style={{ padding: '20px 0 8px' }}>
          <CloudCard tilt={-1}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.12 }}>
                  Hey <span style={{ color: colors.sky }}>{childDisplayName(activeChild, user)}!</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '2.1rem', color: colors.tang }}>
                    Ready to fly? <RocketInline />
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: colors.mutedInk, marginTop: 6, fontSize: '.92rem' }}>
                  {currentWord ? `Nova mapped your next word-star: "${currentWord.word}"` : 'Nova has a surprise for you today!'}
                </div>
              </div>
              <NovaPortrait pose="wave" size={72} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Pill value={streak.current_streak} label="Streak" variant="fire" speak={speak} />
              <Pill value={masteredCount} label="Words" variant="star" speak={speak} />
              <Pill value={sparks.balance} label="Sparks" variant="gem" speak={speak} />
            </div>
          </CloudCard>
          <div style={{
            textAlign: 'center', marginTop: 22, fontFamily: fonts.display, fontWeight: 800,
            fontSize: '.8rem', color: 'rgba(255,255,255,.8)',
          }}>
            ⌄ scroll — Nova flies with you ⌄
          </div>
        </div>

        {/* STAR KEEPER — fixed-interval review prompt (200MW_Product_Blueprint.md 2.4) */}
        {sleepyWord && (
          <div
            onClick={() => onStartQuest?.(sleepyWord)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,.14)', border: '2px dashed rgba(255,255,255,.35)',
              borderRadius: 26, padding: '14px 18px', marginTop: 18, cursor: 'pointer',
            }}
          >
            <NovaPortrait pose="wave" size={48} />
            <div style={{ color: colors.cloud }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.95rem' }}>
                Your "{sleepyWord.word}" star is getting sleepy!
              </div>
              <div style={{ fontSize: '.8rem', opacity: 0.85 }}>Tap to wake it up with a quick review</div>
            </div>
          </div>
        )}

        {/* NEW STORY FRIDAY — the Story Engine's on-demand entry point
            (200MW_Product_Blueprint.md 3.1). Surfaced once the newest
            story is missing or >6 days old; generated on tap, no cron. */}
        {storyDue && (
          <div
            onClick={onOpenStory}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: `linear-gradient(135deg, ${colors.bubble}33, ${colors.sky}33)`,
              border: `2px solid ${colors.bubble}`, borderRadius: 26, padding: '14px 18px',
              marginTop: 14, cursor: 'pointer',
            }}
          >
            <NovaPortrait pose="read" size={48} />
            <div style={{ color: colors.cloud }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.95rem' }}>
                New Story Friday!
              </div>
              <div style={{ fontSize: '.8rem', opacity: 0.85 }}>Nova wrote you a brand-new story</div>
            </div>
          </div>
        )}

        {/* TODAY'S MAGIC WORD */}
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', margin: '34px 0 14px', color: colors.cloud, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconSpark size={20} color={colors.sun} /> Today's Magic Word
        </div>
        {currentWord && (
          <div
            onClick={() => onStartQuest?.(currentWord)}
            style={{
              background: `linear-gradient(135deg, ${colors.mint}, #2BC9A4)`,
              color: colors.mintDeep,
              borderRadius: 32,
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 0 rgba(0,0,0,.16)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '.66rem', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Unit {currentWord.unit}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: fonts.display, fontSize: '3.1rem', fontWeight: 800, lineHeight: 1 }}>
                {currentWord.word}
              </div>
              <WordArt word={currentWord.word} teachingTrack={currentWord.teaching_track} size={56} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '.88rem', opacity: 0.75, marginTop: 4 }}>
              {currentWord.type === 'content' ? 'a Magic Word' : 'a helper word'}
            </div>
            <ChunkyButton onClick={() => onStartQuest?.(currentWord)} speak={speak} style={{ marginTop: 18 }}>
              <IconPlay size={14} color={colors.ink} /> Let's go!
            </ChunkyButton>
          </div>
        )}

        {/* GALAXY PATH PREVIEW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '34px 0 6px' }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', color: colors.cloud, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconGalaxy size={20} color={colors.cloud} /> Word Galaxy
          </div>
          <div style={{ background: colors.cloud, color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '.8rem', padding: '8px 16px', borderRadius: 100, boxShadow: '0 5px 0 rgba(0,0,0,.15)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <b style={{ color: colors.sky }}>{masteredCount}</b> / {words.length} <IconStar size={13} color={colors.sun} />
          </div>
        </div>
        <GalaxyPath words={pathWords} onNodeTap={(w) => onOpenWord?.(w)} speak={speakWord} />

        {/* WORD BUBBLES */}
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', margin: '34px 0 14px', color: colors.cloud, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconBubble size={20} color={colors.cloud} /> Your Word Bubbles
        </div>
        <div style={{ background: 'rgba(255,255,255,.1)', border: '2px dashed rgba(255,255,255,.3)', borderRadius: 30, padding: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {bubbleWords.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>Play your first quest to light up some words!</div>
          )}
          {bubbleWords.map((w, i) => (
            <WordBubble
              key={w.word}
              word={w.word}
              variant={w.type === 'content' ? 'sun' : 'mint'}
              delay={i * 0.05}
              speak={speakWord}
              onTap={() => onOpenWord?.(w)}
            />
          ))}
        </div>

        {/* TROPHY SHELF */}
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', margin: '34px 0 14px', color: colors.cloud, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconTrophy size={20} color={colors.cloud} /> Trophy Shelf
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10 }}>
          <TrophyCard Icon={TrophyStarIcon} name="7-Day Flame" stat="Streak" locked={streak.current_streak < 7} speak={speak} />
          <TrophyCard Icon={TrophyRocketIcon} name="First Quest" stat="Milestone" locked={masteredCount === 0} speak={speak} />
          <TrophyCard Icon={TrophyCrownIcon} name="Unit Boss" stat="Unit 1" locked={!words.slice(0, 8).length || !words.slice(0, 8).every(w => isRealMastery(w.mastery, w.attemptCount))} speak={speak} />
        </div>
      </div>
    </div>
  );
}
