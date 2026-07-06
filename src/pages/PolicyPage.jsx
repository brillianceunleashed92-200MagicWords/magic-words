// Shared shell for /privacy, /terms, /refunds — LEGAL_PAGES_R1: these now
// render the real interim published policy text (verbatim from
// docs/200MW_*_PUBLISH.md), not draft placeholder copy. Counsel review
// continues in parallel; redlines land as text edits to these same files
// plus an Effective Date bump (see each page's own content).
export default function PolicyPage({ title, effectiveDate, children }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0F0A1E', color: '#fff',
      fontFamily: "'Nunito', system-ui, sans-serif", padding: '2rem 1.25rem',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, color: '#FFE66D', marginBottom: 8 }}>
          {title}
        </h1>
        {effectiveDate && (
          <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 24 }}>Effective Date: {effectiveDate}</p>
        )}
        <div style={{ opacity: 0.9, lineHeight: 1.7 }}>{children}</div>
        <a href="/" style={{ display: 'inline-block', marginTop: 32, color: '#4ECDC4' }}>← Back home</a>
      </div>
    </div>
  );
}

// Shared building blocks so all three policy pages render `##`/`###`
// headings, bullets, and tables identically — hand-rolled JSX per the
// doc's "no new dependencies" instruction, not a markdown-renderer
// package.
export function H2({ id, children }) {
  return (
    <h2 id={id} style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, color: '#FFE66D', marginTop: 32, marginBottom: 12, scrollMarginTop: 20 }}>
      {children}
    </h2>
  );
}

export function H3({ id, children }) {
  return (
    <h3 id={id} style={{ color: '#4ECDC4', fontSize: 16, fontWeight: 800, marginTop: 20, marginBottom: 8, scrollMarginTop: 20 }}>
      {children}
    </h3>
  );
}

export function P({ children }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

export function UL({ children }) {
  return <ul style={{ marginBottom: 12, paddingLeft: 22 }}>{children}</ul>;
}

export function OL({ children }) {
  return <ol style={{ marginBottom: 12, paddingLeft: 22 }}>{children}</ol>;
}

export function LI({ children }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

export function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid rgba(255,255,255,0.2)', color: '#FFE66D' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', verticalAlign: 'top' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
