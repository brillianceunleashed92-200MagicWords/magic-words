import { useMemo } from 'react';
import { colors, fonts, skyGradient } from '../theme/tokens';
import CloudCard from '../components/candy/CloudCard';
import ChunkyButton from '../components/candy/ChunkyButton';
import Pill from '../components/candy/Pill';
import GalaxyPath from '../components/candy/GalaxyPath';
import WordBubble from '../components/candy/WordBubble';
import TrophyCard from '../components/candy/TrophyCard';
import NovaPortrait from '../components/candy/NovaPortrait';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';
import { useSpeak } from '../lib/useSpeak';

const MASTERED_THRESHOLD = 80;
const PATH_PREVIEW_SIZE = 7; // matches mockup D's "current unit + next" node count

function childFirstName(user) {
  const raw = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Star Learner';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function HomeScreen({ onStartQuest, onOpenWord }) {
  const { user, words, currentWord, masteredCount, sparks, streak, isLoading } = useCandyGalaxyData();
  const { speak } = useSpeak();

  const pathWords = useMemo(() => {
    if (!currentWord) return [];
    const idx = words.findIndex((w) => w.word === currentWord.word);
    const start = Math.max(0, idx - 1);
    return words.slice(start, start + PATH_PREVIEW_SIZE).map((w) => ({
      ...w,
      status: w.mastery >= MASTERED_THRESHOLD ? 'done' : w.word === currentWord.word ? 'current' : 'locked',
      progressLabel: w.mastery >= MASTERED_THRESHOLD ? '★ 100%' : w.word === currentWord.word ? `▶ ${w.mastery}%` : '🔒',
    }));
  }, [words, currentWord]);

  const bubbleWords = useMemo(
    () => words.filter((w) => w.mastery > 0).slice(0, 8),
    [words]
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: skyGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontSize: '1.2rem' }}>Loading your galaxy… ✨</div>
      </div>
    );
  }

  return (
    <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, fontFamily: fonts.body, paddingBottom: 140 }}>
      <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto', padding: '0 20px' }}>

        {/* HERO */}
        <div style={{ padding: '52px 0 8px' }}>
          <CloudCard tilt={-1}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.12 }}>
                  Hey <span style={{ color: colors.sky }}>{childFirstName(user)}!</span>
                  <span style={{ display: 'block', fontSize: '2.1rem', color: colors.tang }}>Ready to fly? 🚀</span>
                </div>
                <div style={{ fontWeight: 600, color: colors.mutedInk, marginTop: 6, fontSize: '.92rem' }}>
                  {currentWord ? `Nova mapped your next word-star: "${currentWord.word}"` : 'Nova has a surprise for you today!'}
                </div>
              </div>
              <NovaPortrait pose="wave" size={72} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Pill icon="🔥" value={streak.current_streak} label="Streak" variant="fire" speak={speak} />
              <Pill icon="⭐" value={masteredCount} label="Words" variant="star" speak={speak} />
              <Pill icon="💎" value={sparks.balance} label="Sparks" variant="gem" speak={speak} />
            </div>
          </CloudCard>
          <div style={{
            textAlign: 'center', marginTop: 22, fontFamily: fonts.display, fontWeight: 800,
            fontSize: '.8rem', color: 'rgba(255,255,255,.8)',
          }}>
            ⌄ scroll — Nova flies with you ⌄
          </div>
        </div>

        {/* TODAY'S MAGIC WORD */}
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', margin: '34px 0 14px', color: colors.cloud, display: 'flex', gap: 8 }}>
          ✨ Today's Magic Word
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
            <div style={{ fontFamily: fonts.display, fontSize: '3.1rem', fontWeight: 800, lineHeight: 1 }}>
              {currentWord.word}
            </div>
            <div style={{ fontWeight: 700, fontSize: '.88rem', opacity: 0.75, marginTop: 4 }}>
              {currentWord.emoji} {currentWord.type === 'content' ? 'a Magic Word' : 'a helper word'}
            </div>
            <ChunkyButton onClick={() => onStartQuest?.(currentWord)} speak={speak} style={{ marginTop: 18 }}>
              ▶ Let's go!
            </ChunkyButton>
          </div>
        )}

        {/* GALAXY PATH PREVIEW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '34px 0 6px' }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', color: colors.cloud }}>🌌 Word Galaxy</div>
          <div style={{ background: colors.cloud, color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '.8rem', padding: '8px 16px', borderRadius: 100, boxShadow: '0 5px 0 rgba(0,0,0,.15)' }}>
            <b style={{ color: colors.sky }}>{masteredCount}</b> / {words.length} ⭐
          </div>
        </div>
        <GalaxyPath words={pathWords} onNodeTap={(w) => onOpenWord?.(w)} speak={speak} />

        {/* WORD BUBBLES */}
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', margin: '34px 0 14px', color: colors.cloud }}>🫧 Your Word Bubbles</div>
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
              speak={speak}
              onTap={() => onOpenWord?.(w)}
            />
          ))}
        </div>

        {/* TROPHY SHELF */}
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', margin: '34px 0 14px', color: colors.cloud }}>🏆 Trophy Shelf</div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10 }}>
          <TrophyCard icon="🌟" name="7-Day Flame" stat="Streak" locked={streak.current_streak < 7} speak={speak} />
          <TrophyCard icon="🚀" name="First Quest" stat="Milestone" locked={masteredCount === 0} speak={speak} />
          <TrophyCard icon="👑" name="Unit Boss" stat="Unit 1" locked={!words.slice(0, 8).length || !words.slice(0, 8).every(w => w.mastery >= MASTERED_THRESHOLD)} speak={speak} />
        </div>
      </div>
    </div>
  );
}
