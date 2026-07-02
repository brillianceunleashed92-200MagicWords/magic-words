import { colors, fonts, shadows } from '../../theme/tokens';

// Trophy Shelf card (mockup D `.trophy`). locked=true renders the
// desaturated not-yet-earned state.
export default function TrophyCard({ icon, name, stat, locked = false, onTap, speak }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (locked) return; speak?.(name); onTap?.(); }}
      style={{
        flex: '0 0 116px',
        background: locked ? 'rgba(255,255,255,.15)' : colors.cloud,
        color: locked ? 'rgba(255,255,255,.6)' : colors.ink,
        borderRadius: 26,
        padding: '15px 10px',
        textAlign: 'center',
        boxShadow: locked ? '0 8px 0 rgba(0,0,0,.08)' : shadows.chunk,
        cursor: locked ? 'default' : 'pointer',
      }}
    >
      <div style={{ fontSize: '2rem' }}>{locked ? '🔒' : icon}</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.76rem', marginTop: 5 }}>{name}</div>
      <div style={{ fontSize: '.58rem', fontWeight: 700, color: locked ? undefined : colors.mutedInkLight }}>{stat}</div>
    </div>
  );
}
