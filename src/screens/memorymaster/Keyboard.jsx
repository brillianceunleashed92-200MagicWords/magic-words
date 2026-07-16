import { colors, fonts } from './mmTokens';

// MEMORY_MASTER_R1 Phase 4 -- handoff §6's custom in-app keyboard: lowercase
// letters, a one-shot "Big letter" shift (defaults off -- the child
// deliberately chooses every capital, never auto-capitalized), space,
// delete, and exactly the five marks the whole 150-portion corpus needs:
// . ? , ' " (handoff §9 "measured from her corpus"). There is deliberately
// no underlying <input>/<textarea> anywhere in this module -- every
// character is a button press building a plain string in React state, so
// there is structurally no autocorrect, no auto-capitalization, no
// predictive text, and no smart-quote substitution to disable (handoff §6,
// fidelity rule 5).
const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const PUNCT = ['.', '?', ',', "'", '"'];

function Key({ children, onClick, flex = 1, active = false, variant = 'default' }) {
  const bg = variant === 'util' ? (active ? colors.mint : colors.sky) : variant === 'go' ? colors.mint : colors.cloud;
  const color = variant === 'util' ? (active ? colors.ink : colors.cloud) : variant === 'go' ? colors.ink : colors.ink;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex,
        minWidth: 0,
        minHeight: 44,
        background: bg,
        color,
        border: active && variant === 'util' ? `3px solid ${colors.sun}` : 'none',
        borderRadius: 9,
        padding: '11px 0',
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: '1rem',
        cursor: 'pointer',
        boxShadow: '0 3px 0 rgba(0,0,0,.2)',
      }}
    >
      {children}
    </button>
  );
}

export default function Keyboard({ shift, onToggleShift, onKey, onBackspace, onDone, doneLabel = 'Done' }) {
  return (
    <div style={{ background: colors.skyNight, borderRadius: 18, padding: '9px 7px', boxShadow: '0 6px 0 rgba(0,0,0,.14)' }}>
      {ROWS.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 5 }}>
          {row.map((ch) => (
            <Key
              key={ch}
              onClick={() => {
                onKey(shift ? ch.toUpperCase() : ch);
                // One-shot shift: releases after one letter, like a real
                // keyboard -- the child deliberately chooses every capital.
                if (shift) onToggleShift();
              }}
            >
              {shift ? ch.toUpperCase() : ch}
            </Key>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 5 }}>
        <Key flex={2.4} variant="util" active={shift} onClick={onToggleShift}>
          Big letter
        </Key>
        {PUNCT.map((p) => (
          <Key key={p} onClick={() => onKey(p)}>
            {p}
          </Key>
        ))}
        <Key flex={2.4} variant="util" onClick={onBackspace}>
          Del
        </Key>
      </div>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
        <Key flex={4} onClick={() => onKey(' ')}>
          space
        </Key>
        <Key flex={2.4} variant="go" onClick={onDone}>
          {doneLabel}
        </Key>
      </div>
    </div>
  );
}
