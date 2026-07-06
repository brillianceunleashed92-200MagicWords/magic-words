import { useRef, useState } from 'react';
import { colors, fonts, shadows } from '../../theme/tokens';
import { useCandyGalaxyData } from '../../lib/useCandyGalaxyData';
import { useMagicMomentsQuery, useMarkMomentSharedMutation } from '../../lib/queries/magicMoments';
import { IconStar, IconTrophy, IconFlame, IconSpark } from '../../components/icons';
import { InterestArt } from '../../components/icons/InterestGlyphs';
import WordArt from '../../components/WordArt';

// Icon is a component reference, not an emoji string — rendered both in
// the moments list and inside the hidden html2canvas share-image frame
// below (html2canvas rasterizes real DOM/SVG fine, so this works for the
// downloaded/shared PNG too, not just on-screen).
//
// `tracing` (Prompt 7 Part 6) has no Icon — it renders via `Thumbnail`
// instead (below), reusing WordArt's own has_art/typographic fallback
// rather than duplicating that logic here (a "Traced cat!" card gets the
// real WordArt illustration when one exists, a plain typographic
// treatment otherwise — exactly what WordArt already does for free).
const KIND_LABELS = {
  star_ignition: { Icon: IconStar, title: (p) => `"${p.word}" star ignited!` },
  drawing: { Icon: InterestArt, title: (p) => `Drew a ${p.word}` },
  tracing: { Thumbnail: (p, size = 26) => <WordArt word={p.word} size={size} />, title: (p) => `Traced "${p.word}"!` },
  audio_reading: { Icon: IconSpark, title: (p) => `Read "${p.title}"` },
  milestone: { Icon: IconTrophy, title: (p) => p.title ?? 'Milestone reached!' },
  streak: { Icon: IconFlame, title: (p) => `${p.streak}-day streak!` },
};
const DEFAULT_KIND = { Icon: IconSpark, title: () => 'A Magic Moment' };

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
    const meta = KIND_LABELS[moment.kind] ?? DEFAULT_KIND;
    setSharingId(moment.id);
    setFrameContent({
      Icon: meta.Icon,
      Thumbnail: meta.Thumbnail ? () => meta.Thumbnail(moment.payload, 48) : null,
      title: meta.title(moment.payload),
      imageUrl: moment.payload?.image_url,
    });

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
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {frameContent?.Thumbnail ? <frameContent.Thumbnail /> : frameContent?.Icon && <frameContent.Icon size={48} color={colors.sky} />}
          </div>
          {frameContent?.imageUrl && <img src={frameContent.imageUrl} alt="" style={{ width: '100%', borderRadius: 16, margin: '12px 0' }} crossOrigin="anonymous" />}
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', color: colors.ink, margin: '12px 0' }}>
            {frameContent?.title}
          </div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.sky, fontSize: '.9rem' }}>
            200 Magic Words
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
          const meta = KIND_LABELS[m.kind] ?? DEFAULT_KIND;
          return (
            <div key={m.id} style={{ background: colors.cloud, borderRadius: 20, padding: 14, boxShadow: shadows.chunkSm, display: 'flex', alignItems: 'center', gap: 12 }}>
              {m.payload?.image_url ? (
                <img src={m.payload.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
              ) : meta.Thumbnail ? (
                <span style={{ display: 'flex' }}>{meta.Thumbnail(m.payload)}</span>
              ) : (
                <span style={{ display: 'flex' }}><meta.Icon size={26} color={colors.ink} /></span>
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
