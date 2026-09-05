import { ollamaChat, ollamaEnabled, type OllamaMessage } from "./ollama.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } };

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
};

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError(500, "Service IA non configuré.");
  return key;
}

async function request(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) {
      throw new AiError(429, "Trop de requêtes IA. Réessayez dans un instant.");
    }
    if (res.status === 402) {
      throw new AiError(402, "Crédits IA épuisés. Ajoutez des crédits pour continuer.");
    }
    console.error("AI gateway error", res.status, text);
    throw new AiError(res.status, "L'analyse IA a échoué. Réessayez.");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function aiText(messages: AiMessage[]): Promise<string> {
  return request({ messages });
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) return candidate;
  const opening = candidate[start];
  const closing = opening === "{" ? "}" : "]";
  const end = candidate.lastIndexOf(closing);
  return end > start ? candidate.slice(start, end + 1) : candidate.slice(start);
}

export async function aiJson<T>(messages: AiMessage[]): Promise<T> {
  const raw = await request({
    messages,
    response_format: { type: "json_object" },
  });
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch {
    console.error("AI JSON parse failed", raw.slice(0, 800));
    throw new AiError(502, "Réponse IA illisible. Réessayez.");
  }
}
