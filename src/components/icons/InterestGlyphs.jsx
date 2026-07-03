// Interest-picker glyphs — small chip icons (paired with a text label, so
// simpler/flatter than the avatar characters or WordArt illustrations).
// Single accent color + a pale inner shape, matching the chrome icon
// stroke weight from docs/DESIGN_BRIEF.md §8.
import { colors } from '../../theme/tokens';

const wrap = (children, size) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">{children}</svg>
);

export function InterestDinosaur({ size = 20 }) {
  return wrap(
    <path fill={colors.mint} d="M4 18v-3c0-4 2-7 5-8l1-3 2 2 2-1 1 2c3 1 5 4 5 7v1l3 1-3 2v3c0 1-1 2-2 2h-1v-2h-2v2H9v-2H7v2H6a2 2 0 01-2-2z" />,
    size,
  );
}
export function InterestPaw({ size = 20 }) {
  return wrap(
    <>
      <circle cx="7" cy="8" r="2.2" fill={colors.tang} />
      <circle cx="12" cy="6" r="2.2" fill={colors.tang} />
      <circle cx="17" cy="8" r="2.2" fill={colors.tang} />
      <path fill={colors.tang} d="M12 12c-4 0-6 3-6 5.5A2.5 2.5 0 008.5 20c1 0 1.7-.6 3.5-.6s2.5.6 3.5.6a2.5 2.5 0 002.5-2.5C18 15 16 12 12 12z" />
    </>,
    size,
  );
}
export function InterestCrown({ size = 20 }) {
  return wrap(
    <path fill={colors.sun} d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z" />,
    size,
  );
}
export function InterestSuperhero({ size = 20 }) {
  return wrap(
    <>
      <circle cx="12" cy="8" r="4" fill={colors.bubble} />
      <path fill={colors.sky} d="M6 12c0 4 3 6 6 6s6-2 6-6l-3 2-3-3-3 3z" />
    </>,
    size,
  );
}
export function InterestCarTruck({ size = 20 }) {
  return wrap(
    <>
      <path fill={colors.tang} d="M3 14l1.5-5A2 2 0 016.4 7.5h11.2a2 2 0 011.9 1.5L21 14v3a1 1 0 01-1 1h-1a2 2 0 11-4 0H9a2 2 0 11-4 0H4a1 1 0 01-1-1z" />
      <circle cx="7.5" cy="18" r="1.6" fill="#fff" />
      <circle cx="16.5" cy="18" r="1.6" fill="#fff" />
    </>,
    size,
  );
}
export function InterestOcean({ size = 20 }) {
  return wrap(
    <>
      <path fill={colors.sky} d="M2 12q2.5-3 5-0 2.5 3 5 0 2.5-3 5 0 2.5 3 5 0v3q-2.5 3-5 0-2.5-3-5 0-2.5 3-5 0-2.5-3-5 0z" opacity=".6" />
      <path fill={colors.sky} d="M2 17q2.5-3 5-0 2.5 3 5 0 2.5-3 5 0 2.5 3 5 0v3H2z" />
    </>,
    size,
  );
}
export function InterestSports({ size = 20 }) {
  return wrap(
    <>
      <circle cx="12" cy="12" r="9" fill={colors.cloud} stroke={colors.ink} strokeWidth="1.4" />
      <path d="M12 6l3 3-1 4H10l-1-4z" fill={colors.ink} />
    </>,
    size,
  );
}
export function InterestMusic({ size = 20 }) {
  return wrap(
    <path fill={colors.bubble} d="M9 4v10.5a3 3 0 101.5 2.6V8h5V4z" />,
    size,
  );
}
export function InterestArt({ size = 20 }) {
  return wrap(
    <>
      <path fill={colors.tang} d="M12 3a9 8 0 000 16c1.2 0 1.6-1 1-2s0-2 1.2-2H16a4 4 0 004-4c0-4.4-3.6-8-8-8z" />
      <circle cx="8" cy="10" r="1.3" fill={colors.sky} />
      <circle cx="12" cy="8" r="1.3" fill={colors.sun} />
      <circle cx="16" cy="10" r="1.3" fill={colors.mint} />
    </>,
    size,
  );
}
export function InterestBug({ size = 20 }) {
  return wrap(
    <>
      <ellipse cx="12" cy="13" rx="5" ry="6" fill={colors.mint} />
      <circle cx="12" cy="6" r="2.4" fill={colors.mint} />
      <path d="M8 9l-3-2M16 9l3-2M7 13H3M21 13h-4M8 17l-3 2M16 17l3 2" stroke="#1C8C6C" strokeWidth="1.4" strokeLinecap="round" />
    </>,
    size,
  );
}
export function InterestMagic({ size = 20 }) {
  return wrap(
    <>
      <path fill={colors.sun} d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z" />
      <path fill={colors.bubble} d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </>,
    size,
  );
}

const INTEREST_GLYPHS = {
  dinosaurs: InterestDinosaur,
  space: null, // reuse AvatarRocket via InterestIcon below
  animals: InterestPaw,
  princesses: InterestCrown,
  superheroes: InterestSuperhero,
  cars_trucks: InterestCarTruck,
  ocean: InterestOcean,
  sports: InterestSports,
  music: InterestMusic,
  art: InterestArt,
  bugs: InterestBug,
  magic: InterestMagic,
};

export function InterestIcon({ id, size = 20 }) {
  if (id === 'space') {
    return wrap(<path fill={colors.tang} d="M12 2c3 2 4 7 3 11H9c-1-4 0-9 3-11z" />, size);
  }
  const Glyph = INTEREST_GLYPHS[id];
  return Glyph ? <Glyph size={size} /> : null;
}
