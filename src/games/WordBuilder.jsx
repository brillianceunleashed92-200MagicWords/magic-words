import { useCallback, useEffect, useState } from 'react';
import { playAudio, fetchAudio } from './gameAudio';
import { colors, fonts, shadows } from '../theme/tokens';
import WordArt from '../components/WordArt';
import { IconSpeaker } from '../components/icons';
import { validSuffixesFor, pickValidSuffix, inflect } from '../lib/wordMorphology';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(((i + 1) * 9301 + 49297) % 233280 / 233280 * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Word Builder — morphology activity (MLC "Word Builder" per the
// blueprint's 10-activity table). Tap letter tiles in order to spell the
// target word, sometimes with a +ing/+ed variant.
//
// The suffix and the resulting spelling both come from
// src/lib/wordMorphology.js, which only ever offers a suffix that
// produces a real inflected form for that specific word (see that file's
// header for why "is this a verb" alone wasn't enough — several of the
// verbs in this word list are irregular). Previously this component
// picked a suffix from a hash of the word's characters with no linguistic
// checking at all, producing real words like "froging" (frog is a noun)
// and "doged" (dog is a noun) — see docs/WORDBUILDER_FIX_REPORT.md.
export default function WordBuilder({ quiz, onAnswer }) {
  const suffix = pickValidSuffix(quiz.word);
  const target = inflect(quiz.word, suffix);

  // Dev-time invariants — fail loudly if either is ever violated, same
  // spirit as the Story Engine's vocabulary validator. Both should be
  // structurally impossible given pickValidSuffix/inflect above, but this
  // is exactly the kind of silent-corruption bug that produced "froging"
  // in the first place, so it's worth asserting rather than trusting.
  if (import.meta.env?.DEV) {
    if (suffix && !validSuffixesFor(quiz.word).includes(suffix)) {
      throw new Error(`[WordBuilder] "${quiz.word}" was given invalid suffix "${suffix}"`);
    }
    if (target.length < quiz.word.length) {
      throw new Error(`[WordBuilder] target "${target}" is shorter than base word "${quiz.word}"`);
    }
  }

  const [tiles] = useState(() => shuffle(target.split('')));
  const [built, setBuilt] = useState([]);
  const [wrong, setWrong] = useState(false);
  const [startTime] = useState(() => Date.now());
  // Progressive hint (Prompt 7 Part 4): a first-letter POSITION highlight
  // only — never speaks or sounds out the letter, just marks which tray
  // tile to tap next. Struggle signal chosen: first wrong tap, matching
  // the same "first miss" trigger every other errorless scaffold in the
  // app already uses (WordMatch/WordHunt/FindTheWord) rather than an
  // arbitrary idle timer that could fire while a child is still thinking
  // normally. Once triggered it stays on for the rest of this word (not
  // re-armed per letter) — one nudge into the pattern, not a hint on
  // every single tile. Static (no pulse animation) — a plain colored
  // ring, so there's nothing to gate on reduced-motion in the first place.
  const [hintActive, setHintActive] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  // Slot count must always equal the real target's length, and the tray
  // must always contain exactly the target's letters (shuffled) — both
  // hold by construction here (tiles === shuffle(target.split(''))), but
  // asserted explicitly since this is exactly the invariant that broke
  // silently before (a 7-slot puzzle — "frog" + "ing" — that no real
  // word could ever fill, because the target itself wasn't a real word).
  if (import.meta.env?.DEV) {
    const tileLetters = [...tiles].sort().join('');
    const targetLetters = [...target].sort().join('');
    if (tiles.length !== target.length || tileLetters !== targetLetters) {
      throw new Error(`[WordBuilder] tray "${tiles.join('')}" cannot spell target "${target}"`);
    }
  }

  // Says the actual spelling target ("running"), not the base word
  // ("run") — the audio previously named the base word while the tiles
  // spelled the inflected form, a real word/task mismatch independent of
  // the carrier-sentence rewrite (see src/games/promptText.js for the
  // same "Can you spell X?" phrasing used elsewhere).
  useEffect(() => {
    setAudioUrl(null);
    fetchAudio(`Can you spell "${target}"?`).then((url) => {
      if (url) { setAudioUrl(url); playAudio(url); }
    });
  }, [target]);

  // Hint audit (Prompt 8 Part 4 housekeeping): the other deferred replay
  // gap flagged in the Prompt 7 polish pass's hint audit -- this activity
  // never had a speaker button, only the letter-position hint.
  const replayAudio = useCallback(() => { if (audioUrl) playAudio(audioUrl); }, [audioUrl]);

  function tapLetter(idx) {
    if (built.includes(idx)) return;
    const nextBuilt = [...built, idx];
    const attempted = nextBuilt.map((i) => tiles[i]).join('');
    const expectedSoFar = target.slice(0, attempted.length);
    if (attempted !== expectedSoFar) {
      setWrong(true);
      setHintActive(true);
      setTimeout(() => setWrong(false), 400);
      return;
    }
    setBuilt(nextBuilt);
    if (nextBuilt.length === target.length) {
      setTimeout(() => onAnswer({ correct: true, responseTimeMs: Date.now() - startTime, firstTry: true }), 700);
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px', textAlign: 'center' }}>
      <div style={{ margin: '8px 0 12px', display: 'flex', justifyContent: 'center' }}>
        <WordArt word={quiz.word} size={90} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.cloud }}>
          Build the word{suffix ? ` (add "${suffix}")` : ''}
        </div>
        <button
          onClick={replayAudio}
          disabled={!audioUrl}
          aria-label="Hear the word again"
          style={{
            width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,.14)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: audioUrl ? 'pointer' : 'default', opacity: audioUrl ? 1 : 0.5,
          }}
        >
          <IconSpeaker size={16} color={colors.cloud} />
        </button>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '2rem', flexWrap: 'wrap',
        animation: wrong ? 'mw-shake 0.4s ease' : 'none',
      }}>
        {target.split('').map((_, i) => (
          <div key={i} style={{
            width: 44, height: 54, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i < built.length ? colors.mint : colors.cloud,
            boxShadow: shadows.chunkSm,
            fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800, color: colors.ink, textTransform: 'uppercase',
          }}>
            {i < built.length ? tiles[built[i]] : ''}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {tiles.map((letter, i) => {
          // First unbuilt tile whose letter matches the next slot needed —
          // with duplicate letters (e.g. "bee"), any matching instance is
          // an equally correct affordance, so the first one found is fine.
          const isNextHintTile = hintActive && !built.includes(i) && letter === target[built.length]
            && tiles.findIndex((l, j) => !built.includes(j) && l === target[built.length]) === i;
          return (
            <button
              key={i}
              onClick={() => tapLetter(i)}
              disabled={built.includes(i)}
              style={{
                width: 52, height: 52, borderRadius: 14, border: 'none', cursor: built.includes(i) ? 'default' : 'pointer',
                background: colors.sun, color: colors.starText,
                fontFamily: fonts.display, fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase',
                boxShadow: isNextHintTile
                  ? `${shadows.chunkSm}, 0 0 0 4px ${colors.mint}, 0 0 16px rgba(62,224,184,.7)`
                  : shadows.chunkSm,
                opacity: built.includes(i) ? 0.35 : 1,
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
