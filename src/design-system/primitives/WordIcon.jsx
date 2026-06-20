import { wordIcons } from "../wordIcons";

// Renders the illustrated icon for a word if one exists yet, otherwise
// falls back to its emoji — identical visual slot either way, so callers
// don't need to branch. This is the whole point of the incremental
// illustration system: nothing breaks while coverage is still partial.
export default function WordIcon({ word, emoji, size = "1em", style, className }) {
  const iconUrl = wordIcons[word];
  if (!iconUrl) {
    return <span className={className} style={style}>{emoji}</span>;
  }
  return (
    <img
      src={iconUrl}
      alt={word}
      className={className}
      style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", ...style }}
    />
  );
}
