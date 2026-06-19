import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { CONTENT_WORDS, NON_CONTENT_WORDS } from "../data/sampleWords";

const WORDS = [
  ...CONTENT_WORDS.map((w) => ({ ...w, contentWord: true })),
  ...NON_CONTENT_WORDS.map((w) => ({ ...w, contentWord: false })),
];

function RisingWord({ word, contentWord, index, progress, total }) {
  const start = (index / total) * 0.6;
  const end = start + 0.35;
  const y = useTransform(progress, [start, end], [120, 0]);
  const opacity = useTransform(progress, [start, start + 0.15, end], [0, 1, 1]);
  const scale = useTransform(progress, [start, end], [0.7, 1]);

  return (
    <motion.span
      style={{ y, opacity, scale }}
      className={
        "font-body text-sm sm:text-base font-bold px-4 py-2 rounded-full " +
        (contentWord
          ? "bg-comet-teal text-dawn-indigo"
          : "border-2 border-marigold text-cloud")
      }
    >
      {word}
    </motion.span>
  );
}

// Signature element: the 200 core words rise out of the dawn sky and
// gather around Nova — literalizes "200 words" and ties to the existing
// Word Galaxy / Nova mascot rather than a new metaphor.
export default function WordRise() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const novaScale = useTransform(scrollYProgress, [0.55, 0.85], [0.6, 1.15]);
  const novaOpacity = useTransform(scrollYProgress, [0.5, 0.7], [0, 1]);

  return (
    <section ref={ref} className="relative min-h-[160vh] flex flex-col items-center justify-center px-6 py-32">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center gap-6">
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
          {WORDS.map((w, i) => (
            <RisingWord
              key={w.word}
              word={w.word}
              contentWord={w.contentWord}
              index={i}
              progress={scrollYProgress}
              total={WORDS.length}
            />
          ))}
        </div>

        <motion.div
          style={{ scale: novaScale, opacity: novaOpacity }}
          className="text-5xl"
          aria-hidden="true"
        >
          🧑‍🚀
        </motion.div>

        <p className="font-body text-cloud/70 text-center max-w-md">
          Two kinds of words, working together — one set carries the meaning,
          the other holds the sentence up.
        </p>
      </div>
    </section>
  );
}
