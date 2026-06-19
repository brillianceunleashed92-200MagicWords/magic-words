import SectionReveal from "../../../design-system/primitives/SectionReveal";
import TiltCard from "../../../design-system/primitives/TiltCard";
import { GlassCard } from "../../../design-system/primitives/Card";

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
        <SectionReveal className="mb-12 text-center">
          <h2 className="font-display text-cloud text-4xl sm:text-5xl font-semibold">
            Four ways to practice
          </h2>
        </SectionReveal>

        <div className="grid sm:grid-cols-2 gap-6">
          {INTERACTIONS.map((item, i) => (
            <SectionReveal key={item.title} delay={i * 0.08}>
              <TiltCard as={GlassCard}>
                <h3 className="font-display text-comet-teal text-2xl font-semibold mb-3">
                  {item.title}
                </h3>
                <p className="font-body text-cloud/75">{item.description}</p>
              </TiltCard>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
