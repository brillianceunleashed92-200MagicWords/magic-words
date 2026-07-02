import { colors, fonts, shadows } from '../../theme/tokens';

// Avatar-chip profile switcher (blueprint 4.3 "Multi-child profiles").
// The "+" tile is hidden once the plan's child limit is reached — Family
// upgrade prompts live in the parent portal, never in this child-facing
// switcher (blueprint 8: "upgrade prompts shown to GROWN-UPS only").
export default function ChildSwitcher({ children, activeChildId, onSelect, onAddChild, canAddChild, speak }) {
  if (children.length <= 1 && !canAddChild) return null;

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
      {children.map((child) => {
        const isActive = child.id === activeChildId;
        return (
          <button
            key={child.id}
            onClick={() => { speak?.(child.name); onSelect(child.id); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              minWidth: 64, padding: '8px 10px', borderRadius: 20, cursor: 'pointer',
              background: isActive ? colors.cloud : 'rgba(255,255,255,.15)',
              border: isActive ? `2px solid ${colors.sun}` : 'none',
              boxShadow: isActive ? shadows.chunkSm : 'none',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '1.6rem' }}>{child.avatar || '🚀'}</span>
            <span style={{
              fontFamily: fonts.display, fontWeight: 700, fontSize: '.7rem',
              color: isActive ? colors.ink : colors.cloud,
            }}>
              {child.name}
            </span>
          </button>
        );
      })}
      {canAddChild && (
        <button
          onClick={onAddChild}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minWidth: 64, minHeight: 64, borderRadius: 20, cursor: 'pointer',
            background: 'rgba(255,255,255,.15)', border: '2px dashed rgba(255,255,255,.4)',
            color: colors.cloud, fontSize: '1.4rem', flexShrink: 0,
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
