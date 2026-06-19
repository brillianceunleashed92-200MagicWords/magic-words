import { Link } from "react-router-dom";

// Phase 1 scaffold: confirms the route + token system work end to end.
// The cinematic scroll/hero build happens in Phase 3.
export default function Landing() {
  return (
    <main className="min-h-screen bg-dawn-indigo text-cloud flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight">
        200 Magic Words
      </h1>
      <p className="font-body text-lg text-cloud/80 max-w-md">
        Every great reader starts with a few magic words.
      </p>
      <Link
        to="/app"
        className="font-body font-bold px-6 py-3 rounded-2xl bg-sunrise-coral text-dawn-indigo hover:bg-marigold transition-colors"
      >
        Open the app
      </Link>
    </main>
  );
}
