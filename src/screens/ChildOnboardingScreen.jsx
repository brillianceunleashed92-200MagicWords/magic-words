import { useState } from 'react';
import { colors, fonts, shadows, skyGradient } from '../theme/tokens';
import ChunkyButton from '../components/candy/ChunkyButton';
import { AVATARS } from '../lib/avatars';
import { INTERESTS, MAX_INTERESTS } from '../lib/interests';
import { useAuth } from '../hooks/useAuth';
import { useCreateChildProfileMutation } from '../lib/queries/childProfiles';
import { useUIStore } from '../stores/useUIStore';
import { AvatarIcon } from '../components/icons/AvatarGlyphs';
import { InterestIcon } from '../components/icons/InterestGlyphs';
import { IconStar, IconPlay } from '../components/icons';

// Shown whenever the signed-in parent has zero child_profiles rows yet —
// first-run for a brand-new account, or right after tapping "+ Add child"
// from the switcher. Name + avatar + up to 3 interests (moderated list,
// no free text — see docs/mlc-engine-audit.md / AI Safety Rules: no child
// PII collected here beyond a first name the parent chooses to enter).
export default function ChildOnboardingScreen({ onDone }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].id);
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
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    const child = await createChild.mutateAsync({ name: trimmed, avatar, interests });
    setActiveChildId(child.id);
    onDone?.(child);
  }

  return (
    <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, padding: '2rem 1.25rem', fontFamily: fonts.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.6rem', color: colors.cloud, textAlign: 'center', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Let's meet your Star Learner! <IconStar size={22} color={colors.sun} />
        </div>
        <div style={{ color: 'rgba(255,255,255,.8)', textAlign: 'center', marginBottom: 24 }}>
          A few quick things so Nova can get to know them.
        </div>

        <label style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, fontSize: '.9rem' }}>What's their name?</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Emma"
          maxLength={40}
          style={{
            width: '100%', marginTop: 8, marginBottom: 24, padding: '14px 16px', borderRadius: 20,
            border: 'none', fontFamily: fonts.body, fontSize: '1rem', boxSizing: 'border-box',
          }}
        />

        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, fontSize: '.9rem', marginBottom: 8 }}>Pick an avatar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
          {AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAvatar(a.id)}
              aria-label={a.name}
              style={{
                minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 20, cursor: 'pointer',
                background: avatar === a.id ? colors.sun : colors.cloud,
                border: avatar === a.id ? `3px solid ${colors.tang}` : 'none',
                boxShadow: shadows.chunkSm,
              }}
            >
              <AvatarIcon value={a.id} size={40} />
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
                  border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <InterestIcon id={i.id} size={16} /> {i.label}
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
          {createChild.isPending ? 'Creating…' : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Let's go! <IconPlay size={16} /></span>
          )}
        </ChunkyButton>
      </div>
    </div>
  );
}
