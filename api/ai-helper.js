/* global module, process, require */

const { Anthropic } = require("@anthropic-ai/sdk");

function safeWord(input) {
  const w = typeof input === "string" ? input.trim() : "";
  return w.replace(/[^a-zA-Z'\-\s]/g, "").slice(0, 40).trim();
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CHECK 1: Is the API key present?
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("MISSING ENV VAR: ANTHROPIC_API_KEY is not set in Vercel");
    return res.status(500).json({
      error: "Server configuration error",
      detail:
        "ANTHROPIC_API_KEY is missing from Vercel environment variables. Go to Vercel → Settings → Environment Variables and add it.",
      code: "MISSING_API_KEY",
    });
  }

  // CHECK 2: Did we receive valid input?
  const { word: rawWord, mastery: rawMastery } = req.body || {};
  const word = safeWord(rawWord);
  const mastery = Number(rawMastery);

  if (!word) {
    return res.status(400).json({
      error: "Bad request",
      detail: "No word was sent in the request body.",
      code: "MISSING_WORD",
    });
  }

  if (!Number.isFinite(mastery)) {
    return res.status(400).json({
      error: "Bad request",
      detail: "No mastery (number) was sent in the request body.",
      code: "INVALID_MASTERY",
    });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are a friendly literacy tutor for children ages 4-8.
The child is practicing the word "${word}". Their current mastery is ${mastery}%.

Respond ONLY with valid JSON in this exact format:
{
  "quiz": {
    "question": "a simple question about the word",
    "options": ["🐱", "🐶", "🐸", "🐦"],
    "correctIndex": 0
  },
  "nextWord": "suggested next word to practice",
  "encouragement": "one short encouraging sentence for the child"
}`,
        },
      ],
    });

    const content0 = message?.content?.[0];
    const raw =
      content0?.type === "text"
        ? String(content0.text ?? "")
        : typeof content0?.text === "string"
          ? content0.text
          : "";

    // CHECK 3: Did Claude return valid JSON?
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Claude returned non-JSON:", raw);
      return res.status(500).json({
        error: "AI response parsing error",
        detail: "Claude returned a response that wasn't valid JSON. Raw response: " + raw,
        code: "INVALID_AI_RESPONSE",
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    // CHECK 4: Anthropic API errors (wrong key, rate limit, etc.)
    console.error("Anthropic API error:", err);

    const status = err?.status ?? err?.statusCode ?? err?.response?.status;

    if (status === 401) {
      return res.status(500).json({
        error: "Invalid API key",
        detail:
          "The ANTHROPIC_API_KEY in Vercel is set but is invalid or expired. Check it at console.anthropic.com.",
        code: "INVALID_API_KEY",
      });
    }

    if (status === 429) {
      return res.status(500).json({
        error: "Rate limit hit",
        detail: "Too many requests to the Anthropic API. Wait a moment and try again.",
        code: "RATE_LIMIT",
      });
    }

    return res.status(500).json({
      error: "Anthropic API call failed",
      detail: err?.message || "Unknown error",
      code: "API_ERROR",
    });
  }
};

