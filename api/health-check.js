// api/health-check.js
// Security hardening: this used to return real environment configuration
// details publicly — anthropicKeyPresent, the first 10 characters of the
// actual ANTHROPIC_API_KEY value, supabaseUrlPresent, and even made a
// live test call to Anthropic and reported the result. All of that is a
// reconnaissance gift for free: it told anyone exactly which integrations
// exist, whether keys are configured, and leaked a real key fragment.
// Reduced to the bare minimum a deployment-verification check needs.
module.exports = async function handler(req, res) {
  res.status(200).json({ status: 'ok' });
};
