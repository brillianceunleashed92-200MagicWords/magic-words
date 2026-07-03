import PolicyPage from './PolicyPage';

export default function TermsOfService() {
  return (
    <PolicyPage title="Terms of Service">
      <p>
        200 Magic Words is provided by and for use by a parent or guardian on
        behalf of their child. By creating an account, you confirm you are the
        parent or guardian of any child profile you add.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>Accounts</h3>
      <p>
        You're responsible for keeping your account credentials secure. One account
        may have multiple child profiles, subject to your plan's limits.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>Subscriptions</h3>
      <p>
        Paid plans are billed through Stripe on a monthly or annual basis and can be
        managed or canceled at any time from Settings.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>Acceptable use</h3>
      <p>
        This app is intended for personal, non-commercial use by families. Automated
        or abusive use of the service (including excessive API calls) is not
        permitted.
      </p>
      <h3 style={{ color: '#4ECDC4', marginTop: 20 }}>Changes</h3>
      <p>
        We may update these terms from time to time; continued use of the app after
        a change constitutes acceptance of the updated terms.
      </p>
    </PolicyPage>
  );
}
