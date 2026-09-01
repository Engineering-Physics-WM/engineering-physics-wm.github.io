type RewriteRequest = {
  cohortYear?: string;
  audienceLabel?: string;
  projectLabel?: string | null;
  recipientCounts?: { students?: number; mentors?: number };
  subject?: string;
  body?: string;
};

type RewriteResult = { subject: string; body: string };

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-5",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.5-flash",
};

const requiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

const cleanModelName = (model: string) => model.replace(/^models\//, "");
const normalizeDraft = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const providerName = () => {
  const configured = process.env.AI_EMAIL_PROVIDER?.trim().toLowerCase();
  if (configured) return configured === "claude" ? "anthropic" : configured;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error("Set AI_EMAIL_PROVIDER and the matching provider API key.");
};

const modelName = (provider: string) =>
  process.env.AI_EMAIL_MODEL ||
  process.env[`${provider.toUpperCase()}_MODEL`] ||
  DEFAULT_MODELS[provider];

const maxOutputTokens = () => {
  const raw = Number(process.env.AI_EMAIL_MAX_OUTPUT_TOKENS || 2400);
  return Number.isFinite(raw) ? Math.max(500, Math.min(4096, raw)) : 2400;
};

const parseRewriteJson = (text: string): RewriteResult => {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonText = withoutFence.match(/\{[\s\S]*\}/)?.[0] || withoutFence;
  let parsed: { subject?: unknown; body?: unknown };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI returned malformed JSON. Please try Rewrite with AI again.");
  }
  const subject = normalizeDraft(parsed.subject);
  const body = normalizeDraft(parsed.body);
  if (!subject || !body) throw new Error("AI response did not include a subject and body.");
  return { subject, body };
};

const buildPrompt = (request: RewriteRequest) => {
  const studentCount = request.recipientCounts?.students ?? 0;
  const mentorCount = request.recipientCounts?.mentors ?? 0;
  return [
    "Return only valid JSON with exactly these keys: subject, body.",
    "Rewrite the current email draft for clarity, warmth, and concision.",
    "Keep all factual details, dates, times, links, course logistics, names, and constraints unchanged.",
    "Do not invent attachments, deadlines, promises, policies, or team assignments.",
    "Use plain-text email formatting. No Markdown.",
    "",
    `Cohort: ${request.cohortYear || "Engineering Physics Capstone"}`,
    `Audience: ${request.audienceLabel || "Selected recipients"}`,
    request.projectLabel ? `Project/team context: ${request.projectLabel}` : "",
    `Recipient counts: ${studentCount} student(s), ${mentorCount} mentor(s)`,
    "",
    "Current subject:",
    request.subject || "(none)",
    "",
    "Current body:",
    request.body || "(none)",
  ]
    .filter(Boolean)
    .join("\n");
};

const instructions =
  "You help Prof. Ran Yang write Engineering Physics Capstone course-administration email drafts. Your job is editing only: preserve meaning, facts, dates, links, and audience. Keep the tone clear, warm, direct, and not hype-heavy.";

const rewriteWithOpenAi = async (prompt: string, model: string) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input: prompt,
      max_output_tokens: maxOutputTokens(),
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "OpenAI rewrite failed.");
  const text =
    payload.output_text ||
    (payload.output || [])
      .flatMap(
        (item: { content?: Array<{ text?: string; output_text?: string }> }) => item.content || []
      )
      .map((part: { text?: string; output_text?: string }) => part.text || part.output_text || "")
      .join("");
  return parseRewriteJson(text);
};

const rewriteWithAnthropic = async (prompt: string, model: string) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": requiredEnv("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: instructions,
      max_tokens: maxOutputTokens(),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Claude rewrite failed.");
  return parseRewriteJson(
    (payload.content || [])
      .filter((part: { type?: string }) => part.type === "text")
      .map((part: { text?: string }) => part.text || "")
      .join("")
  );
};

const rewriteWithGemini = async (prompt: string, model: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": requiredEnv("GEMINI_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxOutputTokens(),
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { subject: { type: "STRING" }, body: { type: "STRING" } },
            required: ["subject", "body"],
            propertyOrdering: ["subject", "body"],
          },
        },
      }),
    }
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Gemini rewrite failed.");
  return parseRewriteJson(
    (payload.candidates?.[0]?.content?.parts || [])
      .map((part: { text?: string }) => part.text || "")
      .join("")
  );
};

export const rewriteEmail = async (request: RewriteRequest) => {
  const subject = normalizeDraft(request.subject);
  const body = normalizeDraft(request.body);
  if (!subject && !body) throw new Error("Draft is empty.");
  if (subject.length + body.length > 9000)
    throw new Error("Draft is too long for the rewrite helper.");

  const provider = providerName();
  const model = modelName(provider);
  const prompt = buildPrompt({ ...request, subject, body });
  const rewritten =
    provider === "openai"
      ? await rewriteWithOpenAi(prompt, model)
      : provider === "anthropic"
        ? await rewriteWithAnthropic(prompt, model)
        : provider === "gemini"
          ? await rewriteWithGemini(prompt, model)
          : (() => {
              throw new Error(`Unsupported AI_EMAIL_PROVIDER: ${provider}.`);
            })();
  return { ...rewritten, provider, model };
};
