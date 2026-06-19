import { motion } from "motion/react";

const INTERACTIONS = [
  {
    title: "Following Commands",
    description: "Your child hears a request and acts on it — the most direct way to show understanding before speech catches up.",
  },
  {
    title: "Verbal Imitation",
    description: "Your child repeats a model. Simple, low-pressure, and the foundation every later step builds on.",
  },
  {
    title: "Answering Questions",
    description: "Your child responds to a question once they're ready — used sparingly, at the right point, not constantly.",
  },
  {
    title: "Sentence Completion",
    description: "Your child finishes a sentence you've started, building toward full, independent sentences.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <div className="max-w-5xl mx-auto w-full">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="font-display text-cloud text-4xl sm:text-5xl font-semibold mb-12 text-center"
        >
          Four ways to practice
        </motion.h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {INTERACTIONS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-cloud/5 border border-cloud/15 rounded-3xl p-8"
            >
              <h3 className="font-display text-comet-teal text-2xl font-semibold mb-3">
                {item.title}
              </h3>
              <p className="font-body text-cloud/75">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
