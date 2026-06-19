import { motion } from "motion/react";

export default function Audience() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="bg-cloud rounded-3xl p-10"
        >
          <h3 className="font-display text-dawn-indigo text-3xl font-semibold mb-4">
            For parents
          </h3>
          <p className="font-body text-dawn-indigo/80 text-lg">
            Five minutes a day, at home, in the order your child is ready for.
            Progress is visible — not as a score to chase, but as words your
            child actually uses.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-cloud rounded-3xl p-10"
        >
          <h3 className="font-display text-dawn-indigo text-3xl font-semibold mb-4">
            For teachers
          </h3>
          <p className="font-body text-dawn-indigo/80 text-lg">
            A roster that shows where each student stands, in a method built
            for exactly this population — without extra paperwork.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
