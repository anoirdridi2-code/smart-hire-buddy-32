const OLLAMA_URL = "https://ollama.com/api/chat";
const OLLAMA_MODEL = "gpt-oss:120b";

export type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

let disabledUntil = 0;

export function ollamaEnabled(): boolean {
  return Boolean(process.env["OLLAMA_API_KEY"]) && Date.now() > disabledUntil;
}

/**
 * Tries Ollama Cloud (free models). Returns null on any failure so the
 * caller can fall back to the default engine.
 */
export async function ollamaChat(
  messages: OllamaMessage[],
  json: boolean,
): Promise<string | null> {
  const key = process.env["OLLAMA_API_KEY"];
  if (!key || Date.now() < disabledUntil) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        ...(json ? { format: "json" } : {}),
        messages,
      }),
    }).finally(() => clearTimeout(timer));

    if (res.status === 401 || res.status === 403) {
      // Bad key: stop hammering it for 10 minutes.
      disabledUntil = Date.now() + 10 * 60 * 1000;
      console.error("Ollama unauthorized — falling back to default AI engine.");
      return null;
    }
    if (!res.ok) {
      console.error("Ollama error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content?.trim();
    return content ? content : null;
  } catch (e) {
    console.error("Ollama request failed", e);
    return null;
  }
}
