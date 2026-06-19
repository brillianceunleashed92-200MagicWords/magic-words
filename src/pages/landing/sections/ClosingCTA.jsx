import { Link } from "react-router-dom";
import SectionReveal from "../../../design-system/primitives/SectionReveal";
import { LightCard } from "../../../design-system/primitives/Card";
import Button from "../../../design-system/primitives/Button";

export default function ClosingCTA() {
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <SectionReveal className="max-w-lg">
        <LightCard className="p-12 flex flex-col items-center">
          <h2 className="font-display text-dawn-indigo text-4xl sm:text-5xl font-semibold mb-6">
            Start with one word
          </h2>
          <p className="font-body text-dawn-indigo/80 text-lg max-w-md mb-10">
            The rest follows. Create a free account and see your child's first
            words today.
          </p>
          <Button as={Link} to="/app" variant="primary">
            Get started
          </Button>
        </LightCard>
      </SectionReveal>
    </section>
  );
}
