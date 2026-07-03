// Nova, rendered from the real Higgsfield artwork at /nova/<file>.png.
// state: 'idle' | 'fly' | 'correct' | 'wrong' | 'sleepy'.
//
// No CSS-sprite fallback: a previous version silently swapped to a
// CSS-built placeholder on image load failure, which meant a broken/
// missing asset would never surface as a visible bug — it would just look
// like the (intentionally simpler) placeholder was the real design. If
// these PNGs ever fail to load, that should be an obvious broken-image
// icon, not a silent downgrade.
const REAL_RENDER_BY_STATE = {
  idle: 'nova-base.png',
  fly: 'nova-base.png',
  correct: 'nova-celebrate.png',
  wrong: 'nova-base.png', // errorless scaffold — Nova doesn't look upset, the tile carries the cue
  sleepy: 'nova-base.png',
};

export default function NovaSprite({ state = 'idle', size = 88 }) {
  return (
    <img
      src={`/nova/${REAL_RENDER_BY_STATE[state] ?? REAL_RENDER_BY_STATE.idle}`}
      alt="Nova"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'cover', borderRadius: '50%' }}
    />
  );
}
