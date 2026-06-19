import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <motion.span
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="font-body text-comet-teal font-semibold tracking-wide uppercase text-sm mb-4"
      >
        Built on Dr. Marion Blank's method
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="font-display text-cloud text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tight leading-[0.95]"
      >
        200 Magic Words
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="font-body text-cloud/80 text-lg sm:text-xl max-w-xl mt-6"
      >
        Every reader starts the same way: a small set of words, said often enough
        to stick. That's the whole idea.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 mt-10"
      >
        <Link
          to="/app"
          className="font-body font-bold px-8 py-4 rounded-2xl bg-sunrise-coral text-dawn-indigo hover:brightness-105 transition-all"
        >
          Start with your child
        </Link>
        <a
          href="#method"
          className="font-body font-semibold px-8 py-4 rounded-2xl border border-cloud/30 text-cloud hover:bg-cloud/10 transition-colors"
        >
          See how it works
        </a>
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
