import { useState } from 'react';
import { colors, fonts, shadows, skyGradient } from '../theme/tokens';
import ChunkyButton from '../components/candy/ChunkyButton';
import { AVATARS } from '../lib/avatars';
import { INTERESTS, MAX_INTERESTS } from '../lib/interests';
import { useAuth } from '../hooks/useAuth';
import { useCreateChildProfileMutation } from '../lib/queries/childProfiles';
import { useUIStore } from '../stores/useUIStore';

// Shown whenever the signed-in parent has zero child_profiles rows yet —
// first-run for a brand-new account, or right after tapping "+ Add child"
// from the switcher. Name + avatar + up to 3 interests (moderated list,
// no free text — see docs/mlc-engine-audit.md / AI Safety Rules: no child
// PII collected here beyond a first name the parent chooses to enter).
export default function ChildOnboardingScreen({ onDone }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].emoji);
  const [interests, setInterests] = useState([]);
  const createChild = useCreateChildProfileMutation(user?.id);
  const setActiveChildId = useUIStore((s) => s.setActiveChildId);

  function toggleInterest(id) {
    setInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, id];
    });
  }

  async function handleCreate() {
    if (!name.trim()) return;
    const child = await createChild.mutateAsync({ name: name.trim(), avatar, interests });
    setActiveChildId(child.id);
    onDone?.(child);
  }

  return (
    <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, padding: '2rem 1.25rem', fontFamily: fonts.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.6rem', color: colors.cloud, textAlign: 'center', marginBottom: 6 }}>
          Let's meet your Star Learner! ⭐
        </div>
        <div style={{ color: 'rgba(255,255,255,.8)', textAlign: 'center', marginBottom: 24 }}>
          A few quick things so Nova can get to know them.
        </div>

        <label style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, fontSize: '.9rem' }}>What's their name?</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Emma"
          style={{
            width: '100%', marginTop: 8, marginBottom: 24, padding: '14px 16px', borderRadius: 20,
            border: 'none', fontFamily: fonts.body, fontSize: '1rem', boxSizing: 'border-box',
          }}
        />

        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, fontSize: '.9rem', marginBottom: 8 }}>Pick an avatar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
          {AVATARS.map((a) => (
            <button
              key={a.emoji}
              onClick={() => setAvatar(a.emoji)}
              style={{
                minHeight: 64, fontSize: '1.8rem', borderRadius: 20, cursor: 'pointer',
                background: avatar === a.emoji ? colors.sun : colors.cloud,
                border: avatar === a.emoji ? `3px solid ${colors.tang}` : 'none',
                boxShadow: shadows.chunkSm,
              }}
            >
              {a.emoji}
            </button>
          ))}
        </div>

        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, fontSize: '.9rem', marginBottom: 8 }}>
          What do they love? (pick up to {MAX_INTERESTS})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {INTERESTS.map((i) => {
            const selected = interests.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() => toggleInterest(i.id)}
                style={{
                  padding: '10px 16px', borderRadius: 100, cursor: 'pointer',
                  fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
                  background: selected ? colors.mint : 'rgba(255,255,255,.15)',
                  color: selected ? colors.mintDeep : colors.cloud,
                  border: 'none',
                }}
              >
                {i.emoji} {i.label}
              </button>
            );
          })}
        </div>

        <ChunkyButton
          onClick={handleCreate}
          disabled={!name.trim() || createChild.isPending}
          variant="mint"
          style={{ width: '100%' }}
        >
          {createChild.isPending ? 'Creating…' : "Let's go! 🚀"}
        </ChunkyButton>
      </div>
    </div>
  );
}
