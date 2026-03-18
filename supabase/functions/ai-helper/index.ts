// Supabase Edge Function: ai-helper
// Deno runtime (Supabase Functions)

type AiHelperRequest = {
  word: string;
  mastery: number;
};

type AiHelperResponse = {
  quiz: {
    question: string;
    options: string[]; // 4 emoji strings
    correctIndex: number; // 0..3
  };
  nextWord: string;
  encouragement: string;
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function getCorsHeaders(req: Request): Record<string, string> {
  // Allow any origin by reflecting the request Origin when present.
  // This is more compatible than "*" when browsers send Authorization headers.
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "vary": "Origin",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
  };
}

function clampInt(n: number, min: number, max: number) {
  const x = Number.isFinite(n) ? Math.round(n) : min;
  return Math.max(min, Math.min(max, x));
}

function safeWord(input: unknown) {
  const w = typeof input === "string" ? input.trim() : "";
  // Keep it simple and safe for prompting; allow letters, apostrophes, hyphens, spaces.
  return w.replace(/[^a-zA-Z'\-\s]/g, "").slice(0, 40).trim();
}

async function callAnthropic(params: {
  apiKey: string;
  model: string;
  word: string;
  mastery: number;
}): Promise<AiHelperResponse> {
  const { apiKey, model, word, mastery } = params;

  // We ask for strict JSON only (no markdown), and we also validate after.
  const system =
    "You create short, kid-friendly practice for early readers. Output MUST be valid JSON only (no markdown).";

  const user = {
    task: "Generate practice payload for a child.",
    constraints: {
      emojiOptions: 4,
      language: "simple English",
      encouragementMaxChars: 120,
      avoid: ["scary content", "medical/legal advice", "personal data requests"],
    },
    input: { word, mastery },
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
  };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      temperature: 0.6,
      system,
      messages: [{ role: "user", content: JSON.stringify(user) }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Anthropic error ${resp.status}: ${text.slice(0, 500)}`);
  }

  const data = await resp.json();
  const text: string =
    data?.content?.find?.((c: any) => c?.type === "text")?.text ??
    data?.content?.[0]?.text ??
    "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Model did not return valid JSON. Raw: ${text.slice(0, 500)}`);
  }

  // Minimal validation / normalization.
  const out = parsed as Partial<AiHelperResponse>;
  const question = typeof out.quiz?.question === "string" ? out.quiz.question.trim() : "";
  const options = Array.isArray(out.quiz?.options) ? out.quiz!.options!.map(String) : [];
  const correctIndex = typeof out.quiz?.correctIndex === "number" ? out.quiz.correctIndex : -1;
  const nextWord = typeof out.nextWord === "string" ? out.nextWord.trim() : "";
  const encouragement = typeof out.encouragement === "string" ? out.encouragement.trim() : "";

  if (!question) throw new Error("Invalid output: quiz.question missing");
  if (options.length !== 4) throw new Error("Invalid output: quiz.options must be 4 items");
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error("Invalid output: quiz.correctIndex must be 0..3");
  }
  if (!nextWord) throw new Error("Invalid output: nextWord missing");
  if (!encouragement) throw new Error("Invalid output: encouragement missing");

  return {
    quiz: { question, options, correctIndex },
    nextWord,
    encouragement,
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return json({ error: "Use POST" }, 405, corsHeaders);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

  if (!apiKey) {
    return json(
      { error: "Missing ANTHROPIC_API_KEY env var for this function." },
      500,
      corsHeaders,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { word: rawWord, mastery: rawMastery } = (body ?? {}) as Partial<AiHelperRequest>;
  const word = safeWord(rawWord);
  const mastery = clampInt(typeof rawMastery === "number" ? rawMastery : Number(rawMastery), 0, 100);

  if (!word) return json({ error: "Missing/invalid 'word' (text)" }, 400, corsHeaders);

  try {
    const result = await callAnthropic({ apiKey, model, word, mastery });
    return json(result, 200, corsHeaders);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return json({ error: "Failed to generate AI helper response." }, 500, corsHeaders);
  }
});

