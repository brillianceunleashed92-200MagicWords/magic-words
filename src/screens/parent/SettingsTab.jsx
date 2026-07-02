import { colors, fonts, shadows } from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import { useParentSettingsQuery, useUpdateParentSettingsMutation } from '../../lib/queries/parentSettings';

const TIME_LIMIT_OPTIONS = [null, 10, 15, 20, 30];

// Time controls (blueprint 4.3 — "parents TRUST apps that offer limits").
// Real DB-backed settings now (migration 0009), enforced in the child app
// via src/lib/useSessionTimeLimit.js's soft Nova lockout.
export default function SettingsTab() {
  const { user } = useAuth();
  const settingsQ = useParentSettingsQuery(user?.id);
  const updateSettings = useUpdateParentSettingsMutation(user?.id);
  const dailyLimit = settingsQ.data?.daily_minutes_limit ?? null;
  const weekendPause = settingsQ.data?.weekend_streak_pause ?? false;

  return (
    <div>
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
    </div>
  );
}
