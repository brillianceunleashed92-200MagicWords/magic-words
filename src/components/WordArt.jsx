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
// Radially-positioned tufts (computed, not hand-picked coordinates) — used
// by LionArt's mane so the ring is reliably even.
function ManeTufts({ cx = 60, cy = 62, r = 40, count = 10, tuftR = 11, color }) {
  const tufts = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    tufts.push(
      <ellipse key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} rx={tuftR} ry={tuftR * 0.82} fill={color} />
    );
  }
  return <>{tufts}</>;
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

// ─── Unit 1 objects (ball, book, cup) — inanimate, no face ─────────────────
// Objects don't get the eyes/blush anthropomorphized-character treatment
// that every animal below does — a face on a book or a ball reads as
// confusing, not cute. Same chunky-shape/stroke/fill-outline-inner-triad
// construction language, just without a character's face.

function FishArt() {
  return (
    <>
      <GroundShadow cx={60} cy={100} rx={28} ry={6} />
      <path d="M22 66q-10-8-14-18q10 2 16 10z" fill={c.fishFill} stroke={c.fishOutline} strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="66" cy="60" rx="38" ry="26" fill={c.fishFill} stroke={c.fishOutline} strokeWidth="4" />
      <path d="M56 30q8-8 20-6q-4 8-14 10z" fill={c.fishFill} stroke={c.fishOutline} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="72" cy="64" rx="15" ry="10" fill={c.fishInner} />
      <Eye cx={86} cy={52} r={6} />
      <Blush cx={68} cy={64} rx={7} ry={4.5} />
      <circle cx="16" cy="30" r="3" fill={c.fishInner} opacity=".6" />
      <circle cx="8" cy="22" r="2" fill={c.fishInner} opacity=".4" />
    </>
  );
}

function BearArt() {
  return (
    <>
      <GroundShadow />
      <circle cx="30" cy="34" r="14" fill={c.bearFill} stroke={c.bearOutline} strokeWidth="4" />
      <circle cx="90" cy="34" r="14" fill={c.bearFill} stroke={c.bearOutline} strokeWidth="4" />
      <circle cx="30" cy="34" r="6" fill={c.bearInner} />
      <circle cx="90" cy="34" r="6" fill={c.bearInner} />
      <circle cx="60" cy="62" r="40" fill={c.bearFill} stroke={c.bearOutline} strokeWidth="4" />
      <ellipse cx="60" cy="76" rx="20" ry="15" fill={c.bearInner} />
      <Eye cx={45} cy={56} /><Eye cx={75} cy={56} />
      <ellipse cx="60" cy="74" rx="8" ry="6" fill={c.bearOutline} />
      <path d="M50 88q10 8 20 0" fill="none" stroke={c.bearOutline} strokeWidth="4" strokeLinecap="round" />
      <Blush cx={36} cy={70} /><Blush cx={84} cy={70} />
    </>
  );
}

function BallArt() {
  return (
    <>
      <GroundShadow />
      <circle cx="60" cy="62" r="42" fill={c.ballFill} stroke={c.ballOutline} strokeWidth="4" />
      <path d="M60 20a42 42 0 0136 63l-36-21z" fill={colors.sun} />
      <path d="M60 20a42 42 0 00-36 63l36-21z" fill={colors.mint} />
      <ellipse cx="46" cy="44" rx="11" ry="7" fill="#fff" opacity=".4" />
    </>
  );
}

function BookArt() {
  return (
    <>
      <GroundShadow />
      <path d="M60 34l-38 8v52l38-8z" fill={c.bookFill} stroke={c.bookOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 34l38 8v52l-38-8z" fill={c.bookFill} stroke={c.bookOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 34v52" stroke={c.bookOutline} strokeWidth="3" />
      <rect x="30" y="50" width="18" height="4" rx="2" fill={c.bookInner} />
      <rect x="30" y="60" width="14" height="4" rx="2" fill={c.bookInner} />
      <rect x="72" y="50" width="18" height="4" rx="2" fill={c.bookInner} />
      <rect x="72" y="60" width="14" height="4" rx="2" fill={c.bookInner} />
    </>
  );
}

function CupArt() {
  return (
    <>
      <GroundShadow />
      <path d="M34 40h44l-4 46q-1 8-9 8h-22q-8 0-9-8z" fill={c.cupFill} stroke={c.cupOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M78 48q16-4 16 10t-16 12" fill="none" stroke={c.cupOutline} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="60" cy="42" rx="24" ry="6" fill={c.cupInner} stroke={c.cupOutline} strokeWidth="3" />
      <path d="M42 56q6 6 0 12" fill="none" stroke={c.cupInner} strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </>
  );
}

// ─── Unit 2 animals ─────────────────────────────────────────────────────
// Front-facing circle-head base (same construction as dog/cat/bear) for
// horse/lion/rabbit/duck/cow/pig/monkey, differentiated by ear shape,
// top-of-head decoration, and snout treatment — turtle/shark/ant/bee use
// a body-based construction instead since a face-forward head doesn't
// read as those animals.

function HorseArt() {
  return (
    <>
      <GroundShadow />
      <path d="M40 46q-4-22 20-24q4 6-2 12q10 0 12 10z" fill={c.horseFill} stroke={c.horseOutline} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="60" cy="62" r="36" fill={c.horseFill} stroke={c.horseOutline} strokeWidth="4" />
      <ellipse cx="60" cy="80" rx="16" ry="13" fill={c.horseInner} />
      <Eye cx={46} cy={56} /><Eye cx={74} cy={56} />
      <ellipse cx="60" cy="82" rx="6" ry="5" fill={c.horseOutline} />
      <Blush cx={38} cy={70} /><Blush cx={82} cy={70} />
    </>
  );
}

function LionArt() {
  return (
    <>
      <GroundShadow />
      <ManeTufts color={c.lionOutline} />
      <circle cx="60" cy="62" r="34" fill={c.lionFill} stroke={c.lionOutline} strokeWidth="4" />
      <ellipse cx="60" cy="78" rx="16" ry="13" fill={c.lionInner} />
      <Eye cx={47} cy={56} /><Eye cx={73} cy={56} />
      <ellipse cx="60" cy="76" rx="6" ry="5" fill={c.lionOutline} />
      <Blush cx={38} cy={70} /><Blush cx={82} cy={70} />
    </>
  );
}

function RabbitArt() {
  return (
    <>
      <GroundShadow />
      <ellipse cx="42" cy="24" rx="10" ry="26" fill={c.rabbitFill} stroke={c.rabbitOutline} strokeWidth="3.5" />
      <ellipse cx="78" cy="24" rx="10" ry="26" fill={c.rabbitFill} stroke={c.rabbitOutline} strokeWidth="3.5" />
      <ellipse cx="42" cy="26" rx="4.5" ry="17" fill={c.rabbitInner} />
      <ellipse cx="78" cy="26" rx="4.5" ry="17" fill={c.rabbitInner} />
      <circle cx="60" cy="66" r="34" fill={c.rabbitFill} stroke={c.rabbitOutline} strokeWidth="4" />
      <ellipse cx="60" cy="82" rx="15" ry="11" fill={c.rabbitInner} />
      <Eye cx={47} cy={60} /><Eye cx={73} cy={60} />
      <ellipse cx="60" cy="78" rx="5" ry="4" fill={c.rabbitOutline} />
      <Blush cx={38} cy={74} /><Blush cx={82} cy={74} />
    </>
  );
}

function DuckArt() {
  return (
    <>
      <GroundShadow />
      <ellipse cx="60" cy="92" rx="26" ry="12" fill={c.duckFill} stroke={c.duckOutline} strokeWidth="4" />
      <circle cx="60" cy="56" r="34" fill={c.duckFill} stroke={c.duckOutline} strokeWidth="4" />
      <path d="M32 76q28 16 56 0v10q-28 14-56 0z" fill={colors.tang} stroke={c.duckOutline} strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="60" cy="80" rx="6" ry="2.5" fill={c.duckOutline} opacity=".4" />
      <Eye cx={46} cy={50} /><Eye cx={74} cy={50} />
      <Blush cx={38} cy={62} /><Blush cx={82} cy={62} />
    </>
  );
}

function CowArt() {
  return (
    <>
      <GroundShadow />
      <path d="M32 32q-8-10 0-16q6 4 6 12z" fill={c.cowOutline} />
      <path d="M88 32q8-10 0-16q-6 4-6 12z" fill={c.cowOutline} />
      <circle cx="60" cy="62" r="36" fill={c.cowFill} stroke={c.cowOutline} strokeWidth="4" />
      <ellipse cx="38" cy="44" rx="10" ry="8" fill={c.cowInner} opacity=".85" />
      <ellipse cx="82" cy="72" rx="8" ry="10" fill={c.cowInner} opacity=".85" />
      <ellipse cx="60" cy="80" rx="18" ry="14" fill="#fff" stroke={c.cowOutline} strokeWidth="3" />
      <Eye cx={46} cy={56} /><Eye cx={74} cy={56} />
      <circle cx="53" cy="82" r="3" fill={c.cowOutline} /><circle cx="67" cy="82" r="3" fill={c.cowOutline} />
      <Blush cx={36} cy={68} /><Blush cx={84} cy={68} />
    </>
  );
}

function PigArt() {
  return (
    <>
      <GroundShadow />
      <path d="M34 38l-10-14 18 4z" fill={c.pigFill} stroke={c.pigOutline} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M86 38l10-14-18 4z" fill={c.pigFill} stroke={c.pigOutline} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="60" cy="62" r="36" fill={c.pigFill} stroke={c.pigOutline} strokeWidth="4" />
      <ellipse cx="60" cy="78" rx="17" ry="13" fill={c.pigInner} stroke={c.pigOutline} strokeWidth="3" />
      <circle cx="54" cy="78" r="3" fill={c.pigOutline} /><circle cx="66" cy="78" r="3" fill={c.pigOutline} />
      <Eye cx={46} cy={56} /><Eye cx={74} cy={56} />
      <Blush cx={38} cy={68} /><Blush cx={82} cy={68} />
    </>
  );
}

function TurtleArt() {
  return (
    <>
      <GroundShadow cx={64} cy={102} rx={36} ry={7} />
      <circle cx="46" cy="94" r="9" fill={c.turtleFill} stroke={c.turtleOutline} strokeWidth="3" />
      <circle cx="86" cy="94" r="9" fill={c.turtleFill} stroke={c.turtleOutline} strokeWidth="3" />
      <ellipse cx="66" cy="66" rx="42" ry="32" fill={c.turtleFill} stroke={c.turtleOutline} strokeWidth="4" />
      <ellipse cx="66" cy="66" rx="30" ry="22" fill={c.turtleInner} />
      <path d="M66 44v44M44 66h44M52 50l28 32M80 50l-28 32" stroke={c.turtleOutline} strokeWidth="2" opacity=".4" />
      <circle cx="24" cy="58" r="18" fill={c.turtleFill} stroke={c.turtleOutline} strokeWidth="3.5" />
      <ellipse cx="22" cy="64" rx="8" ry="6.5" fill={c.turtleInner} />
      <Eye cx={18} cy={54} r={5.5} />
      <Blush cx={12} cy={66} rx={5} ry={3.5} />
    </>
  );
}

function MonkeyArt() {
  return (
    <>
      <GroundShadow />
      <circle cx="28" cy="56" r="16" fill={c.monkeyFill} stroke={c.monkeyOutline} strokeWidth="3.5" />
      <circle cx="92" cy="56" r="16" fill={c.monkeyFill} stroke={c.monkeyOutline} strokeWidth="3.5" />
      <circle cx="28" cy="56" r="8" fill={c.monkeyInner} />
      <circle cx="92" cy="56" r="8" fill={c.monkeyInner} />
      <circle cx="60" cy="62" r="36" fill={c.monkeyFill} stroke={c.monkeyOutline} strokeWidth="4" />
      <ellipse cx="60" cy="72" rx="22" ry="20" fill={c.monkeyInner} />
      <Eye cx={48} cy={60} /><Eye cx={72} cy={60} />
      <ellipse cx="60" cy="78" rx="6" ry="4.5" fill={c.monkeyOutline} />
      <Blush cx={40} cy={76} /><Blush cx={80} cy={76} />
    </>
  );
}

function SharkArt() {
  return (
    <>
      <GroundShadow cx={60} cy={98} rx={30} ry={6} />
      <path d="M60 30q10-16 16-4q-4 8-12 10z" fill={c.sharkFill} stroke={c.sharkOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M20 70q-12 6-14 18q12 0 20-8z" fill={c.sharkFill} stroke={c.sharkOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 40q40-14 66 20q-26 30-66 14q-10-16 0-34z" fill={c.sharkFill} stroke={c.sharkOutline} strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="46" cy="58" rx="16" ry="10" fill={c.sharkInner} />
      <Eye cx={40} cy={50} r={5.5} />
      <Blush cx={54} cy={62} rx={6} ry={4} />
    </>
  );
}

function AntArt() {
  return (
    <>
      <GroundShadow cx={62} cy={96} rx={30} ry={6} />
      <path d="M46 34q-6-10 2-16M74 34q6-10-2-16" fill="none" stroke={c.antOutline} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="60" cy="38" r="16" fill={c.antFill} stroke={c.antOutline} strokeWidth="3.5" />
      <circle cx="60" cy="66" r="18" fill={c.antFill} stroke={c.antOutline} strokeWidth="3.5" />
      <ellipse cx="60" cy="94" rx="22" ry="18" fill={c.antFill} stroke={c.antOutline} strokeWidth="3.5" />
      <path d="M46 62l-20 10M74 62l20 10M42 76l-18 14M78 76l18 14M46 90l-18 12M74 90l18 12" stroke={c.antOutline} strokeWidth="3" strokeLinecap="round" />
      <Eye cx={53} cy={36} r={4.5} /><Eye cx={67} cy={36} r={4.5} />
      <Blush cx={48} cy={44} rx={4.5} ry={3} /><Blush cx={72} cy={44} rx={4.5} ry={3} />
    </>
  );
}

function BeeArt() {
  return (
    <>
      <GroundShadow cx={62} cy={98} rx={32} ry={6} />
      <ellipse cx="34" cy="52" rx="20" ry="14" fill={c.birdInner} opacity=".55" stroke={c.beeOutline} strokeWidth="2" />
      <ellipse cx="86" cy="52" rx="20" ry="14" fill={c.birdInner} opacity=".55" stroke={c.beeOutline} strokeWidth="2" />
      <circle cx="60" cy="42" r="20" fill={c.beeFill} stroke={c.beeOutline} strokeWidth="3.5" />
      <ellipse cx="60" cy="80" rx="30" ry="26" fill={c.beeFill} stroke={c.beeOutline} strokeWidth="4" />
      <path d="M32 68h56M28 82h64M34 96h52" stroke={c.beeInner} strokeWidth="9" strokeLinecap="round" />
      <path d="M60 104q4 8 0 14q-4-6 0-14z" fill={c.beeOutline} />
      <Eye cx={52} cy={40} r={5} /><Eye cx={68} cy={40} r={5} />
      <Blush cx={44} cy={48} rx={4.5} ry={3} /><Blush cx={76} cy={48} rx={4.5} ry={3} />
    </>
  );
}

// Shared "Buddy" figure for action/adjective words.
function BuddyBase({ mouth, extra, eyes, scale = 1, cx = 60, cy = 62 }) {
  return (
    <g transform={scale !== 1 ? `translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})` : undefined}>
      <GroundShadow />
      <circle cx={cx} cy={cy} r="38" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      {eyes ?? (<><Eye cx={cx - 14} cy={cy - 6} /><Eye cx={cx + 14} cy={cy - 6} /></>)}
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

// wordart-batch-1, Unit 3 (swim, dance, sing)
function SwimArt() {
  return (
    <g transform="rotate(-8 60 62)">
      <BuddyBase
        mouth={<path d="M50 74q10 6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
        extra={
          <>
            <path d="M20 70q-14 4-18-8" fill="none" stroke={c.buddyOutline} strokeWidth="7" strokeLinecap="round" />
            <path d="M100 70q14 4 18-8" fill="none" stroke={c.buddyOutline} strokeWidth="7" strokeLinecap="round" />
            <path d="M10 92q14-4 24 2q14-6 24 2q14-6 24 2q14-6 24 2" fill="none" stroke={colors.sky} strokeWidth="4" strokeLinecap="round" opacity=".6" />
          </>
        }
      />
    </g>
  );
}

function DanceArt() {
  // Raised arms alone read as generic excitement, not specifically
  // "dance" — a circular motion-swirl beneath the feet (a spin trail,
  // same visual grammar as run's speed lines) is the cue that makes this
  // read as mid-twirl rather than just "happy."
  return (
    <BuddyBase
      mouth={<path d="M50 74q10 6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          <path d="M30 50q-16-10-10-24" fill="none" stroke={c.buddyOutline} strokeWidth="7" strokeLinecap="round" />
          <path d="M90 50q16-10 10-24" fill="none" stroke={c.buddyOutline} strokeWidth="7" strokeLinecap="round" />
          <path d="M20 20q10 6 8 16" fill="none" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" opacity=".7" />
          <path d="M100 20q-10 6-8 16" fill="none" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" opacity=".7" />
          <path d="M30 98q30 14 60 0" fill="none" stroke={colors.bubble} strokeWidth="4" strokeLinecap="round" opacity=".65" />
          <path d="M22 92q38 20 76 0" fill="none" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" opacity=".4" />
        </>
      }
    />
  );
}

function SingArt() {
  return (
    <BuddyBase
      mouth={<ellipse cx="60" cy="74" rx="10" ry="9" fill={c.buddyOutline} />}
      extra={
        <>
          <circle cx="96" cy="40" r="5" fill={colors.bubble} />
          <path d="M101 40v-18" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" />
          <path d="M101 22q8 0 8 6" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="30" r="4" fill={colors.sky} />
          <path d="M24 30v-14" stroke={colors.sky} strokeWidth="2.5" strokeLinecap="round" />
        </>
      }
    />
  );
}

// wordart-batch-1, Unit 4 (sleep, sit)
function SleepArt() {
  return (
    <BuddyBase
      eyes={
        <>
          <path d="M40 56q6 4 12 0" fill="none" stroke={c.buddyOutline} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M68 56q6 4 12 0" fill="none" stroke={c.buddyOutline} strokeWidth="3.5" strokeLinecap="round" />
        </>
      }
      mouth={<ellipse cx="60" cy="74" rx="6" ry="4" fill={c.buddyOutline} />}
      extra={
        <>
          {/* ascending drift-off-to-sleep bubbles — deliberately plain circles, not the letter "Z" (no letterforms in illustrations) */}
          <circle cx="92" cy="28" r="4" fill={colors.sky} opacity=".8" />
          <circle cx="102" cy="18" r="6" fill={colors.sky} opacity=".6" />
          <circle cx="114" cy="6" r="8" fill={colors.sky} opacity=".4" />
        </>
      }
    />
  );
}

function SitArt() {
  return (
    <BuddyBase
      cy={54}
      mouth={<path d="M50 66q10 6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <path d="M40 88q0 14 8 14h24q8 0 8-14" fill="none" stroke={c.buddyOutline} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      }
    />
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
  swim: SwimArt,
  dance: DanceArt,
  sing: SingArt,
  sleep: SleepArt,
  sit: SitArt,
  fly: FlyArt,
  jump: JumpArt,
  run: RunArt,
  big: BigArt,
  sad: SadArt,
  // wordart-batch-1, Unit 1
  fish: FishArt,
  bear: BearArt,
  ball: BallArt,
  book: BookArt,
  cup: CupArt,
  // wordart-batch-1, Unit 2
  horse: HorseArt,
  lion: LionArt,
  rabbit: RabbitArt,
  duck: DuckArt,
  cow: CowArt,
  pig: PigArt,
  turtle: TurtleArt,
  monkey: MonkeyArt,
  shark: SharkArt,
  ant: AntArt,
  bee: BeeArt,
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
