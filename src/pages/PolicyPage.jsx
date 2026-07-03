// Shared shell for /privacy and /terms — both are explicitly DRAFT
// placeholder content, not real policy language. Real language needs to
// come from counsel before this product handles real payments in live
// Stripe mode (see docs/SECURITY_CHECKLIST_FOR_SAL.md / Phase 7 of the
// security-hardening branch).
export default function PolicyPage({ title, children }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0F0A1E', color: '#fff',
      fontFamily: "'Nunito', system-ui, sans-serif", padding: '2rem 1.25rem',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255,107,107,0.14)', border: '1px solid rgba(255,107,107,0.35)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 24, fontSize: 13, fontWeight: 800, color: '#FF8B94',
        }}>
          DRAFT — placeholder content, not reviewed by counsel. Do not rely on this
          page as your real privacy policy or terms of service.
        </div>
        <h1 style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, color: '#FFE66D', marginBottom: 16 }}>
          {title}
        </h1>
        <div style={{ opacity: 0.85, lineHeight: 1.7 }}>{children}</div>
        <a href="/" style={{ display: 'inline-block', marginTop: 32, color: '#4ECDC4' }}>← Back home</a>
      </div>
    </div>
  );
}
