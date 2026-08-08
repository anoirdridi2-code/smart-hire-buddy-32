import { createFileRoute } from "@tanstack/react-router";
import { gatewayKey, userIdFromRequest } from "@/lib/voice.server";

const MAX_BYTES = 20 * 1024 * 1024;

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await userIdFromRequest(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const form = await request.formData();
        const audio = form.get("audio");
        if (!(audio instanceof File) || audio.size < 2048) {
          return new Response("Enregistrement vide ou invalide", { status: 400 });
        }
        if (audio.size > MAX_BYTES) {
          return new Response("Enregistrement trop long", { status: 413 });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", audio, "recording.wav");
        upstream.append("language", "fr");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${gatewayKey()}` },
          body: upstream,
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          console.error("STT failed", res.status, detail);
          return new Response("Transcription impossible", { status: res.status });
        }

        const data = (await res.json()) as { text?: string };
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});
