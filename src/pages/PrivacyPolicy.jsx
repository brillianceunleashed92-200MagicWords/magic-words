import PolicyPage from './PolicyPage';

// Draft content grounded in what the code actually does — see
// docs/COPPA_DATA_INVENTORY.md for the full, verified data-flow audit
// this summary is drawn from. Still needs a real legal review pass.
export default function PrivacyPolicy() {
  return (
    <PolicyPage title="Privacy Policy">
      <p>
        200 Magic Words is a literacy app for children, used by a parent or guardian
        on their child's behalf. This page summarizes what data we collect and why —
        see our full data inventory for the verified technical detail.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>What we collect</h3>
      <p>
        A child's first name, an avatar choice, up to three interest categories from
        a fixed list, and their word-learning progress. A parent's email and
        password (handled by our authentication provider, never stored by us in
        plain text). If a family upgrades to a paid plan, payment is processed by
        Stripe — we never see or store card details.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>What we don't collect</h3>
      <p>
        We do not collect a child's email, phone number, precise location, or camera
        access. We do not use third-party advertising or analytics trackers. Speech
        used in our "Say It with Nova" activity is processed by your browser and
        compared against the target word in the moment — the audio and transcript
        are never sent to us or stored anywhere.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>Third parties</h3>
      <p>
        We use Anthropic (Claude) to generate personalized stories and lesson
        content, ElevenLabs for word pronunciation audio, Stripe for payments, and
        Supabase and Vercel to host and store data. Each only receives the minimum
        data needed for its purpose.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>Deleting your data</h3>
      <p>
        A parent can permanently delete their account and all associated child data
        at any time from Settings → Delete account & all data. This removes every
        child profile, all progress, and stories immediately.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>Contact</h3>
      <p>Questions about this policy can be sent to the app's support contact.</p>
    </PolicyPage>
  );
}
