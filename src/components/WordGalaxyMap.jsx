import { useState } from "react";
import { motion } from "motion/react";
import { useTilt, useParallaxOffset } from "../design-system/useTilt";
import { colors as tokens } from "../design-system/tokens";

// World-map-style unit tile with the tilt-toward-cursor convention from the
// Interaction Design addendum. Locked units get a flatter response (smaller
// max angle, no icon parallax, desaturated) — depth as a reward for what's
// unlocked, not decoration on what isn't (see CLAUDE.md addendum item b).
function UnitTile({ unit, name, icon, locked, mastered, total, progress, expanded, onToggle }) {
  const max = locked ? 2 : 7;
  const { ref, style, handlers, springX, springY } = useTilt({ max });
  const parallax = useParallaxOffset(springX, springY, { factor: locked ? 1 : 1.4, range: 5 });

  return (
    <motion.div
      ref={ref}
      style={{ ...style, willChange: "transform" }}
      {...handlers}
      onClick={onToggle}
      className="font-body"
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          padding: "14px 12px",
          minHeight: 110,
          cursor: locked ? "default" : "pointer",
          background: locked
            ? `${tokens.dawnIndigo}08`
            : `linear-gradient(135deg, ${tokens.cometTeal}22, ${tokens.marigold}14)`,
          border: expanded ? `2px solid ${tokens.cometTeal}` : `1px solid ${tokens.dawnIndigo}1a`,
        }}
      >
        {locked && (
          <span style={{
            position: "absolute", top: 8, right: 8, background: tokens.marigold, color: tokens.dawnIndigo,
            fontSize: 9, fontWeight: 900, borderRadius: 6, padding: "1px 5px",
          }}>PRO</span>
        )}
        <motion.div
          style={locked ? {} : { x: parallax.x, y: parallax.y }}
          className="text-3xl"
        >
          {locked ? "🔒" : icon}
        </motion.div>
        <div className="font-display" style={{ fontSize: 13, color: locked ? `${tokens.dawnIndigo}55` : tokens.cometTealDeep, marginTop: 6 }}>
          Unit {unit}
        </div>
        <div style={{ fontSize: 11, color: locked ? `${tokens.dawnIndigo}44` : tokens.dawnIndigo, opacity: locked ? 1 : 0.75 }}>
          {name}
        </div>
        {!locked && (
          <>
            <div style={{ height: 4, background: `${tokens.dawnIndigo}14`, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${tokens.cometTeal}, ${tokens.marigold})`, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 10, color: tokens.marigoldDeep, fontWeight: 700, marginTop: 4 }}>
              {mastered}/{total}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function WordPill({ word, onClick, getMasteryColor }) {
  return (
    <div
      className="word-orb"
      onClick={onClick}
      style={{
        background: word.mastery === 0 ? `${tokens.dawnIndigo}0d` : getMasteryColor(word.mastery),
        color: word.mastery > 0 ? tokens.dawnIndigo : `${tokens.dawnIndigo}99`,
        borderRadius: 20, padding: "6px 14px", fontSize: 14, fontWeight: word.type === "content" ? 800 : 600,
        border: word.mastery === 0
          ? `2px dashed ${tokens.dawnIndigo}26`
          : (word.type === "content" ? "none" : `2px solid ${tokens.marigold}`),
        cursor: "pointer",
      }}
    >
      {word.emoji} {word.word}
    </div>
  );
}

// Replaces the flat scrollable word list with a spatial unit map
// (CodeCombat-style world-map metaphor, per the original design brief and
// the Interaction Design addendum). Data model and mutation logic
// (mastery, word detail) stay in App.jsx — this component is presentation
// + the expand/collapse interaction only.
export default function WordGalaxyMap({ words, unitNames, onWordClick, getMasteryColor }) {
  const [expandedUnit, setExpandedUnit] = useState(null);

  const units = Array.from({ length: 18 }, (_, i) => i + 1)
    .map(unit => {
      const unitWords = words.filter(w => w.unit === unit);
      if (!unitWords.length) return null;
      const locked = unit > 5;
      const mastered = unitWords.filter(w => w.mastery >= 80).length;
      const progress = unitWords.length > 0 ? mastered / unitWords.length : 0;
      return { unit, words: unitWords, locked, mastered, progress, icon: unitWords[0].emoji };
    })
    .filter(Boolean);

  const expanded = units.find(u => u.unit === expandedUnit);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {units.map(u => (
          <UnitTile
            key={u.unit}
            unit={u.unit}
            name={unitNames[u.unit]}
            icon={u.icon}
            locked={u.locked}
            mastered={u.mastered}
            total={u.words.length}
            progress={u.progress}
            expanded={expandedUnit === u.unit}
            onToggle={() => !u.locked && setExpandedUnit(prev => prev === u.unit ? null : u.unit)}
          />
        ))}
      </div>

      {expanded && (
        <div style={{ marginTop: 16, background: `${tokens.dawnIndigo}08`, border: `1px solid ${tokens.dawnIndigo}1a`, borderRadius: 18, padding: 16 }}>
          <div className="font-display" style={{ fontSize: 16, color: tokens.cometTealDeep, marginBottom: 10 }}>
            Unit {expanded.unit}: {unitNames[expanded.unit]}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {expanded.words.map(w => (
              <WordPill key={w.id} word={w} onClick={() => onWordClick(w)} getMasteryColor={getMasteryColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
