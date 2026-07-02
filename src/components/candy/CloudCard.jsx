import { colors, radii, shadows } from '../../theme/tokens';

// White chunky-shadow card, optionally tilted (mockup D's `.hero-card`
// rotate(-1deg) / `.hero-inner` counter-rotate(1deg) trick keeps inner
// content upright while the card itself reads as playfully tilted).
export default function CloudCard({ children, tilt = 0, style }) {
  return (
    <div
      style={{
        background: colors.cloud,
        color: colors.ink,
        borderRadius: radii.xl,
        padding: '26px 24px',
        position: 'relative',
        boxShadow: shadows.chunk,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        ...style,
      }}
    >
      <div style={tilt ? { transform: `rotate(${-tilt}deg)` } : undefined}>
        {children}
      </div>
    </div>
  );
}
