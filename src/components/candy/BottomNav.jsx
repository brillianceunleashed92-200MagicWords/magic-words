import { colors, fonts, shadows } from '../../theme/tokens';

const TABS = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'play', icon: '🎮', label: 'Play' },
  { id: 'galaxy', icon: '🌌', label: 'Galaxy' },
  { id: 'grownups', icon: '🧑‍🤝‍🧑', label: 'Grown-ups' },
];

// Bottom pill nav (mockup D `.nav`) — 64px minimum touch targets.
export default function BottomNav({ active, onSelect, speak }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        gap: 4,
        background: colors.cloud,
        borderRadius: 100,
        padding: 8,
        boxShadow: shadows.chunkLg,
        width: 'min(92%, 460px)',
        justifyContent: 'space-around',
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { speak?.(tab.label); onSelect(tab.id); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              minHeight: 56,
              minWidth: 56,
              fontSize: '.56rem',
              fontWeight: 800,
              fontFamily: fonts.display,
              color: isActive ? '#fff' : colors.mutedInkLight,
              background: isActive ? colors.sky : 'transparent',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 100,
              boxShadow: isActive ? '0 4px 0 rgba(0,0,0,.15)' : 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
