import { useState } from 'react';
import { colors, fonts, shadows } from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import { useParentSettingsQuery, useUpdateParentSettingsMutation } from '../../lib/queries/parentSettings';
import { useSubscriptionQuery } from '../../lib/queries/subscription';
import { useCreatePortalSession } from '../../lib/queries/checkout';
import { useCandyGalaxyData } from '../../lib/useCandyGalaxyData';
import { useUIStore } from '../../stores/useUIStore';
import { supabase } from '../../supabaseClient';
import UpgradeBanner from './UpgradeBanner';

const TIME_LIMIT_OPTIONS = [null, 10, 15, 20, 30];

// Time controls (blueprint 4.3 — "parents TRUST apps that offer limits").
// Real DB-backed settings now (migration 0009), enforced in the child app
// via src/lib/useSessionTimeLimit.js's soft Nova lockout.
export default function SettingsTab() {
  const { user, signOut } = useAuth();
  const settingsQ = useParentSettingsQuery(user?.id);
  const updateSettings = useUpdateParentSettingsMutation(user?.id);
  const subscriptionQ = useSubscriptionQuery(user?.id);
  const portalSession = useCreatePortalSession();
  const { activeChild } = useCandyGalaxyData();
  const startPlacementFlow = useUIStore((s) => s.startPlacementFlow);
  const dailyLimit = settingsQ.data?.daily_minutes_limit ?? null;
  const weekendPause = settingsQ.data?.weekend_streak_pause ?? false;
  const plan = subscriptionQ.data?.plan ?? 'free';

  const [deleteStep, setDeleteStep] = useState('idle'); // idle | confirming | deleting | error
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteAccount() {
    setDeleteStep('deleting');
    setDeleteError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `delete-account returned ${res.status}`);
      }
      // The account no longer exists — sign out clears local state and
      // returns to the login screen, since there's nothing left to show.
      await signOut();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteStep('error');
    }
  }

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
        Plan
      </div>
      {plan === 'family' ? (
        <div style={{ background: colors.cloud, borderRadius: 20, padding: 16, marginBottom: 24, boxShadow: shadows.chunkSm }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>
            Family plan — {subscriptionQ.data?.status === 'active' ? 'active' : subscriptionQ.data?.status}
          </div>
          {subscriptionQ.data?.current_period_end && (
            <div style={{ color: colors.mutedInk, fontSize: '.85rem', marginBottom: 12 }}>
              Renews {new Date(subscriptionQ.data.current_period_end).toLocaleDateString()}
            </div>
          )}
          <button
            onClick={() => user && portalSession.mutate()}
            disabled={portalSession.isPending}
            style={{
              background: 'rgba(0,0,0,.06)', border: 'none', borderRadius: 100, padding: '8px 16px',
              fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem', color: colors.ink, cursor: 'pointer',
            }}
          >
            Manage subscription
          </button>
          {portalSession.isError && (
            <div style={{ marginTop: 8, fontSize: '.8rem', color: colors.tang }}>{portalSession.error.message}</div>
          )}
        </div>
      ) : (
        <UpgradeBanner variant="subtle" surface="settings" />
      )}

      {activeChild && (
        <>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
            Placement
          </div>
          <div style={{ color: colors.mutedInk, fontSize: '.85rem', marginBottom: 10 }}>
            This won't erase any progress — it just double-checks {activeChild.name}'s starting star.
          </div>
          <button
            onClick={() => startPlacementFlow(activeChild.id, 'adventure')}
            style={{
              padding: '10px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,.06)', color: colors.ink,
              fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem', marginBottom: 24,
            }}
          >
            Retake placement
          </button>
        </>
      )}

      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
        Daily Time Limit
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {TIME_LIMIT_OPTIONS.map((mins) => (
          <button
            key={mins ?? 'none'}
            onClick={() => updateSettings.mutate({ daily_minutes_limit: mins })}
            style={{
              padding: '10px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontFamily: fonts.display, fontWeight: 700,
              background: dailyLimit === mins ? colors.sky : 'rgba(0,0,0,.06)',
              color: dailyLimit === mins ? '#fff' : colors.ink,
            }}
          >
            {mins ? `${mins} min/day` : 'No limit'}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
        Weekend Streak Pause
      </div>
      <div style={{ color: colors.mutedInk, fontSize: '.85rem', marginBottom: 10 }}>
        Streaks pause automatically on Saturday/Sunday — family schedules are real.
      </div>
      <button
        onClick={() => updateSettings.mutate({ weekend_streak_pause: !weekendPause })}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, background: colors.cloud, border: 'none',
          borderRadius: 100, padding: '10px 16px', cursor: 'pointer', boxShadow: shadows.chunkSm,
        }}
      >
        <div style={{
          width: 40, height: 22, borderRadius: 100, background: weekendPause ? colors.mint : 'rgba(0,0,0,.15)',
          position: 'relative', transition: 'background .2s',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
            left: weekendPause ? 20 : 2, transition: 'left .2s',
          }} />
        </div>
        <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.ink, fontSize: '.85rem' }}>
          {weekendPause ? 'On' : 'Off'}
        </span>
      </button>

      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8, marginTop: 24 }}>
        Account
      </div>
      <button
        onClick={() => signOut()}
        style={{
          padding: '10px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,.06)', color: colors.ink,
          fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
        }}
      >
        Sign out
      </button>

      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.tang, marginBottom: 8, marginTop: 32 }}>
        Danger zone
      </div>
      {deleteStep === 'idle' && (
        <button
          onClick={() => setDeleteStep('confirming')}
          style={{
            padding: '10px 16px', borderRadius: 100, border: `1px solid ${colors.tang}`, cursor: 'pointer',
            background: 'transparent', color: colors.tang,
            fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
          }}
        >
          Delete account & all data
        </button>
      )}
      {deleteStep === 'confirming' && (
        <div style={{ background: colors.cloud, borderRadius: 20, padding: 16, boxShadow: shadows.chunkSm }}>
          <div style={{ color: colors.ink, fontWeight: 700, marginBottom: 8 }}>
            This permanently deletes your account, every child profile, all word
            progress, streaks, stories, and drawings. This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDeleteAccount}
              style={{
                padding: '10px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
                background: colors.tang, color: '#fff',
                fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
              }}
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setDeleteStep('idle')}
              style={{
                padding: '10px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
                background: 'rgba(0,0,0,.06)', color: colors.ink,
                fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {deleteStep === 'deleting' && (
        <div style={{ color: colors.mutedInk }}>Deleting…</div>
      )}
      {deleteStep === 'error' && (
        <div>
          <div style={{ color: colors.tang, fontSize: '.85rem', marginBottom: 8 }}>Couldn't delete account: {deleteError}</div>
          <button
            onClick={() => setDeleteStep('confirming')}
            style={{
              padding: '10px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,.06)', color: colors.ink,
              fontFamily: fonts.display, fontWeight: 700, fontSize: '.85rem',
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
