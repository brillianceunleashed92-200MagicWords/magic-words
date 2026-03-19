/* global module, process, require */

module.exports = async function handler(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY
      ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + "..."
      : "NOT SET",
    supabaseUrlPresent: !!process.env.VITE_SUPABASE_URL,
    nodeVersion: process.version,
  };

  // Optionally test the Anthropic connection
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { Anthropic } = require("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say OK" }],
      });
      checks.anthropicConnection = "✅ SUCCESS";
    } catch (err) {
      checks.anthropicConnection = "❌ FAILED: " + (err?.message || String(err));
    }
  } else {
    checks.anthropicConnection = "⚠️ SKIPPED (no key)";
  }

  res.status(200).json(checks);
};

