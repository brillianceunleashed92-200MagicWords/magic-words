import { colors, fonts, shadows } from './mmTokens';
import { BookIcon, TargetIcon } from './icons';
import NovaBubble from './NovaBubble';

// MEMORY_MASTER_R1 Phase 4 -- integration proof only. Demonstrates the
// handoff §1 decision ("a new wing of the universe, not a new universe")
// as a small home screen local to this dev route -- it does NOT modify the
// real app's HomeScreen.jsx or add any tile there (no customer-facing entry
// point, per this run's non-negotiables). The "Word Journey" tile is inert
// (a real click would go to the actual authenticated app, out of scope
// here).
function Wing({ icon, iconBg, title, sub, onClick, progress }) {
  return (
    <div
      onClick={onClick}
      style={{ background: colors.cloud, color: colors.ink, borderRadius: 22, padding: 18, boxShadow: shadows.chunk, marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 16, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem' }}>{title}</h3>
        <div style={{ fontWeight: 600, fontSize: '.8rem', color: colors.muted, marginTop: 2 }}>{sub}</div>
        {progress != null && (
          <div style={{ height: 7, borderRadius: 5, background: colors.paper, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ display: 'block', height: '100%', background: colors.mint, width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomeIntegration({ placed, level, sessionNum, onEnterMM, onPractice }) {
  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.13em', textTransform: 'uppercase', color: colors.mutedInkLight, marginBottom: 14 }}>
        200 Magic Words &middot; home (integration proof)
      </div>
      <NovaBubble text="Two wings of the galaxy. Where to?" />
      <Wing icon={<StarPath />} iconBg={colors.sun} title="Word Journey" sub="Unit 4 &middot; today's word: water" onClick={() => {}} progress={46} />
      <Wing
        icon={<BookIcon color={colors.ink} />}
        iconBg={colors.mint}
        title="Memory Master"
        sub={placed ? `Level ${level} · session ${sessionNum} of 15` : 'Read it. Remember it. Write it.'}
        onClick={onEnterMM}
        progress={placed ? Math.round((sessionNum / 15) * 100) : 0}
      />
      <Wing icon={<TargetIcon color={colors.ink} />} iconBg={colors.bubble} title="Practice corner" sub="Big letters and marks &middot; no scores, just practice" onClick={onPractice} />
    </div>
  );
}

function StarPath() {
  return (
    <svg viewBox="0 0 24 24" width={32} height={32}>
      <path d="M12 2l2.6 6.6L21 10l-5 4.3 1.6 7L12 17.8 6.4 21.3 8 14.3 3 10l6.4-1.4z" fill={colors.ink} />
    </svg>
  );
}
