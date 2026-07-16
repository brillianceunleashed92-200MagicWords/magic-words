import { colors, fonts, radii, shadows, touchTarget } from './mmTokens';

// MEMORY_MASTER_R1 Phase 4 -- parent record form (T14, handoff §7.6). Error
// detail lives HERE AND ONLY HERE -- the automated version of her paper
// record forms (handoff pp. 82-91). The child never sees an error
// breakdown anywhere in this module; the grown-up sees attempts, error
// kinds, checkmarks, and cadence. Cross-check: grep this module's
// child-facing screens (ReadPhase/WritePhase/SessionEnd/CardScreen) for any
// reference to `lastErrorKind` or `classifyError` -- there is none.
export default function ParentRecord({ level, sessionsDone, checkHist, log, onBack }) {
  const checkmarks = checkHist.filter(Boolean).length;
  const seen = new Map();
  for (const row of log) {
    const key = `${row.level}-${row.session}-${row.portion}`;
    const existing = seen.get(key) || { row, tries: 0, kinds: new Set() };
    existing.tries = Math.max(existing.tries, row.attempt);
    if (row.kind) existing.kinds.add(row.kind);
    seen.set(key, existing);
  }

  return (
    <div style={{ background: colors.cloud, color: colors.ink, borderRadius: radii.xl, padding: '26px 24px', boxShadow: shadows.chunk, textAlign: 'left' }}>
      <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', textAlign: 'center', marginBottom: 6 }}>Record form</h2>
      <p style={{ textAlign: 'center', fontWeight: 600, fontSize: '.92rem', color: colors.muted, marginBottom: 10 }}>Memory Master</p>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <Chip label={`Level ${level}`} />
        <Chip label={`${sessionsDone} session${sessionsDone === 1 ? '' : 's'}`} ghost />
        <Chip label={`${checkmarks} checkmarks`} ghost />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', marginTop: 10 }}>
        <thead>
          <tr>
            <Th>Session</Th>
            <Th>Portion</Th>
            <Th>Tries</Th>
            <Th>What slipped</Th>
          </tr>
        </thead>
        <tbody>
          {!log.length && !sessionsDone && (
            <tr>
              <td colSpan={4} style={{ padding: '7px 5px', color: colors.muted }}>
                No sessions yet.
              </td>
            </tr>
          )}
          {[...seen.values()].map(({ row, tries, kinds }, i) => (
            <tr key={`e-${i}`}>
              <Td>L{row.level} S{row.session}</Td>
              <Td>P{row.portion}</Td>
              <Td>{tries}</Td>
              <Td muted>{[...kinds].join(', ').replace(/_/g, ' ')}</Td>
            </tr>
          ))}
          {checkHist.map((ck, i) =>
            ck ? (
              <tr key={`c-${i}`}>
                <Td>Session {i + 1}</Td>
                <Td>both perfect</Td>
                <Td>1</Td>
                <Td ok>checkmark</Td>
              </tr>
            ) : null
          )}
        </tbody>
      </table>
      <div style={{ fontWeight: 700, fontSize: '.78rem', color: colors.muted, marginTop: 12 }}>
        Cadence target: 3-4 sessions a week. Expect visible change in 6-8 weeks, then taper.
      </div>
      <button
        type="button"
        onClick={onBack}
        style={{ width: '100%', minHeight: touchTarget, marginTop: 12, background: 'transparent', color: colors.sky, border: `1px solid ${colors.line}`, borderRadius: 18, fontFamily: fonts.display, fontWeight: 800, fontSize: '.95rem', padding: 12, cursor: 'pointer' }}
      >
        Back
      </button>
    </div>
  );
}

function Chip({ label, ghost }) {
  return (
    <span style={{ display: 'inline-block', background: ghost ? colors.paper : colors.sky, color: ghost ? colors.muted : colors.cloud, borderRadius: 999, padding: '7px 14px', fontWeight: 700, fontSize: '.8rem', margin: '4px 3px' }}>
      {label}
    </span>
  );
}
function Th({ children }) {
  return <th style={{ padding: '7px 5px', textAlign: 'left', borderBottom: `1px solid ${colors.line}`, fontFamily: fonts.display, fontWeight: 800, fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.05em', color: colors.muted }}>{children}</th>;
}
function Td({ children, ok, muted }) {
  return (
    <td style={{ padding: '7px 5px', borderBottom: `1px solid ${colors.line}`, color: ok ? '#1E9E7C' : muted ? colors.muted : colors.ink, fontWeight: ok || muted ? 700 : 400 }}>
      {children}
    </td>
  );
}
