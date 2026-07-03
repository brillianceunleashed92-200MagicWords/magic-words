// Hand-drawn chrome icon set — replaces every emoji used as UI chrome
// (nav, buttons, status). Matches mockup-E2-no-emoji.html's icon weight:
// simple geometric strokes at stroke-width 2.4-3, currentColor fill/stroke
// (no multi-color detail, no gradients, no drop shadow on the glyph itself —
// the containing chunky-shadow surface carries the depth). See
// docs/DESIGN_BRIEF.md §8.
//
// Usage: <IconClose size={20} color="#fff" />

const base = (size, viewBox = '0 0 24 24') => ({
  width: size, height: size, viewBox, fill: 'none',
});

export function IconClose({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IconSpeaker({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill={color} />
      <path d="M16 8.5a5 5 0 010 7" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrow({ size = 20, color = 'currentColor', direction = 'right' }) {
  const rotate = { right: 0, left: 180, up: -90, down: 90 }[direction] ?? 0;
  return (
    <svg {...base(size)} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M8 5l8 7-8 7" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IconStar({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path fill={color} d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14 2 8.27l6.91-1.01z" />
    </svg>
  );
}

export function IconFlame({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path
        fill={color}
        d="M12 2c1 3-3 4-3 8a3 3 0 006 0c1 1 2 2.5 2 4.5A5 5 0 015 19a6 6 0 013-9c0 1.5 1 2 1.5 1C10 8 9 5 12 2z"
      />
    </svg>
  );
}

export function IconSpark({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path fill={color} d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
    </svg>
  );
}

export function IconLock({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="11" width="14" height="10" rx="3" fill={color} />
      <path d="M8 11V8a4 4 0 018 0v3" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function IconHome({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M4 11l8-7 8 7" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" stroke={color} strokeWidth="2.6" strokeLinejoin="round" fill="none" />
      <rect x="10" y="14" width="4" height="6" fill={color} />
    </svg>
  );
}

export function IconPlay({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path fill={color} d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}

export function IconGalaxy({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="3.4" fill={color} />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke={color} strokeWidth="2" fill="none" transform="rotate(-18 12 12)" />
    </svg>
  );
}

export function IconGrownUps({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="7" r="3" fill={color} />
      <path d="M2 20c0-4 3-6.5 6-6.5s6 2.5 6 6.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="17" cy="8" r="2.4" fill={color} opacity=".7" />
      <path d="M13.5 20c.3-3 2.4-5 5-5s4.3 1.7 4.7 4.4" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".7" />
    </svg>
  );
}
