## `ai-helper` Edge Function

Accepts a `word` and a child's `mastery` score (0–100), calls Anthropic, and returns:

- A multiple-choice quiz question with **4 emoji options**
- Which word to practice next (based on mastery)
- A one-sentence encouragement message

### Request

`POST /functions/v1/ai-helper`

```json
{ "word": "run", "mastery": 35 }
```

### Response

```json
{
  "quiz": {
    "question": "Which picture shows \"run\"?",
    "options": ["🏃", "🛌", "🍎", "🚗"],
    "correctIndex": 0
  },
  "nextWord": "run",
  "encouragement": "Great trying—let’s practice \"run\" one more time!"
}
```

### Environment variables (Supabase Function secrets)

- `ANTHROPIC_API_KEY`: required
- `ANTHROPIC_MODEL`: optional (defaults to `claude-sonnet-4-6`)

