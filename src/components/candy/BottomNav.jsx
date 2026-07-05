import { colors, fonts, shadows } from '../../theme/tokens';
import { IconHome, IconPlay, IconGalaxy, IconGrownUps } from '../icons';

const TABS = [
  { id: 'home', Icon: IconHome, label: 'Home' },
  { id: 'play', Icon: IconPlay, label: 'Play' },
  { id: 'galaxy', Icon: IconGalaxy, label: 'Galaxy' },
  { id: 'grownups', Icon: IconGrownUps, label: 'Grown-ups' },
];

// Bottom pill nav (mockup D `.nav`) — 64px minimum touch targets.
//
// `childInitial` (audio-consolidation Bug 4 — account affordance): there
// was no visible "you're logged in" indicator anywhere, and no
// discoverable logout path. A working sign-out already existed
// (SettingsTab.jsx's "Sign out", behind the Grown-Ups hold+math gate —
// nothing to build there), so the actual gap was purely the missing
// indicator. Reusing the existing Grown-ups tab as the entry point
// (per the mission's own suggested option) rather than adding a second,
// redundant tap target that leads to the exact same place — a small
// badge showing the active child's first initial rides on this tab's
// icon instead of introducing new kid-facing chrome.
export default function BottomNav({ active, onSelect, speak, childInitial }) {
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
              position: 'relative',
            }}
          >
            <tab.Icon size={20} color={isActive ? '#fff' : colors.mutedInkLight} />
            {tab.id === 'grownups' && childInitial && (
              <span
                aria-label={`Logged in as ${childInitial}`}
                style={{
                  position: 'absolute', top: 2, right: 6,
                  width: 16, height: 16, borderRadius: '50%',
                  background: colors.sun, color: colors.ink,
                  fontFamily: fonts.display, fontWeight: 800, fontSize: '.6rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${colors.cloud}`,
                }}
              >
                {childInitial}
              </span>
            )}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
