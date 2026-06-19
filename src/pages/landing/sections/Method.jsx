import SectionReveal from "../../../design-system/primitives/SectionReveal";

export default function Method() {
  return (
    <section
      id="method"
      className="relative min-h-screen flex items-center px-6 py-24"
    >
      <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-12 items-center">
        <SectionReveal direction="left">
          <h2 className="font-display text-cloud text-4xl sm:text-5xl font-semibold mb-6">
            Not all words do the same job
          </h2>
          <p className="font-body text-cloud/80 text-lg mb-4">
            Some words carry the meaning — <em>dog</em>, <em>run</em>, <em>big</em>.
            We call these content words.
          </p>
          <p className="font-body text-cloud/80 text-lg">
            Others hold the sentence together — <em>the</em>, <em>is</em>, <em>and</em>.
            We call these non-content words. A child needs both, and most programs
            only teach the first kind.
          </p>
        </SectionReveal>

        <SectionReveal direction="right" delay={0.1} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="font-body font-bold px-4 py-2 rounded-full bg-comet-teal text-dawn-indigo">
              dog
            </span>
            <span className="font-body text-cloud/70 text-sm">content word — bold, filled</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body font-bold px-4 py-2 rounded-full bg-comet-teal text-dawn-indigo">
              run
            </span>
            <span className="font-body text-cloud/70 text-sm">content word</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body font-semibold px-4 py-2 rounded-full border-2 border-marigold text-cloud">
              the
            </span>
            <span className="font-body text-cloud/70 text-sm">non-content word — outline, lighter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body font-semibold px-4 py-2 rounded-full border-2 border-marigold text-cloud">
              and
            </span>
            <span className="font-body text-cloud/70 text-sm">non-content word</span>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
