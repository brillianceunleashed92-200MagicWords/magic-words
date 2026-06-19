import SectionReveal from "../../../design-system/primitives/SectionReveal";
import TiltCard from "../../../design-system/primitives/TiltCard";
import { LightCard } from "../../../design-system/primitives/Card";

export default function Audience() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-8 w-full">
        <SectionReveal>
          <TiltCard as={LightCard} className="p-10">
            <h3 className="font-display text-dawn-indigo text-3xl font-semibold mb-4">
              For parents
            </h3>
            <p className="font-body text-dawn-indigo/80 text-lg">
              Five minutes a day, at home, in the order your child is ready for.
              Progress is visible — not as a score to chase, but as words your
              child actually uses.
            </p>
          </TiltCard>
        </SectionReveal>

        <SectionReveal delay={0.1}>
          <TiltCard as={LightCard} className="p-10">
            <h3 className="font-display text-dawn-indigo text-3xl font-semibold mb-4">
              For teachers
            </h3>
            <p className="font-body text-dawn-indigo/80 text-lg">
              A roster that shows where each student stands, in a method built
              for exactly this population — without extra paperwork.
            </p>
          </TiltCard>
        </SectionReveal>
      </div>
    </section>
  );
}
