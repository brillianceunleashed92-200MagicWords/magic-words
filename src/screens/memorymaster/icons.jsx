// MEMORY_MASTER_R1 Phase 4 -- inline SVG only, no emoji anywhere in this
// module (docs/DESIGN_BRIEF_V2.md non-negotiable). Paths adapted from
// mockup-P-memory-master.html's own inline SVGs.
export function CheckmarkIcon({ size = 44, color = '#2A2160' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12.5l5 5L20 6.5" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ size = 32, color = '#2A2160' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.6 6.6L21 10l-5 4.3 1.6 7L12 17.8 6.4 21.3 8 14.3 3 10l6.4-1.4z" fill={color} />
    </svg>
  );
}

export function BookIcon({ size = 32, color = '#2A2160' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 5.5A2.5 2.5 0 016.5 3H19a1 1 0 011 1v14a1 1 0 01-1 1H6.5A2.5 2.5 0 004 21z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TargetIcon({ size = 32, color = '#2A2160' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 4l7 8h-4v7H9v-7H5z" fill={color} />
    </svg>
  );
}

export function SpeakerIcon({ size = 36, color = '#2A2160' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill={color} />
      <path d="M16.5 8.5a4.5 4.5 0 010 7" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M18.8 6a8 8 0 010 12" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
