import { motion } from "motion/react";
import { useDawnBackground } from "./hooks/useDawnBackground";
import Hero from "./sections/Hero";
import WordRise from "./sections/WordRise";
import Method from "./sections/Method";
import HowItWorks from "./sections/HowItWorks";
import Audience from "./sections/Audience";
import ClosingCTA from "./sections/ClosingCTA";

export default function Landing() {
  const { scrollRef, background } = useDawnBackground();

  return (
    <main ref={scrollRef} className="relative">
      <motion.div
        aria-hidden="true"
        style={{ background }}
        className="fixed inset-0 -z-10"
      />
      <Hero />
      <WordRise />
      <Method />
      <HowItWorks />
      <Audience />
      <ClosingCTA />
    </main>
  );
}
