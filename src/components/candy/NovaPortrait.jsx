// Real Higgsfield-rendered Nova illustrations (public/nova/*.png — full-bleed
// square frames with their own baked-in background, not transparent sprite
// cutouts). Used for large-format moments where a whole illustrated frame
// fits: the Home hero corner, celebration takeovers. NOT used for the small
// inline/path sprite (see NovaSprite.jsx) — at 88px these opaque backgrounds
// would show as a visible blue square rather than blend with surrounding UI.
const PORTRAITS = {
  wave: '/nova/wave.png',       // idle/home greeting
  celebrate: '/nova/celebrate.png', // quest complete / streak milestone / boss defeat
  read: '/nova/read.png',        // story-related moments (Fill the Story, Phase 2 Story Engine)
};

export default function NovaPortrait({ pose = 'wave', size = 120, rounded = 24, style }) {
  const src = PORTRAITS[pose] ?? PORTRAITS.wave;
  return (
    <img
      src={src}
      alt="Nova"
      width={size}
      height={size}
      style={{ borderRadius: rounded, objectFit: 'cover', display: 'block', ...style }}
    />
  );
}
