import { useEffect, useRef, useState } from 'react';
import { T } from './gameTheme';
import { supabase } from '../supabaseClient';
import { playAudio, fetchAudio } from './gameAudio';
import { getPromptText } from './promptText';
import WordArt from '../components/WordArt';

// Draw It — semantic-encoding activity (MLC 10-activity table). No
// right/wrong: drawing the word by hand is the point. Saves a PNG to the
// private `drawings` Storage bucket (path `{userId}/{childId}/...`, RLS-
// scoped — see migration 0010) and creates a magic_moment so it shows up
// in the parent's Magic Moments feed.
export default function DrawIt({ quiz, onAnswer, userId, childId }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [startTime] = useState(() => Date.now());

  // Previously silent — every other activity now speaks a carrier prompt
  // on mount, this one had none at all.
  useEffect(() => {
    fetchAudio(getPromptText(quiz, 'draw_it')).then(playAudio);
  }, [quiz?.word]);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function startDraw(e) {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = T.teal;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleDone() {
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const path = `${userId}/${childId}/${quiz.word}-${Date.now()}.png`;

      if (blob && userId && childId) {
        const { error: uploadError } = await supabase.storage.from('drawings').upload(path, blob, { contentType: 'image/png' });
        if (!uploadError) {
          const { data: signed } = await supabase.storage.from('drawings').createSignedUrl(path, 60 * 60 * 24 * 365);
          await supabase.from('magic_moments').insert({
            child_id: childId,
            kind: 'drawing',
            payload: { word: quiz.word, image_path: path, image_url: signed?.signedUrl ?? null },
          });
        }
      }
    } catch {
      // Non-fatal — the child's session shouldn't stall on a Storage hiccup.
      // The drawing just won't appear in Magic Moments this time.
    } finally {
      setSaving(false);
      onAnswer({ correct: true, responseTimeMs: Date.now() - startTime, firstTry: true });
    }
  }

  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, marginBottom: '0.5rem' }}>
        Draw a {quiz.word}!
      </div>
      {/* Drawing reference — this activity had no picture at all before
          (docs/200MW_Prompt3_WordArt_Hybrid.md AUDIT). Reuses the same
          WordArt registry as every other activity, no interaction change. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
        <WordArt word={quiz.word} size={80} />
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        style={{ background: '#fff', borderRadius: 20, border: `2px solid ${T.border}`, touchAction: 'none', margin: '0 auto', display: 'block' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: '1.25rem' }}>
        <button onClick={clearCanvas} style={{
          padding: '0.75rem 1.25rem', borderRadius: 100, border: `2px solid ${T.border}`, background: 'transparent',
          color: T.white, fontFamily: 'Space Grotesk', cursor: 'pointer',
        }}>
          Clear
        </button>
        <button onClick={handleDone} disabled={saving} style={{
          padding: '0.75rem 1.5rem', borderRadius: 100, border: 'none', background: T.teal,
          color: '#00332E', fontFamily: 'Space Grotesk', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving…' : 'Done!'}
        </button>
      </div>
    </div>
  );
}
