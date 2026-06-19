// Solid Cloud surface — safe regardless of where it sits on the scroll-driven
// dawn background (Dawn Indigo text on Cloud is AAA at every gradient stop).
export function LightCard({ className = "", children, ...props }) {
  return (
    <div className={`bg-cloud rounded-3xl p-8 ${className}`} {...props}>
      {children}
    </div>
  );
}

// Translucent on-gradient surface — only safe where the background is still
// in its darker range (see CLAUDE.md contrast notes for Method/HowItWorks).
export function GlassCard({ className = "", children, ...props }) {
  return (
    <div className={`bg-cloud/5 border border-cloud/15 rounded-3xl p-8 ${className}`} {...props}>
      {children}
    </div>
  );
}
