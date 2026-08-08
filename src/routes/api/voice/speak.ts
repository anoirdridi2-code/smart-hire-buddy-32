import { createFileRoute } from "@tanstack/react-router";
import { gatewayKey, userIdFromRequest } from "@/lib/voice.server";

const VOICES = { female: "shimmer", male: "onyx" } as const;

type Body = { text?: unknown; gender?: unknown };

export const Route = createFileRoute("/api/voice/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await userIdFromRequest(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as Body;
        const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
        if (!text) return new Response("Texte manquant", { status: 400 });
        const gender = body.gender === "male" ? "male" : "female";

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gatewayKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: VOICES[gender],
            instructions: "Parle en français, d'une voix naturelle, chaleureuse et professionnelle.",
            stream_format: "sse",
            response_format: "pcm",
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("TTS failed", upstream.status, detail);
          return new Response("Synthèse vocale indisponible", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
