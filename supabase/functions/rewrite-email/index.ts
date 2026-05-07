const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-5",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.5-flash",
};

type RewriteRequest = {
  cohortYear?: string;
  audienceLabel?: string;
  projectLabel?: string | null;
  recipientCounts?: {
    students?: number;
    mentors?: number;
  };
  subject?: string;
  body?: string;
};

type RewriteResult = {
  subject: string;
  body: string;
};

const jsonResponse = (body: unknown, status = 200) => (
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  })
);

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

const cleanModelName = (model: string) => model.replace(/^models\//, "");

const providerName = () => {
  const configured = Deno.env.get("AI_EMAIL_PROVIDER")?.trim().toLowerCase();
  if (configured) return configured === "claude" ? "anthropic" : configured;
  if (Deno.env.get("OPENAI_API_KEY")) return "openai";
  if (Deno.env.get("ANTHROPIC_API_KEY")) return "anthropic";
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
  throw new Error("Set AI_EMAIL_PROVIDER and the matching provider API key.");
};

const modelName = (provider: string) => (
  Deno.env.get("AI_EMAIL_MODEL") ||
  Deno.env.get(`${provider.toUpperCase()}_MODEL`) ||
  DEFAULT_MODELS[provider]
);

const maxOutputTokens = () => {
  const raw = Number(Deno.env.get("AI_EMAIL_MAX_OUTPUT_TOKENS") || 1200);
  return Number.isFinite(raw) ? Math.max(300, Math.min(2000, raw)) : 1200;
};

const normalizeDraft = (value: unknown) => (
  typeof value === "string" ? value.trim() : ""
);

const parseRewriteJson = (text: string): RewriteResult => {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonText = withoutFence.match(/\{[\s\S]*\}/)?.[0] || withoutFence;
  const parsed = JSON.parse(jsonText);
  const subject = normalizeDraft(parsed.subject);
  const body = normalizeDraft(parsed.body);
  if (!subject || !body) throw new Error("AI response did not include a subject and body.");
  return { subject, body };
};

const outputTextFromOpenAi = (payload: any) => {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (payload.output || [])
    .flatMap((item: any) => item.content || [])
    .map((part: any) => part.text || part.output_text || "")
    .join("")
    .trim();
};

const buildPrompt = (request: RewriteRequest) => {
  const studentCount = request.recipientCounts?.students ?? 0;
  const mentorCount = request.recipientCounts?.mentors ?? 0;
  return [
    "Return only valid JSON with exactly these keys: subject, body.",
    "Rewrite the current email draft for clarity, warmth, and concision.",
    "Keep all factual details, dates, times, links, course logistics, names, and constraints unchanged.",
    "Do not invent attachments, deadlines, promises, policies, or team assignments.",
    "Use plain-text email formatting. No Markdown. No bullet nesting unless the original draft clearly needs a short list.",
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
  ].filter(Boolean).join("\n");
};

const instructions = [
  "You help Prof. Ran Yang write Engineering Physics Capstone course-administration email drafts.",
  "Your job is editing only: preserve meaning, facts, dates, links, and audience.",
  "Keep the tone clear, warm, direct, and not hype-heavy.",
].join(" ");

const rewriteWithOpenAi = async (prompt: string, model: string) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${requiredEnv("OPENAI_API_KEY")}`,
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
  return parseRewriteJson(outputTextFromOpenAi(payload));
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
  const text = (payload.content || [])
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join("")
    .trim();
  return parseRewriteJson(text);
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
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    }
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Gemini rewrite failed.");
  const text = (payload.candidates?.[0]?.content?.parts || [])
    .map((part: any) => part.text || "")
    .join("")
    .trim();
  return parseRewriteJson(text);
};

const assertInstructor = async (request: Request) => {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) throw new Error("Sign in before using AI rewrite.");

  const response = await fetch(`${requiredEnv("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      "Authorization": authHeader,
      "apikey": requiredEnv("SUPABASE_ANON_KEY"),
    },
  });
  if (!response.ok) throw new Error("Could not verify dashboard access.");

  const user = await response.json();
  const allowedEmails = (Deno.env.get("AI_EMAIL_ALLOWED_USERS") || "rxyan2@wm.edu")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedEmails.includes((user.email || "").toLowerCase())) {
    throw new Error("This account is not allowed to use AI rewrite.");
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return jsonResponse({ error: "POST required." }, 405);

  try {
    await assertInstructor(request);
    const payload = await request.json() as RewriteRequest;
    const subject = normalizeDraft(payload.subject);
    const body = normalizeDraft(payload.body);
    if (!subject && !body) return jsonResponse({ error: "Draft is empty." }, 400);
    if ((subject.length + body.length) > 9000) {
      return jsonResponse({ error: "Draft is too long for the rewrite helper." }, 400);
    }

    const provider = providerName();
    const model = modelName(provider);
    const prompt = buildPrompt({ ...payload, subject, body });
    const rewritten = provider === "openai"
      ? await rewriteWithOpenAi(prompt, model)
      : provider === "anthropic"
      ? await rewriteWithAnthropic(prompt, model)
      : provider === "gemini"
      ? await rewriteWithGemini(prompt, model)
      : (() => {
        throw new Error(`Unsupported AI_EMAIL_PROVIDER: ${provider}.`);
      })();

    return jsonResponse({ ...rewritten, provider, model });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "AI rewrite failed." }, 400);
  }
});
