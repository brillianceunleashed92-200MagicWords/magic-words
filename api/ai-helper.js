/* global module, process */

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.round(n) : min;
  return Math.max(min, Math.min(max, x));
}

function safeWord(input) {
  const w = typeof input === "string" ? input.trim() : "";
  return w.replace(/[^a-zA-Z'\-\s]/g, "").slice(0, 40).trim();
}

function setCors(res, req) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
}

module.exports = async (req, res) => {
  setCors(res, req);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });
  }

  const word = safeWord(req.body?.word);
  const mastery = clampInt(Number(req.body?.mastery), 0, 100);
  if (!word) {
    return res.status(400).json({ error: "Missing/invalid 'word' (text)" });
  }

  const payload = { word, mastery };

  try {
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        temperature: 0.6,
        system:
          "You create short, kid-friendly practice for early readers. Output MUST be valid JSON only (no markdown).",
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              task: "Generate practice payload for a child.",
              constraints: {
                emojiOptions: 4,
                language: "simple English",
                encouragementMaxChars: 120,
                avoid: ["scary content", "medical/legal advice", "personal data requests"],
              },
              input: payload,
              output_schema: {
                quiz: { question: "string", options: ["emoji", "emoji", "emoji", "emoji"], correctIndex: 0 },
                nextWord: "string",
                encouragement: "string",
              },
              guidance: [
                "Quiz should test the meaning of the input word using 4 emoji options.",
                "Make the correct option clearly match the word.",
                "Set correctIndex to the index of the correct emoji in options.",
                "Pick nextWord based on mastery: if mastery < 40 -> repeat same word; 40-79 -> suggest a closely-related simple word; >=80 -> suggest a slightly harder but still kid-appropriate word.",
                "Encouragement should be a single sentence addressed to the child.",
              ],
            }),
          },
        ],
      }),
    });

    if (!anthropicResp.ok) {
      const text = await anthropicResp.text().catch(() => "");
      console.error("Anthropic API error", { status: anthropicResp.status, text, payload });
      return res.status(502).json({ error: "Anthropic API error" });
    }

    const raw = await anthropicResp.json();
    const text =
      raw?.content?.find?.((c) => c?.type === "text")?.text ??
      raw?.content?.[0]?.text ??
      "";

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Anthropic returned non-JSON text", { text, raw, payload, error: e });
      return res.status(502).json({ error: "Invalid model response" });
    }

    // Minimal validation
    const quiz = data?.quiz ?? {};
    if (
      typeof quiz?.question !== "string" ||
      !Array.isArray(quiz?.options) ||
      quiz.options.length !== 4 ||
      !Number.isInteger(quiz?.correctIndex) ||
      quiz.correctIndex < 0 ||
      quiz.correctIndex > 3 ||
      typeof data?.nextWord !== "string" ||
      typeof data?.encouragement !== "string"
    ) {
      console.error("Invalid AI payload shape", { data });
      return res.status(502).json({ error: "Invalid AI payload shape" });
    }

    return res.status(200).json({
      quiz: {
        question: String(quiz.question).trim(),
        options: quiz.options.map(String).slice(0, 4),
        correctIndex: Number(quiz.correctIndex),
      },
      nextWord: String(data.nextWord).trim(),
      encouragement: String(data.encouragement).trim(),
    });
  } catch (e) {
    console.error("ai-helper proxy failed", { payload, error: e });
    return res.status(500).json({ error: "Failed to generate AI helper response" });
  }
};

