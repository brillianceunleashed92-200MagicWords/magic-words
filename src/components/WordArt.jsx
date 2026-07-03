import { colors, fonts, wordArtColors as c } from '../theme/tokens';

// Word -> illustration system. See docs/DESIGN_BRIEF.md §1 for the locked
// palette and construction rule (chunky rounded shapes, ~4px darker-shade
// outline stroke, two dot eyes with a white highlight, small blush-pink
// cheeks, minimal internal detail).
//
// - Content-track words with an illustration below render that illustration.
// - Sight-track words (and any content-track word without one yet) render
//   the typographic fallback — never emoji, per docs/DESIGN_BRIEF.md §7.
//
// The dog/cat/bird SVGs are ported verbatim (same paths, same hexes) from
// docs/mockup-E2-no-emoji.html's style-reference strip — that file is the
// source of truth if these ever need to be re-extracted. (An "elephant"
// entry from that same strip was removed from REGISTRY — "elephant" isn't
// a curriculum word in the `words` table, so it was dead, unreachable art.)
//
// Action/adjective words (eat, fly, jump, run, big, sad) don't have an
// obvious single-referent noun to draw, so they share one recurring "Buddy"
// character (a round self-representing figure, gold/sun-colored so it reads
// as distinct from the animal cast) shown in the pose/expression for that
// word — one consistent visual grammar for the whole non-animal set rather
// than a different one-off metaphor per word.
//
// REGISTRY keys are the single mechanical truth for "which words have real
// art" on the client side — kept in sync with src/components/
// wordArtManifest.json (and the words.has_art DB column it seeds) by
// scripts/check-wordart-sync.mjs, run as part of the build. Add a word:
// write its <WordArt> component, add it to REGISTRY below, add it to the
// manifest, and add a migration setting has_art=true for it — the sync
// script fails loudly if REGISTRY and the manifest ever disagree.

function Blush({ cx, cy, rx = 6.5, ry = 4.2 }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c.blush} opacity=".8" />;
}
function Eye({ cx, cy, r = 6 }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={c.dot} />
      <circle cx={cx + r * 0.33} cy={cy - r * 0.37} r={r * 0.3} fill="#fff" />
    </>
  );
}
function GroundShadow({ cx = 60, cy = 100, rx = 30, ry = 7 }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(0,0,0,.12)" />;
}

function DogArt() {
  return (
    <>
      <GroundShadow />
      <path d="M28 66c-10-8-14-24-2-28 6-2 10 4 10 4" fill={c.dogFill} stroke={c.dogOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M92 66c10-8 14-24 2-28-6-2-10 4-10 4" fill={c.dogFill} stroke={c.dogOutline} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="60" cy="62" r="38" fill={c.dogFill} stroke={c.dogOutline} strokeWidth="4" />
      <ellipse cx="60" cy="78" rx="18" ry="14" fill={c.dogInner} />
      <Eye cx={46} cy={56} /><Eye cx={74} cy={56} />
      <ellipse cx="60" cy="76" rx="7" ry="5.5" fill={c.dogOutline} />
      <path d="M50 88q10 8 20 0" fill="none" stroke={c.dogOutline} strokeWidth="4" strokeLinecap="round" />
      <Blush cx={38} cy={70} /><Blush cx={82} cy={70} />
    </>
  );
}

function CatArt() {
  return (
    <>
      <GroundShadow />
      <path d="M34 42l-6-22 20 14z" fill={c.catFill} stroke={c.catOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M86 42l6-22-20 14z" fill={c.catFill} stroke={c.catOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M40 34l-2-9 9 6z" fill={c.catInner} />
      <path d="M80 34l2-9-9 6z" fill={c.catInner} />
      <circle cx="60" cy="64" r="36" fill={c.catFill} stroke={c.catOutline} strokeWidth="4" />
      <ellipse cx="60" cy="80" rx="17" ry="13" fill={c.catInner} />
      <Eye cx={47} cy={60} /><Eye cx={73} cy={60} />
      <path d="M60 74l-5 5h10z" fill={c.catOutline} />
      <Blush cx={38} cy={74} /><Blush cx={82} cy={74} />
    </>
  );
}

function BirdArt() {
  return (
    <>
      <GroundShadow cx={60} cy={102} rx={26} ry={6} />
      <ellipse cx="60" cy="76" rx="34" ry="28" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="4" />
      <path d="M30 80q-14-2-16-14q10 0 20 6z" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="66" cy="42" r="26" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="4" />
      <path d="M90 42l14 6-14 6z" fill={colors.sun} stroke={c.birdOutline} strokeWidth="3" strokeLinejoin="round" />
      <Eye cx={74} cy={36} r={5.5} />
      <Blush cx={52} cy={46} rx={6} ry={4} />
      <ellipse cx="46" cy="86" rx="14" ry="10" fill={c.birdInner} />
    </>
  );
}

function FrogArt() {
  return (
    <>
      <GroundShadow cx={60} cy={100} rx={32} ry={7} />
      <ellipse cx="60" cy="78" rx="36" ry="26" fill={c.frogFill} stroke={c.frogOutline} strokeWidth="4" />
      <ellipse cx="60" cy="96" rx="20" ry="10" fill={c.frogInner} />
      <circle cx="38" cy="46" r="15" fill={c.frogFill} stroke={c.frogOutline} strokeWidth="4" />
      <circle cx="82" cy="46" r="15" fill={c.frogFill} stroke={c.frogOutline} strokeWidth="4" />
      <Eye cx={38} cy={46} r={6} /><Eye cx={82} cy={46} r={6} />
      <path d="M42 82q18 12 36 0" fill="none" stroke={c.frogOutline} strokeWidth="4" strokeLinecap="round" />
      <Blush cx={34} cy={78} /><Blush cx={86} cy={78} />
    </>
  );
}

// Shared "Buddy" figure for action/adjective words.
function BuddyBase({ mouth, extra, scale = 1, cx = 60, cy = 62 }) {
  return (
    <g transform={scale !== 1 ? `translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})` : undefined}>
      <GroundShadow />
      <circle cx={cx} cy={cy} r="38" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      <Eye cx={cx - 14} cy={cy - 6} /><Eye cx={cx + 14} cy={cy - 6} />
      {mouth}
      <Blush cx={cx - 22} cy={cy + 8} /><Blush cx={cx + 22} cy={cy + 8} />
      {extra}
    </g>
  );
}

function EatArt() {
  return (
    <>
      <BuddyBase mouth={<ellipse cx="60" cy="72" rx="9" ry="8" fill={c.buddyOutline} />} />
      <g>
        <circle cx="92" cy="80" r="12" fill={colors.tang} stroke="#B35A28" strokeWidth="3" />
        <path d="M84 76a10 10 0 0016 0" fill={c.buddyInner} />
        <path d="M92 68q2-6 8-6" fill="none" stroke="#1C8C6C" strokeWidth="3" strokeLinecap="round" />
      </g>
    </>
  );
}

function FlyArt() {
  // Whole figure tilts into a glide; wings attach at the sides (not the
  // top, so they read as wings rather than ears) angled back like an
  // airplane in a dive, colored sky-blue so they're visually a distinct
  // "wing" element rather than a body part.
  return (
    <g transform="rotate(-14 60 62)">
      <BuddyBase
        mouth={<path d="M50 74q10 6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
        extra={
          <>
            <path d="M26 68q-30-2-34-22q22 2 34 18z" fill={colors.sky} stroke={c.buddyOutline} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M94 68q30-2 34-22q-22 2-34 18z" fill={colors.sky} stroke={c.buddyOutline} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M-6 40q10-2 16 3" fill="none" stroke={colors.sky} strokeWidth="4" strokeLinecap="round" opacity=".7" />
            <path d="M-4 52q9-2 15 3" fill="none" stroke={colors.sky} strokeWidth="4" strokeLinecap="round" opacity=".45" />
          </>
        }
      />
    </g>
  );
}

function JumpArt() {
  return (
    <BuddyBase
      cy={46}
      mouth={<path d="M50 58q10 7 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          {/* short bent legs reaching down to the ground puffs, clearly below the body */}
          <path d="M45 80q-6 10 -2 20" fill="none" stroke={c.buddyOutline} strokeWidth="9" strokeLinecap="round" />
          <path d="M75 80q6 10 2 20" fill="none" stroke={c.buddyOutline} strokeWidth="9" strokeLinecap="round" />
          {/* dust puffs where feet left the ground */}
          <ellipse cx="42" cy="102" rx="9" ry="4.5" fill="rgba(255,255,255,.55)" />
          <ellipse cx="78" cy="102" rx="9" ry="4.5" fill="rgba(255,255,255,.4)" />
        </>
      }
    />
  );
}

function RunArt() {
  return (
    <BuddyBase
      mouth={<path d="M50 74q10 6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          {/* two clearly separate running legs, attached at the bottom of the
              body and extending below it — front leg bent forward, back leg
              trails behind, no crossing */}
          <path d="M46 95q-8 6 -6 17" fill="none" stroke={c.buddyOutline} strokeWidth="9" strokeLinecap="round" />
          <path d="M74 95q10 4 12 15" fill="none" stroke={c.buddyOutline} strokeWidth="9" strokeLinecap="round" />
          {/* speed lines trailing behind */}
          <path d="M-4 50h20" stroke={colors.tang} strokeWidth="4" strokeLinecap="round" opacity=".75" />
          <path d="M0 62h18" stroke={colors.tang} strokeWidth="4" strokeLinecap="round" opacity=".5" />
          <path d="M4 74h14" stroke={colors.tang} strokeWidth="3" strokeLinecap="round" opacity=".35" />
        </>
      }
    />
  );
}

function BigArt() {
  // "big" reads via direct size comparison: one big buddy filling the frame
  // next to one tiny buddy, same character so the only variable is scale.
  return (
    <>
      <ellipse cx="66" cy="106" rx="42" ry="8" fill="rgba(0,0,0,.12)" />
      <circle cx="66" cy="58" r="52" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="5" />
      <Eye cx={48} cy={50} r={8} /><Eye cx={84} cy={50} r={8} />
      <path d="M42 74q24 14 48 0" fill="none" stroke={c.buddyOutline} strokeWidth="5" strokeLinecap="round" />
      <Blush cx={32} cy={64} rx={8} ry={5.2} /><Blush cx={100} cy={64} rx={8} ry={5.2} />

      <ellipse cx="18" cy="110" rx="10" ry="3" fill="rgba(0,0,0,.1)" />
      <circle cx="18" cy="100" r="10" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="3" />
      <Eye cx={15} cy={98} r={1.8} /><Eye cx={21} cy={98} r={1.8} />
      <path d="M13 103q5 3 10 0" fill="none" stroke={c.buddyOutline} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function SadArt() {
  return (
    <BuddyBase
      mouth={<path d="M50 80q10-6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={<path d="M78 62q3 8-2 13" fill={colors.sky} opacity=".8" />}
    />
  );
}

const REGISTRY = {
  dog: DogArt,
  cat: CatArt,
  bird: BirdArt,
  frog: FrogArt,
  eat: EatArt,
  fly: FlyArt,
  jump: JumpArt,
  run: RunArt,
  big: BigArt,
  sad: SadArt,
};

// Deterministic candy-color pick for the typographic tile, so a given word
// always gets the same background rather than a random one per render.
const CHIP_COLORS = [colors.mint, colors.bubble, colors.tang, colors.sun, colors.sky];
function chipColorFor(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
  return CHIP_COLORS[hash % CHIP_COLORS.length];
}

// Typographic treatment — sight-track words, and any content-track word
// without an illustration yet, land here. Large Baloo wordform on a candy
// rounded shape, plus a small abstract accent shape (never emoji).
function TypographicWord({ word }) {
  const bg = chipColorFor(word || '');
  const textColor = bg === colors.sun ? colors.starText : (bg === colors.mint ? colors.mintDeep : '#fff');
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label={word}>
      <rect x="6" y="6" width="108" height="108" rx="26" fill={bg} />
      <circle cx="98" cy="24" r="9" fill="rgba(255,255,255,.35)" />
      <circle cx="24" cy="98" r="6" fill="rgba(255,255,255,.25)" />
      <text
        x="60" y="68" textAnchor="middle" dominantBaseline="middle"
        fontFamily={fonts.display} fontWeight="800" fill={textColor}
        style={{ fontSize: word && word.length > 5 ? '22px' : '30px' }}
      >
        {word}
      </text>
    </svg>
  );
}

// word: the lowercase word string. teachingTrack: 'content' | 'sight' from
// the words table (see supabase/migrations/0014_words_teaching_track.sql) —
// optional. The registry only ever contains genuinely content-track words
// (see docs/DESIGN_BRIEF.md §1), so registry membership alone is already a
// safe signal; teachingTrack is an explicit override for the (currently
// nonexistent) case of a sight-track word colliding with a registry key,
// not a required prop every call site must correctly thread through.
export default function WordArt({ word, teachingTrack, size = 96, style }) {
  const key = (word || '').toLowerCase();
  const Illustration = teachingTrack === 'sight' ? undefined : REGISTRY[key];

  return (
    <div style={{ width: size, height: size, ...style }}>
      {Illustration ? (
        <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label={word}>
          <Illustration />
        </svg>
      ) : (
        <TypographicWord word={word} />
      )}
    </div>
  );
}

export { REGISTRY as WORD_ART_REGISTRY };
