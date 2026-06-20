// Word-icon registry — incremental by design. Drop a new `<word>.svg` into
// src/assets/icons/words/ and it's picked up automatically, no code change
// needed here. Words without a file fall back to their emoji (see
// <WordIcon> in primitives/WordIcon.jsx) — illustrating all 200 words is
// explicitly NOT required before any of this ships.
const modules = import.meta.glob("../assets/icons/words/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

export const wordIcons = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => {
    const word = path.split("/").pop().replace(".svg", "");
    return [word, url];
  })
);

export function hasWordIcon(word) {
  return Boolean(wordIcons[word]);
}
