// Avatar-picker glyphs — same chunky-character construction rule as
// WordArt.jsx (circle head, dot eyes w/ highlight, blush cheeks, ~4px
// darker-shade outline). Dog/cat/frog reuse WordArt directly since those
// are already-illustrated content-track words; the rest are new here since
// they're not curriculum vocabulary.
import { colors, wordArtColors as c } from '../../theme/tokens';
import WordArt, { WORD_ART_REGISTRY } from '../WordArt';
import { AVATARS } from '../../lib/avatars';

function Eye({ cx, cy, r = 6 }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={c.dot} />
      <circle cx={cx + r * 0.33} cy={cy - r * 0.37} r={r * 0.3} fill="#fff" />
    </>
  );
}
function Blush({ cx, cy, rx = 6.5, ry = 4.2 }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c.blush} opacity=".8" />;
}

const rocketFill = colors.tang, rocketOutline = '#B35A28';
export function AvatarRocket() {
  return (
    <>
      <path d="M60 10c16 10 20 34 16 54H44c-4-20 0-44 16-54z" fill={rocketFill} stroke={rocketOutline} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="60" cy="40" r="10" fill="#FFF1D6" stroke={rocketOutline} strokeWidth="3" />
      <path d="M44 64l-14 20 20-8zM76 64l14 20-20-8z" fill={colors.sky} stroke={rocketOutline} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 84q10 18 20 0" fill={colors.sun} opacity=".9" />
    </>
  );
}

const alienFill = colors.mint, alienOutline = '#1C8C6C';
export function AvatarAlien() {
  return (
    <>
      <ellipse cx="60" cy="66" rx="34" ry="38" fill={alienFill} stroke={alienOutline} strokeWidth="4" />
      <ellipse cx="46" cy="58" rx="10" ry="13" fill={c.dot} transform="rotate(-12 46 58)" />
      <ellipse cx="74" cy="58" rx="10" ry="13" fill={c.dot} transform="rotate(12 74 58)" />
      <ellipse cx="43" cy="53" rx="3" ry="4" fill="#fff" />
      <ellipse cx="71" cy="53" rx="3" ry="4" fill="#fff" />
      <path d="M50 84q10 6 20 0" fill="none" stroke={alienOutline} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M42 20q-4-10 4-14M78 20q4-10-4-14" fill="none" stroke={alienOutline} strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

const foxFill = colors.tang, foxOutline = '#B35A28';
export function AvatarFox() {
  return (
    <>
      <path d="M30 46l-10-26 26 14z" fill={foxFill} stroke={foxOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M90 46l10-26-26 14z" fill={foxFill} stroke={foxOutline} strokeWidth="4" strokeLinejoin="round" />
      <path d="M34 38l-4-11 11 7z" fill="#FFF1D6" />
      <path d="M86 38l4-11-11 7z" fill="#FFF1D6" />
      <circle cx="60" cy="66" r="36" fill={foxFill} stroke={foxOutline} strokeWidth="4" />
      <path d="M60 78l-16-4a16 10 0 0032 0z" fill="#FFF1D6" />
      <Eye cx={46} cy={62} /><Eye cx={74} cy={62} />
      <path d="M60 80l-5-6h10z" fill={foxOutline} />
      <Blush cx={38} cy={74} /><Blush cx={82} cy={74} />
    </>
  );
}

const lionFill = colors.sun, lionOutline = '#B8890A';
export function AvatarLion() {
  return (
    <>
      <circle cx="60" cy="62" r="46" fill="#F0A93A" stroke={lionOutline} strokeWidth="4" />
      <circle cx="60" cy="62" r="32" fill={lionFill} stroke={lionOutline} strokeWidth="4" />
      <Eye cx={47} cy={58} /><Eye cx={73} cy={58} />
      <ellipse cx="60" cy="72" rx="7" ry="5" fill={lionOutline} />
      <path d="M50 82q10 7 20 0" fill="none" stroke={lionOutline} strokeWidth="3.5" strokeLinecap="round" />
      <Blush cx={40} cy={74} /><Blush cx={80} cy={74} />
    </>
  );
}

const GLYPHS = { rocket: AvatarRocket, alien: AvatarAlien, fox: AvatarFox, lion: AvatarLion };
const WORD_ART_AVATARS = new Set(['dog', 'cat', 'frog']); // reuse WordArt directly
const EMOJI_TO_ID = Object.fromEntries(AVATARS.map((a) => [a.emoji, a.id]));

// Looks up by the stored value, which may be a legacy raw emoji character
// (existing child_profiles rows) or the newer `id` slug — never rendered
// as literal emoji either way. `star` falls back to the chrome IconStar.
export function AvatarIcon({ value, size = 56 }) {
  const id = EMOJI_TO_ID[value] || value;

  if (WORD_ART_AVATARS.has(id)) {
    return <WordArt word={id} teachingTrack={WORD_ART_REGISTRY[id] ? 'content' : 'sight'} size={size} />;
  }
  const Glyph = GLYPHS[id];
  if (Glyph) {
    return (
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={id}>
        <Glyph />
      </svg>
    );
  }
  // 'star' and any unrecognized value: a simple candy-chip star, never emoji.
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="star">
      <circle cx="60" cy="60" r="52" fill={colors.sun} />
      <path fill={colors.starText} d="M60 22l9 20 22 3-16 15 4 22-19-11-19 11 4-22-16-15 22-3z" />
    </svg>
  );
}
