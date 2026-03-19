function safeWord(input) {
  const w = typeof input === "string" ? input.trim() : "";
  return w.replace(/[^a-zA-Z'\-\s]/g, "").slice(0, 40).trim();
}

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.round(n) : min;
  return Math.max(min, Math.min(max, x));
}

const ACTION_WORDS = new Set([
  "jump","run","fly","eat","swim","climb","sleep","walk","sit","stand",
  "fall","spin","hop","skip","throw","catch","kick","wave","clap","dance",
  "sing","read","write","draw","play","help","look","see","go","come",
  "do","make","give","take","find","put","get","say","tell","ask",
]);

module.exports = async function handler(req, res) {
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

  const isAction = ACTION_WORDS.has(word.toLowerCase());
  const wordType = isAction ? "ACTION word (verb)" : "OBJECT or DESCRIBING word (noun or adjective)";

  const quizInstruction = isAction
    ? `Ask "Which picture shows something ${word}ing?" and pick 4 emojis where exactly ONE clearly shows the action of ${word}ing. Example for "jump": options could be 🦘🏊🍎🐢 where 🦘 is correct (correctIndex 0).`
    : `Ask "Which picture shows a ${word}?" and pick 4 emojis where exactly ONE clearly matches the word "${word}". Example for "cat": options could be 🐱🐶🐦🐸 where 🐱 is correct (correctIndex 0).`;

  try {
    const { Anthropic } = require("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: "You create short, kid-friendly literacy practice. Output MUST be valid JSON only — no markdown, no backticks, no explanation.",
      messages: [
        {
          role: "user",
          content: `A child (age 4-8) is practicing the word "${word}". It is an ${wordType}. Mastery: ${mastery}%.

${quizInstruction}

Rules:
- The correct emoji must CLEARLY and OBVIOUSLY match the word with no ambiguity
- The 3 wrong emojis must be clearly different (not confusable with the answer)
- correctIndex must be 0, 1, 2, or 3 pointing to the correct emoji in options array
- For nextWord: if mastery < 40 use same word; if 40-79 use a closely related simple word; if 80+ use a slightly harder word
- encouragement must be one short cheerful sentence addressed directly to the child

Return ONLY this JSON with no extra text:
{"quiz":{"question":"...","options":["emoji1","emoji2","emoji3","emoji4"],"correctIndex":0},"nextWord":"...","encouragement":"..."}`,
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
};
