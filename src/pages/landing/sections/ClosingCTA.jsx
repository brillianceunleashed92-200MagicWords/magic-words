import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function ClosingCTA() {
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6 }}
        className="bg-cloud rounded-3xl p-12 max-w-lg flex flex-col items-center"
      >
        <h2 className="font-display text-dawn-indigo text-4xl sm:text-5xl font-semibold mb-6">
          Start with one word
        </h2>
        <p className="font-body text-dawn-indigo/80 text-lg max-w-md mb-10">
          The rest follows. Create a free account and see your child's first
          words today.
        </p>
        <Link
          to="/app"
          className="font-body font-bold px-8 py-4 rounded-2xl bg-sunrise-coral text-dawn-indigo hover:brightness-105 transition-all"
        >
          Get started
        </Link>
      </motion.div>
    </section>
  );
}
