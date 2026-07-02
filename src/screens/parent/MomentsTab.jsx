import { useRef, useState } from 'react';
import { colors, fonts, shadows } from '../../theme/tokens';
import { useCandyGalaxyData } from '../../lib/useCandyGalaxyData';
import { useMagicMomentsQuery, useMarkMomentSharedMutation } from '../../lib/queries/magicMoments';

const KIND_LABELS = {
  star_ignition: { icon: '⭐', title: (p) => `"${p.word}" star ignited!` },
  drawing: { icon: '🎨', title: (p) => `Drew a ${p.word}` },
  audio_reading: { icon: '📖', title: (p) => `Read "${p.title}"` },
  milestone: { icon: '🏆', title: (p) => p.title ?? 'Milestone reached!' },
  streak: { icon: '🔥', title: (p) => `${p.streak}-day streak!` },
};

// Magic Moments feed (blueprint 4.2 — "the viral engine"). Each card can
// generate a branded share image via html2canvas, then either the native
// Web Share sheet (mobile) or a plain download (desktop fallback) — no
// auto-posting anywhere, the parent always picks the destination in their
// own OS share sheet or downloads folder.
export default function MomentsTab() {
  const { activeChild } = useCandyGalaxyData();
  const momentsQ = useMagicMomentsQuery(activeChild?.id);
  const markShared = useMarkMomentSharedMutation(activeChild?.id);
  const [sharingId, setSharingId] = useState(null);
  const frameRef = useRef(null);
  const [frameContent, setFrameContent] = useState(null);

  async function handleShare(moment) {
    const meta = KIND_LABELS[moment.kind] ?? { icon: '✨', title: () => 'A Magic Moment' };
    setSharingId(moment.id);
    setFrameContent({ icon: meta.icon, title: meta.title(moment.payload), imageUrl: moment.payload?.image_url });

    // Wait a tick for the hidden frame to render with the new content.
    await new Promise((r) => setTimeout(r, 50));
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(frameRef.current, { backgroundColor: colors.cloud, scale: 2 });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `magic-moment-${moment.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '200 Magic Words', text: meta.title(moment.payload) });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
      await markShared.mutateAsync(moment.id);
    } catch {
      // Share can be cancelled by the user (AbortError) or fail silently on
      // some platforms — either way, nothing to recover, just stop spinning.
    } finally {
      setSharingId(null);
    }
  }

  const moments = momentsQ.data ?? [];

  return (
    <div>
      {/* Hidden branded frame used only as the html2canvas render source */}
      <div style={{ position: 'fixed', left: -9999, top: 0 }}>
        <div ref={frameRef} style={{
          width: 360, padding: 32, background: colors.cloud, textAlign: 'center',
          fontFamily: fonts.body, border: `4px solid ${colors.sun}`, borderRadius: 24,
        }}>
          <div style={{ fontSize: '3rem' }}>{frameContent?.icon}</div>
          {frameContent?.imageUrl && <img src={frameContent.imageUrl} alt="" style={{ width: '100%', borderRadius: 16, margin: '12px 0' }} crossOrigin="anonymous" />}
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', color: colors.ink, margin: '12px 0' }}>
            {frameContent?.title}
          </div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.sky, fontSize: '.9rem' }}>
            ✨ 200 Magic Words
          </div>
        </div>
      </div>

      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 12 }}>
        Magic Moments
      </div>

      {moments.length === 0 && (
        <div style={{ color: colors.mutedInk, textAlign: 'center', padding: '2rem 0' }}>
          Nothing yet — moments appear here as your child plays (mastered words, drawings, stories, streaks).
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {moments.map((m) => {
          const meta = KIND_LABELS[m.kind] ?? { icon: '✨', title: () => 'A Magic Moment' };
          return (
            <div key={m.id} style={{ background: colors.cloud, borderRadius: 20, padding: 14, boxShadow: shadows.chunkSm, display: 'flex', alignItems: 'center', gap: 12 }}>
              {m.payload?.image_url ? (
                <img src={m.payload.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '1.8rem' }}>{meta.icon}</span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.ink, fontSize: '.9rem' }}>
                  {meta.title(m.payload)}
                </div>
                <div style={{ fontSize: '.7rem', color: colors.mutedInk }}>
                  {new Date(m.created_at).toLocaleDateString()} {m.shared_at && '· shared'}
                </div>
              </div>
              <button
                onClick={() => handleShare(m)}
                disabled={sharingId === m.id}
                style={{
                  background: colors.sky, color: '#fff', border: 'none', borderRadius: 100,
                  padding: '8px 14px', fontFamily: fonts.display, fontWeight: 700, fontSize: '.75rem',
                  cursor: sharingId === m.id ? 'default' : 'pointer', opacity: sharingId === m.id ? 0.6 : 1,
                }}
              >
                {sharingId === m.id ? '…' : 'Share'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
