import { colors, fonts, shadows } from '../../theme/tokens';
import { IconLock } from '../icons';

// Trophy Shelf card (mockup D `.trophy`). locked=true renders the
// desaturated not-yet-earned state. `Icon` is a component reference
// (e.g. IconStar, AvatarRocket) rendered inside a 34px box — no emoji.
export default function TrophyCard({ Icon: IconProp, name, stat, locked = false, onTap, speak }) {
  const Icon = IconProp;
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
      <div style={{ width: 34, height: 34, margin: '0 auto' }}>
        {locked ? <IconLock size={26} color="rgba(255,255,255,.6)" /> : <Icon />}
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.76rem', marginTop: 5 }}>{name}</div>
      <div style={{ fontSize: '.58rem', fontWeight: 700, color: locked ? undefined : colors.mutedInkLight }}>{stat}</div>
    </div>
  );
}
