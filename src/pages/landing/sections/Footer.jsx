import { Link } from "react-router-dom";

// LEGAL_PAGES_R1 Phase 2 — persistent links to the three published
// policies, required on the public landing page per the doc's "Footer
// (or equivalent persistent element)" instruction. No footer existed
// before this on the landing page.
export default function Footer() {
  return (
    <footer className="relative px-6 py-8 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-sm text-dawn-indigo/60">
        <Link to="/privacy" className="hover:text-dawn-indigo">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-dawn-indigo">Terms of Service</Link>
        <Link to="/refunds" className="hover:text-dawn-indigo">Refund Policy</Link>
      </div>
    </footer>
  );
}
