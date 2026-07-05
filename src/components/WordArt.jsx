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

// DuckArt — was WRONG in the audit: the old bill sat flush against the
// bottom of the head circle (y 76-90, entirely inside the head's own
// bounding circle, y 22-90), so it read as a chin-stripe, not a
// protruding bill. Fixed the same way BirdArt's beak already works
// (~line 100): the bill now extends past the head circle's edge, which is
// what actually reads as "beak/bill" in this construction language.
function DuckArt() {
  return (
    <>
      <GroundShadow />
      <ellipse cx="60" cy="92" rx="26" ry="12" fill={c.duckFill} stroke={c.duckOutline} strokeWidth="4" />
      <circle cx="60" cy="54" r="34" fill={c.duckFill} stroke={c.duckOutline} strokeWidth="4" />
      <ellipse cx="60" cy="90" rx="24" ry="12" fill={colors.tang} stroke={c.duckOutline} strokeWidth="3.5" />
      <path d="M37 90h46" stroke={c.duckOutline} strokeWidth="2.5" opacity=".55" />
      <Eye cx={46} cy={46} /><Eye cx={74} cy={46} />
      <Blush cx={36} cy={58} /><Blush cx={84} cy={58} />
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

// SharkArt — was WRONG in the audit: same rounded-body + single small fin
// construction as FishArt, differing only by hue, read as "another fish."
// Fixed with two cues fish doesn't have: a large, unmistakably triangular
// dorsal fin (fish's fin notch is small) and a body that tapers to a
// pointed snout (fish's body is a round ellipse throughout). Friendly per
// the age range — rounded fin tips, no teeth.
function SharkArt() {
  return (
    <>
      <GroundShadow cx={60} cy={98} rx={30} ry={6} />
      <path d="M56 22q16-20 22 0q-6 10-20 10z" fill={c.sharkFill} stroke={c.sharkOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M18 68q-14 4-16 20q14 0 22-10z" fill={c.sharkFill} stroke={c.sharkOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M26 60q2-28 38-30q30 0 42 28q-10 30-42 32q-36-2-38-30z" fill={c.sharkFill} stroke={c.sharkOutline} strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="46" cy="58" rx="15" ry="10" fill={c.sharkInner} />
      <Eye cx={42} cy={50} r={5.5} />
      <Blush cx={54} cy={64} rx={6} ry={4} />
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

// ─── Unit 6 (Family: baby, boy, girl, man, woman) ──────────────────────────
// Person figures share the same head fill/outline as Buddy below (keeps
// them visually part of the same "cast") with plain, non-gender-coded
// clothing (reused bookFill/bookOutline hue) and neutral dark hair (reused
// antFill/antOutline) — the only differentiators are body size/proportion
// (child vs. adult) and hairstyle silhouette (short = boy/man, long =
// girl/woman), never clothing color or skin tone. mom/dad/friend are
// deliberately not drawn (see docs/wordart-batch-2-depictability.md) —
// each would be pixel-identical to woman/man/either-of-these with no
// independent visual signal, a real answer-leak risk, not a missed
// opportunity.
const PERSON_CLOTHES = c.bookFill;
const PERSON_CLOTHES_DEEP = c.bookOutline;
const HAIR = c.antFill;
const HAIR_DEEP = c.antOutline;

function BabyArt() {
  return (
    <>
      <GroundShadow cx={60} cy={104} rx={26} ry={6} />
      <ellipse cx="60" cy="90" rx="28" ry="22" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="4" />
      <circle cx="60" cy="52" r="30" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      <path d="M42 40q18-12 36 0" fill="none" stroke={HAIR_DEEP} strokeWidth="5" strokeLinecap="round" />
      <Eye cx={48} cy={50} r={6.5} /><Eye cx={72} cy={50} r={6.5} />
      <ellipse cx="60" cy="64" rx="6" ry="4.5" fill={c.buddyOutline} />
      <Blush cx={38} cy={60} /><Blush cx={82} cy={60} />
    </>
  );
}

// Child figures (boy/girl) are drawn at a deliberately dramatic size
// contrast against adults (man/woman) — not a subtle proportion tweak.
// Once rendered independently at a fixed tile size (WordMatch/SoundMatch
// render every option at the same pixel size), a small proportion
// difference alone doesn't read reliably — confirmed by testing at actual
// in-game tile sizes (72-92px) in the throwaway render harness, not
// assumed. Fixed by (a) scaling children down hard around a shared ground
// anchor so they sit noticeably smaller with visible margin, adults up to
// nearly fill the frame edge-to-edge (same technique BigArt/SmallArt uses
// for that pair, adapted since these are 4 independent single-figure
// images, not one paired image), and (b) `man` gets a simple mustache — a
// standard, unambiguous adult-male cue that doesn't depend on size at all
// (the single most reliable pictogram convention for this, worldwide, not
// a size-dependent judgment call).

function BoyArt() {
  return (
    <g transform="translate(60,110) scale(.68) translate(-60,-110)">
      <GroundShadow cx={60} cy={112} rx={24} ry={6} />
      <rect x="44" y="86" width="12" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="64" y="86" width="12" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="34" y="62" width="52" height="34" rx="17" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="4" />
      <circle cx="60" cy="46" r="26" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      <path d="M36 44q0-24 24-24t24 24q-10-10-24-10t-24 10z" fill={HAIR} stroke={HAIR_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <Eye cx={50} cy={48} /><Eye cx={70} cy={48} />
      <path d="M50 60q10 6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="3.5" strokeLinecap="round" />
      <Blush cx={40} cy={56} /><Blush cx={80} cy={56} />
    </g>
  );
}

function GirlArt() {
  return (
    <g transform="translate(60,110) scale(.68) translate(-60,-110)">
      <GroundShadow cx={60} cy={112} rx={24} ry={6} />
      <rect x="44" y="86" width="12" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="64" y="86" width="12" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="34" y="62" width="52" height="34" rx="17" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="4" />
      <path d="M60 18a28 28 0 00-28 28v22q0 5 5 5l2-16a28 28 0 0142 0l2 16q5 0 5-5v-22a28 28 0 00-28-28z" fill={HAIR} stroke={HAIR_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="46" r="26" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      <Eye cx={50} cy={48} /><Eye cx={70} cy={48} />
      <path d="M50 60q10 6 20 0" fill="none" stroke={c.buddyOutline} strokeWidth="3.5" strokeLinecap="round" />
      <Blush cx={40} cy={56} /><Blush cx={80} cy={56} />
    </g>
  );
}

function ManArt() {
  return (
    <g transform="translate(60,110) scale(1.08) translate(-60,-110)">
      <GroundShadow cx={60} cy={114} rx={28} ry={6} />
      <rect x="40" y="90" width="14" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="66" y="90" width="14" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="28" y="60" width="64" height="38" rx="19" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="4" />
      <circle cx="60" cy="40" r="28" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      <path d="M32 38q0-26 28-26t28 26q-12-11-28-11t-28 11z" fill={HAIR} stroke={HAIR_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <Eye cx={49} cy={42} /><Eye cx={71} cy={42} />
      {/* mustache — drawn above the mouth, unambiguous adult-male cue */}
      <path d="M46 50q7 5 14 0q7 5 14 0" fill="none" stroke={HAIR_DEEP} strokeWidth="4" strokeLinecap="round" />
      <path d="M48 54q12 6 24 0" fill="none" stroke={c.buddyOutline} strokeWidth="3.5" strokeLinecap="round" />
      <Blush cx={37} cy={50} /><Blush cx={83} cy={50} />
    </g>
  );
}

function WomanArt() {
  return (
    <g transform="translate(60,110) scale(1.08) translate(-60,-110)">
      <GroundShadow cx={60} cy={114} rx={28} ry={6} />
      <rect x="40" y="90" width="14" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="66" y="90" width="14" height="26" rx="6" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="3.5" />
      <rect x="28" y="60" width="64" height="38" rx="19" fill={PERSON_CLOTHES} stroke={PERSON_CLOTHES_DEEP} strokeWidth="4" />
      <path d="M60 10a30 30 0 00-30 30v24q0 5 5 5l2-17a30 30 0 0146 0l2 17q5 0 5-5v-24a30 30 0 00-30-30z" fill={HAIR} stroke={HAIR_DEEP} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="40" r="28" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      <Eye cx={49} cy={42} /><Eye cx={71} cy={42} />
      <path d="M48 54q12 6 24 0" fill="none" stroke={c.buddyOutline} strokeWidth="3.5" strokeLinecap="round" />
      <Blush cx={37} cy={50} /><Blush cx={83} cy={50} />
    </g>
  );
}

// ─── Unit 7 (Food & Drink) ──────────────────────────────────────────────
// All plain objects (no face/character treatment, same as Unit 1's
// fish/bear/ball/book/cup). Disambiguation note (see depictability doc):
// milk/water/juice/soup are the four liquid-in-a-container words in this
// unit — separated by container SHAPE first (water is a droplet, not a
// glass at all; soup is a wide bowl, not a glass) and liquid COLOR second
// (milk white, juice orange) so no two ever collide on shape alone.

function AppleArt() {
  return (
    <>
      <GroundShadow />
      <path d="M58 40q-3-13 9-16q-3 7 2 11" fill="none" stroke="#5C3A1A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M68 32q10-5 15 3q-8 1-10 7z" fill="#4CAF50" stroke="#2E7D32" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 38c-24 0-36 20-32 44c3 17 16 26 32 26s29-9 32-26c4-24-8-44-32-44z" fill="#E8453C" stroke="#A82E26" strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="46" cy="60" rx="9" ry="13" fill="#FFD9BE" opacity=".45" />
    </>
  );
}

function MilkArt() {
  return (
    <>
      <GroundShadow />
      <path d="M42 30h36l-4 74q-1 6-7 6H53q-6 0-7-6z" fill="#fff" stroke="#8B84BD" strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 48h32l-3 56q-1 5-6 5H53q-5 0-6-5z" fill="#F5F0E8" />
      <ellipse cx="60" cy="48" rx="16" ry="4" fill="#fff" stroke="#8B84BD" strokeWidth="2.5" />
    </>
  );
}

function CookieArt() {
  return (
    <>
      <GroundShadow />
      <circle cx="60" cy="62" r="40" fill={c.monkeyFill} stroke={c.monkeyOutline} strokeWidth="4" />
      <circle cx="44" cy="48" r="5" fill={c.antFill} />
      <circle cx="70" cy="44" r="4.5" fill={c.antFill} />
      <circle cx="76" cy="66" r="5" fill={c.antFill} />
      <circle cx="50" cy="76" r="4" fill={c.antFill} />
      <circle cx="62" cy="60" r="4.5" fill={c.antFill} />
    </>
  );
}

function CakeArt() {
  return (
    <>
      <GroundShadow />
      <rect x="30" y="70" width="60" height="30" rx="6" fill={colors.bubble} stroke="#B8285F" strokeWidth="4" />
      <rect x="36" y="50" width="48" height="24" rx="6" fill="#FFD9BE" stroke="#B35A28" strokeWidth="3.5" />
      <path d="M32 70q0-6 6-6h44q6 0 6 6" fill="none" stroke="#B8285F" strokeWidth="3" strokeLinecap="round" />
      <rect x="56" y="30" width="8" height="20" rx="3" fill={colors.sun} stroke="#B8890A" strokeWidth="2.5" />
      <path d="M60 22q4 4 0 10q-4-4 0-10z" fill={colors.tang} />
    </>
  );
}

function PizzaArt() {
  return (
    <>
      <GroundShadow />
      <path d="M60 24l38 84H22z" fill="#FFD93D" stroke="#B8930A" strokeWidth="4" strokeLinejoin="round" />
      <path d="M35 84q25 8 50 0" fill="none" stroke="#E8453C" strokeWidth="6" strokeLinecap="round" opacity=".75" />
      <circle cx="52" cy="60" r="7" fill="#E8453C" />
      <circle cx="68" cy="70" r="7" fill="#E8453C" />
      <circle cx="60" cy="46" r="6" fill="#E8453C" />
    </>
  );
}

function BreadArt() {
  return (
    <>
      <GroundShadow />
      <path d="M24 88V56q0-24 36-24t36 24v32z" fill="#E8C078" stroke="#8A5A12" strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 88h72v6q0 6-6 6H30q-6 0-6-6z" fill={c.monkeyFill} stroke={c.monkeyOutline} strokeWidth="3.5" />
      <path d="M40 40v48M60 34v54M80 40v48" stroke="#8A5A12" strokeWidth="2.5" strokeLinecap="round" opacity=".5" />
    </>
  );
}

function EggArt() {
  return (
    <>
      <GroundShadow />
      <ellipse cx="60" cy="66" rx="30" ry="40" fill="#FFF8E8" stroke="#C9AE7A" strokeWidth="4" />
      <ellipse cx="48" cy="46" rx="8" ry="12" fill="#fff" opacity=".55" />
    </>
  );
}

function WaterArt() {
  return (
    <>
      <GroundShadow />
      <path d="M60 20c14 22 26 38 26 54a26 26 0 01-52 0c0-16 12-32 26-54z" fill="#4A90E2" stroke="#2B5F94" strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="50" cy="70" rx="7" ry="10" fill="#fff" opacity=".4" />
    </>
  );
}

function SoupArt() {
  return (
    <>
      <GroundShadow />
      <path d="M26 62h68q2 20-14 30t-20 10-20-10-14-30z" fill={colors.sun} stroke="#8A5A12" strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="60" cy="62" rx="34" ry="8" fill="#FFF1D6" stroke="#8A5A12" strokeWidth="3" />
      <path d="M46 48q-4-10 4-16M60 46q-4-10 4-16M74 48q-4-10 4-16" fill="none" stroke="#B0B0B0" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    </>
  );
}

function JuiceArt() {
  return (
    <>
      <GroundShadow />
      <path d="M42 30h36l-4 74q-1 6-7 6H53q-6 0-7-6z" fill="#fff" stroke="#8B84BD" strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 48h32l-3 56q-1 5-6 5H53q-5 0-6-5z" fill={colors.tang} />
      <ellipse cx="60" cy="48" rx="16" ry="4" fill="#FFB84D" />
      <rect x="66" y="18" width="7" height="36" rx="3.5" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2" transform="rotate(12 70 36)" />
    </>
  );
}

function BananaArt() {
  return (
    <>
      <path d="M30 90q-6-40 20-64q10-8 20-6q-4 8-12 14q-22 18-16 54q2 10-4 12q-6 2-8-10z" fill="#FFD93D" stroke="#B8930A" strokeWidth="4" strokeLinejoin="round" />
      <path d="M48 22q6-4 12-2" fill="none" stroke="#8A5A12" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function GrapesArt() {
  return (
    <>
      <path d="M56 20q6-6 14-2" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 22q8-6 14 2q-6 4-8 10z" fill="#4CAF50" stroke="#2E7D32" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="48" cy="46" r="12" fill="#9B59B6" stroke="#6B3A80" strokeWidth="3" />
      <circle cx="66" cy="42" r="12" fill="#9B59B6" stroke="#6B3A80" strokeWidth="3" />
      <circle cx="40" cy="66" r="12" fill="#9B59B6" stroke="#6B3A80" strokeWidth="3" />
      <circle cx="58" cy="64" r="12" fill="#9B59B6" stroke="#6B3A80" strokeWidth="3" />
      <circle cx="76" cy="60" r="12" fill="#9B59B6" stroke="#6B3A80" strokeWidth="3" />
      <circle cx="50" cy="86" r="12" fill="#9B59B6" stroke="#6B3A80" strokeWidth="3" />
      <circle cx="68" cy="84" r="12" fill="#9B59B6" stroke="#6B3A80" strokeWidth="3" />
      <ellipse cx="44" cy="42" rx="4" ry="5" fill="#fff" opacity=".3" />
    </>
  );
}

// ─── Unit 8 (Colors) ────────────────────────────────────────────────────
// Deliberately NOT "a red apple" etc. — anchoring a color word to a real
// object risks the child naming the object instead of the color, and is a
// worse risk here specifically since `apple` is a real Unit-7 word in this
// same curriculum (see docs/wordart-batch-2-depictability.md). Every color
// instead gets the same abstract rounded paint-drop shape (a single shared
// silhouette) in its own accurate hex from wordArtColors' `color*` set —
// the shape never changes, so the only variable a child reads is the
// color itself. `gold` is not in this set (collides with yellow — no
// metallic/gradient rendering in this flat illustration style).
function ColorBlob({ fill, outline, whiteOutline }) {
  return (
    <>
      <GroundShadow />
      <path
        d="M60 20c16 20 30 38 30 56a30 30 0 01-60 0c0-18 14-36 30-56z"
        fill={fill}
        stroke={outline}
        strokeWidth={whiteOutline ? 5 : 4}
        strokeLinejoin="round"
      />
      <ellipse cx="48" cy="66" rx="9" ry="13" fill="#fff" opacity=".35" />
    </>
  );
}
function RedArt() { return <ColorBlob fill={c.colorRed} outline={c.colorRedOutline} />; }
function BlueArt() { return <ColorBlob fill={c.colorBlue} outline={c.colorBlueOutline} />; }
function GreenArt() { return <ColorBlob fill={c.colorGreen} outline={c.colorGreenOutline} />; }
function YellowArt() { return <ColorBlob fill={c.colorYellow} outline={c.colorYellowOutline} />; }
function OrangeArt() { return <ColorBlob fill={c.colorOrange} outline={c.colorOrangeOutline} />; }
function PurpleArt() { return <ColorBlob fill={c.colorPurple} outline={c.colorPurpleOutline} />; }
function PinkArt() { return <ColorBlob fill={c.colorPink} outline={c.colorPinkOutline} />; }
// black/white need a visibly stronger outline stroke (whiteOutline flag)
// since the fill itself gives near-zero contrast against its own edge.
function BlackArt() { return <ColorBlob fill={c.colorBlack} outline={c.colorBlackOutline} whiteOutline />; }
function WhiteArt() { return <ColorBlob fill={c.colorWhite} outline={c.colorWhiteOutline} whiteOutline />; }
function BrownArt() { return <ColorBlob fill={c.colorBrown} outline={c.colorBrownOutline} />; }
function GrayArt() { return <ColorBlob fill={c.colorGray} outline={c.colorGrayOutline} />; }

// ─── Unit 9 (Home & Travel) ─────────────────────────────────────────────
// All plain objects, same object-drawing convention as Unit 1/7. Two
// disambiguation notes (see depictability doc): car vs. bus separated by
// proportion + window count (car = short, two windows; bus = long, four
// evenly-spaced windows), not just size; chair vs. table separated by the
// backrest (chair has one, table is a flat plane with none). clock omits
// numerals entirely (hands + plain tick marks only) — the no-digits/no-
// letterforms rule applied on principle, not just for Unit 10.

function BedArt() {
  return (
    <>
      <GroundShadow />
      <path d="M18 90h84v14q0 4-4 4H22q-4 0-4-4z" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="4" strokeLinejoin="round" />
      <rect x="18" y="66" width="84" height="26" rx="8" fill={colors.bubble} stroke="#B8285F" strokeWidth="4" />
      <rect x="22" y="50" width="26" height="20" rx="8" fill="#fff" stroke="#B0B0B0" strokeWidth="3" />
    </>
  );
}

function ChairArt() {
  return (
    <>
      <GroundShadow />
      <rect x="38" y="24" width="44" height="50" rx="10" fill="#9B59B6" stroke="#6B3A80" strokeWidth="4" />
      <rect x="30" y="74" width="60" height="14" rx="6" fill="#9B59B6" stroke="#6B3A80" strokeWidth="4" />
      <rect x="34" y="88" width="8" height="22" rx="3" fill="#6B3A80" />
      <rect x="78" y="88" width="8" height="22" rx="3" fill="#6B3A80" />
    </>
  );
}

function DoorArt() {
  return (
    <>
      <GroundShadow />
      <rect x="30" y="16" width="60" height="94" rx="8" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="4" />
      <rect x="38" y="24" width="44" height="78" rx="6" fill={c.monkeyFill} stroke={c.monkeyOutline} strokeWidth="3" />
      <circle cx="72" cy="66" r="5" fill={colors.sun} stroke="#B8890A" strokeWidth="2" />
    </>
  );
}

function HouseArt() {
  return (
    <>
      <GroundShadow />
      <rect x="30" y="60" width="60" height="48" fill={c.cowFill} stroke={c.cowOutline} strokeWidth="4" />
      <path d="M22 62l38-36l38 36z" fill="#E8453C" stroke="#A82E26" strokeWidth="4" strokeLinejoin="round" />
      <rect x="52" y="78" width="16" height="30" fill={c.bookFill} stroke={c.bookOutline} strokeWidth="3" />
      <rect x="36" y="70" width="14" height="14" rx="2" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2.5" />
    </>
  );
}

function CarArt() {
  return (
    <>
      <GroundShadow />
      <path d="M14 82q0-10 10-10h8q4-16 20-16h16q16 0 20 16h8q10 0 10 10v10q0 4-4 4H18q-4 0-4-4z" fill="#E8453C" stroke="#A82E26" strokeWidth="4" strokeLinejoin="round" />
      <path d="M36 72q4-10 14-10h8q10 0 14 10z" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2.5" />
      <circle cx="36" cy="96" r="10" fill="#2B2B2B" stroke="#000" strokeWidth="3" />
      <circle cx="84" cy="96" r="10" fill="#2B2B2B" stroke="#000" strokeWidth="3" />
      <circle cx="36" cy="96" r="4" fill="#9CA3AF" />
      <circle cx="84" cy="96" r="4" fill="#9CA3AF" />
    </>
  );
}

function BusArt() {
  return (
    <>
      <GroundShadow />
      <rect x="10" y="42" width="100" height="46" rx="8" fill={colors.sun} stroke="#B8890A" strokeWidth="4" />
      <rect x="18" y="50" width="16" height="16" rx="3" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2.5" />
      <rect x="40" y="50" width="16" height="16" rx="3" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2.5" />
      <rect x="62" y="50" width="16" height="16" rx="3" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2.5" />
      <rect x="84" y="50" width="16" height="16" rx="3" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2.5" />
      <circle cx="32" cy="92" r="10" fill="#2B2B2B" stroke="#000" strokeWidth="3" />
      <circle cx="88" cy="92" r="10" fill="#2B2B2B" stroke="#000" strokeWidth="3" />
    </>
  );
}

function HatArt() {
  return (
    <>
      <GroundShadow />
      <ellipse cx="60" cy="78" rx="44" ry="10" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="4" />
      <path d="M38 78q-4-34 22-34t22 34z" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="4" strokeLinejoin="round" />
      <rect x="38" y="66" width="44" height="8" fill="#E8453C" />
    </>
  );
}

function ShoeArt() {
  return (
    <>
      <GroundShadow />
      <path d="M18 90q0-4 4-4h14V64q0-8 8-8h20q6 0 8 6l6 14h20q8 0 8 8v6q0 4-4 4H22q-4 0-4-4z" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="4" strokeLinejoin="round" />
      <rect x="18" y="86" width="84" height="10" rx="5" fill="#fff" stroke="#B0B0B0" strokeWidth="3" />
    </>
  );
}

function PhoneArt() {
  return (
    <>
      <GroundShadow />
      <rect x="38" y="14" width="44" height="92" rx="12" fill="#2B2B2B" stroke="#000" strokeWidth="4" />
      <rect x="44" y="24" width="32" height="66" rx="4" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="2.5" />
      <circle cx="60" cy="98" r="4" fill="#9CA3AF" />
    </>
  );
}

function LightArt() {
  return (
    <>
      <path d="M40 30q-10-2-14 6M80 30q10-2 14 6M60 10v-8" stroke={colors.sun} strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <path d="M60 20a26 26 0 0116 46q-4 4-4 10h-24q0-6-4-10a26 26 0 0116-46z" fill={colors.sun} stroke="#B8890A" strokeWidth="4" strokeLinejoin="round" />
      <rect x="48" y="76" width="24" height="12" rx="2" fill="#9CA3AF" stroke="#6B7280" strokeWidth="2.5" />
      <path d="M48 88h24M50 94h20" stroke="#6B7280" strokeWidth="2.5" />
    </>
  );
}

function ClockArt() {
  return (
    <>
      <GroundShadow />
      <circle cx="60" cy="60" r="42" fill="#fff" stroke="#8B84BD" strokeWidth="4" />
      <circle cx="60" cy="24" r="3" fill="#8B84BD" />
      <circle cx="96" cy="60" r="3" fill="#8B84BD" />
      <circle cx="60" cy="96" r="3" fill="#8B84BD" />
      <circle cx="24" cy="60" r="3" fill="#8B84BD" />
      <path d="M60 60V32" stroke={colors.ink} strokeWidth="4" strokeLinecap="round" />
      <path d="M60 60l18 10" stroke={colors.ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="4" fill={colors.ink} />
    </>
  );
}

function TableArt() {
  return (
    <>
      <GroundShadow />
      <rect x="20" y="50" width="80" height="12" rx="4" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="4" />
      <rect x="26" y="62" width="8" height="34" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="3" />
      <rect x="86" y="62" width="8" height="34" fill="#8B5A2B" stroke="#5C3A1A" strokeWidth="3" />
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

// Shared "Nova" figure for standalone verb words — flat-vector version of
// the real shipped Nova (public/nova/nova-base.png, rendered by
// Higgsfield): flame-swoop hair, small gold body, cream face, comet-tail
// wisp. Replaces the old flat "Buddy" circle for the 9 verbs only —
// adjectives (big, sad, happy, etc.) keep Buddy via BuddyBase above; the
// brief's Part 2 scope is the verb set, not the shared character wholesale.
// See docs/WORDART_HYBRID_REPORT.md NOVA VERB SET for why this follows
// Nova's real asset instead of the brief's literal (unshipped-placeholder)
// gradient spec.
function NovaBase({ mouth, extra, eyes, cx = 60, cy = 58 }) {
  return (
    <g>
      <GroundShadow cy={114} />
      {/* comet-tail wisp trailing off the lower-left, echoing Nova's real starry tail */}
      <path d={`M${cx - 26} ${cy + 44}q-16 6-14 22`} fill="none" stroke={c.novaTail} strokeWidth="5" strokeLinecap="round" opacity=".4" />
      <circle cx={cx - 40} cy={cy + 66} r="3" fill={c.novaTail} opacity=".5" />
      <circle cx={cx - 34} cy={cy + 74} r="2" fill={c.novaTail} opacity=".35" />
      {/* small body */}
      <ellipse cx={cx} cy={cy + 42} rx="17" ry="14" fill={c.novaFill} stroke={c.novaOutline} strokeWidth="4" />
      {/* flame-swoop hair — three overlapping points behind the face, Nova's
          single most identifying silhouette cue (never present on Buddy) */}
      <ellipse cx={cx - 13} cy={cy - 30} rx="9" ry="16" fill={c.novaFill} stroke={c.novaOutline} strokeWidth="3.5" transform={`rotate(-16 ${cx - 13} ${cy - 30})`} />
      <ellipse cx={cx + 2} cy={cy - 38} rx="10" ry="19" fill={c.novaFill} stroke={c.novaOutline} strokeWidth="3.5" transform={`rotate(4 ${cx + 2} ${cy - 38})`} />
      <ellipse cx={cx + 16} cy={cy - 28} rx="8" ry="15" fill={c.novaFill} stroke={c.novaOutline} strokeWidth="3.5" transform={`rotate(20 ${cx + 16} ${cy - 28})`} />
      {/* face */}
      <circle cx={cx} cy={cy} r="26" fill={c.novaInner} stroke={c.novaOutline} strokeWidth="4" />
      {eyes ?? (<><Eye cx={cx - 11} cy={cy - 4} r={5.2} /><Eye cx={cx + 11} cy={cy - 4} r={5.2} /></>)}
      {mouth}
      <Blush cx={cx - 18} cy={cy + 8} rx={5.2} ry={3.4} /><Blush cx={cx + 18} cy={cy + 8} rx={5.2} ry={3.4} />
      {extra}
    </g>
  );
}

function EatArt() {
  return (
    <NovaBase
      mouth={<ellipse cx="60" cy="64" rx="8" ry="7" fill={c.novaOutline} />}
      extra={
        <>
          <circle cx="88" cy="70" r="11" fill={colors.tang} stroke="#B35A28" strokeWidth="3" />
          <path d="M81 66a8 8 0 0014 0" fill={c.novaInner} />
          <path d="M88 60q2-5 7-5" fill="none" stroke="#1C8C6C" strokeWidth="3" strokeLinecap="round" />
        </>
      }
    />
  );
}

// wordart-batch-1, Unit 3 (swim, dance, sing) — rebuilt on NovaBase, see
// docs/WORDART_HYBRID_REPORT.md AUDIT for why the old Buddy set failed the
// label-cover test.
function SwimArt() {
  return (
    <g transform="rotate(-8 60 58)">
      <NovaBase
        mouth={<path d="M50 66q10 6 20 0" fill="none" stroke={c.novaOutline} strokeWidth="4" strokeLinecap="round" />}
        extra={
          <>
            <path d="M22 62q-14 4-18-8" fill="none" stroke={c.novaOutline} strokeWidth="7" strokeLinecap="round" />
            <path d="M98 62q14 4 18-8" fill="none" stroke={c.novaOutline} strokeWidth="7" strokeLinecap="round" />
            <path d="M10 94q14-4 24 2q14-6 24 2q14-6 24 2q14-6 24 2" fill="none" stroke={colors.sky} strokeWidth="4" strokeLinecap="round" opacity=".6" />
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
    <NovaBase
      mouth={<path d="M50 66q10 6 20 0" fill="none" stroke={c.novaOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          <path d="M32 42q-16-10-10-24" fill="none" stroke={c.novaOutline} strokeWidth="7" strokeLinecap="round" />
          <path d="M88 42q16-10 10-24" fill="none" stroke={c.novaOutline} strokeWidth="7" strokeLinecap="round" />
          <path d="M22 12q10 6 8 16" fill="none" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" opacity=".7" />
          <path d="M98 12q-10 6-8 16" fill="none" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" opacity=".7" />
          <path d="M30 100q30 14 60 0" fill="none" stroke={colors.bubble} strokeWidth="4" strokeLinecap="round" opacity=".65" />
          <path d="M22 94q38 20 76 0" fill="none" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" opacity=".4" />
        </>
      }
    />
  );
}

function SingArt() {
  return (
    <NovaBase
      mouth={<ellipse cx="60" cy="66" rx="9" ry="8" fill={c.novaOutline} />}
      extra={
        <>
          <circle cx="94" cy="32" r="5" fill={colors.bubble} />
          <path d="M99 32v-18" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" />
          <path d="M99 14q8 0 8 6" stroke={colors.bubble} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="22" cy="22" r="4" fill={colors.sky} />
          <path d="M26 22v-14" stroke={colors.sky} strokeWidth="2.5" strokeLinecap="round" />
        </>
      }
    />
  );
}

// wordart-batch-1, Unit 4 (sleep, sit)
function SleepArt() {
  return (
    <NovaBase
      eyes={
        <>
          <path d="M42 50q6 4 12 0" fill="none" stroke={c.novaOutline} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M66 50q6 4 12 0" fill="none" stroke={c.novaOutline} strokeWidth="3.5" strokeLinecap="round" />
        </>
      }
      mouth={<ellipse cx="60" cy="66" rx="6" ry="4" fill={c.novaOutline} />}
      extra={
        <>
          {/* ascending drift-off-to-sleep bubbles — deliberately plain circles, not the letter "Z" (no letterforms in illustrations) */}
          <circle cx="90" cy="20" r="4" fill={colors.sky} opacity=".8" />
          <circle cx="100" cy="10" r="6" fill={colors.sky} opacity=".6" />
          <circle cx="112" cy="-2" r="8" fill={colors.sky} opacity=".4" />
        </>
      }
    />
  );
}

// SitArt — was WRONG in the audit (a thin bar under a standing pose
// doesn't read as "seated"). Fixed by drawing unmistakably bent L-shaped
// legs (thigh + shin at a right angle, the standard seated-figure
// convention) instead of straight standing legs, and dropping the body
// lower so the whole silhouette reads as compact/seated rather than tall.
function SitArt() {
  return (
    <NovaBase
      cy={50}
      mouth={<path d="M50 58q10 6 20 0" fill="none" stroke={c.novaOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          <path d="M46 88h-16v18" fill="none" stroke={c.novaOutline} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M74 88h16v18" fill="none" stroke={c.novaOutline} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="60" cy="108" rx="26" ry="5" fill="rgba(0,0,0,.1)" />
        </>
      }
    />
  );
}

// wordart-batch-1, Unit 5 (small, hot, cold, happy, fast, slow) — adjective
// pairs drawn with deliberately parallel compositions so the contrast
// itself teaches. small pairs with the existing big; happy pairs with the
// existing sad; hot/cold are the same mug silhouette in opposite palettes
// with steam vs. ice; fast/slow contrast an energetic motion-blur Buddy
// against a static snail, not two poses of the same figure (avoids
// reusing "rabbit," already a Unit-2 noun in this same batch).

function SmallArt() {
  // Mirrors BigArt's exact composition with the emphasis flipped: a big
  // buddy (faded, reduced detail — the same treatment BigArt gave its
  // tiny reference) sits behind a fully-detailed small buddy in front.
  return (
    <>
      <ellipse cx="82" cy="66" rx="34" ry="8" fill="rgba(0,0,0,.08)" />
      <circle cx="82" cy="30" r="30" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" opacity=".4" />
      <Eye cx={73} cy={24} r={4} /><Eye cx={91} cy={24} r={4} />
      <path d="M70 36q12 7 24 0" fill="none" stroke={c.buddyOutline} strokeWidth="3" strokeLinecap="round" opacity=".6" />

      <ellipse cx="42" cy="106" rx="16" ry="4" fill="rgba(0,0,0,.12)" />
      <circle cx="42" cy="90" r="18" fill={c.buddyFill} stroke={c.buddyOutline} strokeWidth="4" />
      <Eye cx={36} cy={86} r={3.5} /><Eye cx={48} cy={86} r={3.5} />
      <path d="M35 94q7 4 14 0" fill="none" stroke={c.buddyOutline} strokeWidth="3" strokeLinecap="round" />
      <Blush cx={28} cy={90} rx={4} ry={2.6} /><Blush cx={56} cy={90} rx={4} ry={2.6} />
    </>
  );
}

function HappyArt() {
  return (
    <BuddyBase
      mouth={<path d="M46 72q14 14 28 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          <path d="M30 34l4 10-10-2z" fill={colors.sun} opacity=".85" />
          <path d="M92 30l3 8-8-2z" fill={colors.sun} opacity=".85" />
        </>
      }
    />
  );
}

function HotArt() {
  return (
    <>
      <GroundShadow />
      <path d="M40 56h40l-3 34q-1 8-9 8h-16q-8 0-9-8z" fill={colors.tang} stroke="#B35A28" strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 62q14-3 14 9t-14 11" fill="none" stroke="#B35A28" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="60" cy="58" rx="20" ry="5" fill="#FFD9BE" />
      <path d="M50 46q-4-10 4-16M60 44q-4-10 4-16M70 46q-4-10 4-16" fill="none" stroke={colors.tang} strokeWidth="3.5" strokeLinecap="round" opacity=".7" />
    </>
  );
}

function ColdArt() {
  return (
    <>
      <GroundShadow />
      <path d="M40 56h40l-3 34q-1 8-9 8h-16q-8 0-9-8z" fill={c.birdFill} stroke={c.birdOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 62q14-3 14 9t-14 11" fill="none" stroke={c.birdOutline} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="60" cy="58" rx="20" ry="5" fill={c.birdInner} />
      <path d="M60 30v16M53 34l14 8M67 34l-14 8" stroke={c.birdOutline} strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <circle cx="42" cy="40" r="3" fill={c.birdInner} /><circle cx="78" cy="36" r="2.5" fill={c.birdInner} />
    </>
  );
}

function FastArt() {
  return (
    <g transform="rotate(12 60 62)">
      <BuddyBase
        mouth={<path d="M48 74q12 8 24 0" fill="none" stroke={c.buddyOutline} strokeWidth="4" strokeLinecap="round" />}
        extra={
          <>
            <path d="M-10 40h26" stroke={colors.tang} strokeWidth="5" strokeLinecap="round" opacity=".8" />
            <path d="M-6 54h22" stroke={colors.tang} strokeWidth="4" strokeLinecap="round" opacity=".55" />
            <path d="M-2 68h18" stroke={colors.tang} strokeWidth="3" strokeLinecap="round" opacity=".35" />
          </>
        }
      />
    </g>
  );
}

function SlowArt() {
  return (
    <>
      <GroundShadow cx={62} cy={98} rx={30} ry={6} />
      <ellipse cx="50" cy="88" rx="34" ry="14" fill={c.snailFill} stroke={c.snailOutline} strokeWidth="4" />
      <circle cx="72" cy="56" r="26" fill={c.snailFill} stroke={c.snailOutline} strokeWidth="4" />
      <path d="M72 56m-16 0a16 16 0 1132 0a12 12 0 11-24 0a8 8 0 1116 0a4 4 0 11-8 0" fill="none" stroke={c.snailOutline} strokeWidth="2.5" opacity=".5" />
      <path d="M20 76q-6-10 2-16M30 74q-4-12 4-18" fill="none" stroke={c.snailOutline} strokeWidth="3" strokeLinecap="round" />
      <Eye cx={62} cy={50} r={5.5} />
      <Blush cx={54} cy={62} rx={5} ry={3.5} />
    </>
  );
}

function FlyArt() {
  // Whole figure tilts into a glide; wings attach at the sides (not the
  // top, so they read as wings rather than ears) angled back like an
  // airplane in a dive, colored sky-blue so they're visually a distinct
  // "wing" element rather than a body part.
  return (
    <g transform="rotate(-14 60 58)">
      <NovaBase
        mouth={<path d="M50 66q10 6 20 0" fill="none" stroke={c.novaOutline} strokeWidth="4" strokeLinecap="round" />}
        extra={
          <>
            <path d="M26 60q-30-2-34-22q22 2 34 18z" fill={colors.sky} stroke={c.novaOutline} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M94 60q30-2 34-22q-22 2-34 18z" fill={colors.sky} stroke={c.novaOutline} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M-6 32q10-2 16 3" fill="none" stroke={colors.sky} strokeWidth="4" strokeLinecap="round" opacity=".7" />
            <path d="M-4 44q9-2 15 3" fill="none" stroke={colors.sky} strokeWidth="4" strokeLinecap="round" opacity=".45" />
          </>
        }
      />
    </g>
  );
}

// JumpArt — was WRONG in the audit (straight legs reaching almost to the
// ground shadow read as standing, not airborne). Fixed with a real visible
// gap: legs are short and tucked well above NovaBase's fixed ground-shadow
// line, dust puffs mark where the feet just left, and upward motion lines
// above the head sell "just launched" — the airborne cue the old pose had
// no equivalent of at all.
function JumpArt() {
  return (
    <NovaBase
      cy={40}
      mouth={<path d="M50 48q10 7 20 0" fill="none" stroke={c.novaOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          <path d="M30 4q-4-10 2-16" fill="none" stroke={colors.tang} strokeWidth="3.5" strokeLinecap="round" opacity=".6" />
          <path d="M90 4q4-10-2-16" fill="none" stroke={colors.tang} strokeWidth="3.5" strokeLinecap="round" opacity=".6" />
          <path d="M46 78q-6 6-4 14" fill="none" stroke={c.novaOutline} strokeWidth="9" strokeLinecap="round" />
          <path d="M74 78q6 6 4 14" fill="none" stroke={c.novaOutline} strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="44" cy="112" rx="9" ry="4.5" fill="rgba(255,255,255,.6)" />
          <ellipse cx="76" cy="112" rx="9" ry="4.5" fill="rgba(255,255,255,.45)" />
        </>
      }
    />
  );
}

function RunArt() {
  return (
    <NovaBase
      mouth={<path d="M50 66q10 6 20 0" fill="none" stroke={c.novaOutline} strokeWidth="4" strokeLinecap="round" />}
      extra={
        <>
          {/* two clearly separate running legs, attached at the bottom of the
              body and extending below it — front leg bent forward, back leg
              trails behind, no crossing */}
          <path d="M46 87q-8 6 -6 17" fill="none" stroke={c.novaOutline} strokeWidth="9" strokeLinecap="round" />
          <path d="M74 87q10 4 12 15" fill="none" stroke={c.novaOutline} strokeWidth="9" strokeLinecap="round" />
          {/* speed lines trailing behind */}
          <path d="M-4 42h20" stroke={colors.tang} strokeWidth="4" strokeLinecap="round" opacity=".75" />
          <path d="M0 54h18" stroke={colors.tang} strokeWidth="4" strokeLinecap="round" opacity=".5" />
          <path d="M4 66h14" stroke={colors.tang} strokeWidth="3" strokeLinecap="round" opacity=".35" />
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
  small: SmallArt,
  happy: HappyArt,
  hot: HotArt,
  cold: ColdArt,
  fast: FastArt,
  slow: SlowArt,
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
  // wordart-batch-2, Unit 6
  baby: BabyArt,
  boy: BoyArt,
  girl: GirlArt,
  man: ManArt,
  woman: WomanArt,
  // wordart-batch-2, Unit 7
  apple: AppleArt,
  milk: MilkArt,
  cookie: CookieArt,
  cake: CakeArt,
  pizza: PizzaArt,
  bread: BreadArt,
  egg: EggArt,
  water: WaterArt,
  soup: SoupArt,
  juice: JuiceArt,
  banana: BananaArt,
  grapes: GrapesArt,
  // wordart-batch-2, Unit 8
  red: RedArt,
  blue: BlueArt,
  green: GreenArt,
  yellow: YellowArt,
  orange: OrangeArt,
  purple: PurpleArt,
  pink: PinkArt,
  black: BlackArt,
  white: WhiteArt,
  brown: BrownArt,
  gray: GrayArt,
  // wordart-batch-2, Unit 9
  bed: BedArt,
  chair: ChairArt,
  door: DoorArt,
  house: HouseArt,
  car: CarArt,
  bus: BusArt,
  hat: HatArt,
  shoe: ShoeArt,
  phone: PhoneArt,
  light: LightArt,
  clock: ClockArt,
  table: TableArt,
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
