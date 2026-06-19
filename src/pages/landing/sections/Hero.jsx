import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { heroReveal } from "../../../design-system/motion";
import Button from "../../../design-system/primitives/Button";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <motion.span
        {...heroReveal(0, 12)}
        className="font-body text-comet-teal font-semibold tracking-wide uppercase text-sm mb-4"
      >
        Built on Dr. Marion Blank's method
      </motion.span>

      <motion.h1
        {...heroReveal(0.1)}
        className="font-display text-cloud text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tight leading-[0.95]"
      >
        200 Magic Words
      </motion.h1>

      <motion.p
        {...heroReveal(0.25)}
        className="font-body text-cloud/80 text-lg sm:text-xl max-w-xl mt-6"
      >
        Every reader starts the same way: a small set of words, said often enough
        to stick. That's the whole idea.
      </motion.p>

      <motion.div {...heroReveal(0.4)} className="flex flex-col sm:flex-row gap-4 mt-10">
        <Button as={Link} to="/app" variant="primary">
          Start with your child
        </Button>
        <Button as="a" href="#method" variant="outline">
          See how it works
        </Button>
      </motion.div>

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1 }, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-10 text-cloud/50 font-body text-sm"
      >
        Scroll
      </motion.div>
    </section>
  );
}
