import Anthropic from "@anthropic-ai/sdk";

function safeWord(input) {
  const w = typeof input === "string" ? input.trim() : "";
  return w.replace(/[^a-zA-Z'\-\s]/g, "").slice(0, 40).trim();
}

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.round(n) : min;
  return Math.max(min, Math.min(max, x));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Server configuration error",
      detail: "ANTHROPIC_API_KEY is missing from Vercel environment variables.",
      code: "MISSING_API_KEY",
    });
  }

  const word = safeWord(req.body?.word);
  const mastery = clampInt(Number(req.body?.mastery), 0, 100);

  if (!word) {
    return res.status(400).json({
      error: "Bad request",
      detail: "No word was sent in the request body.",
      code: "MISSING_WORD",
    });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: "You create short, kid-friendly practice for early readers. Output MUST be valid JSON only — no markdown, no backticks, no explanation.",
      messages: [
        {
          role: "user",
          content: `The child is practicing the word "${word}". Mastery: ${mastery}%. Return ONLY this JSON: {"quiz":{"question":"simple question about the word","options":["emoji1","emoji2","emoji3","emoji4"],"correctIndex":0},"nextWord":"next word","encouragement":"one short sentence for the child"}`,
        },
      ],
    });

    const raw = message?.content?.[0]?.text ?? "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "AI response parsing error",
        detail: "Claude returned invalid JSON: " + raw,
        code: "INVALID_AI_RESPONSE",
      });
    }

    return res.status(200).json({
      quiz: {
        question: String(parsed.quiz.question).trim(),
        options: parsed.quiz.options.map(String).slice(0, 4),
        correctIndex: Number(parsed.quiz.correctIndex),
      },
      nextWord: String(parsed.nextWord).trim(),
      encouragement: String(parsed.encouragement).trim(),
    });

  } catch (err) {
    const status = err?.status ?? err?.statusCode;
    if (status === 401) {
      return res.status(500).json({ error: "Invalid API key", code: "INVALID_API_KEY" });
    }
    if (status === 429) {
      return res.status(500).json({ error: "Rate limit hit", code: "RATE_LIMIT" });
    }
    return res.status(500).json({
      error: "API call failed",
      detail: err?.message || "Unknown error",
      code: "API_ERROR",
    });
  }
