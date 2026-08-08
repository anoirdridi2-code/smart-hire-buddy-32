import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

export type VoiceGender = "female" | "male";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ---------------------------------- STT ---------------------------------- */

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const target = 16000;
  const merged = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const ratio = sampleRate / target;
  const length = Math.floor(merged.length / ratio);
  const samples = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const value = merged[Math.floor(i * ratio)] ?? 0;
    samples[i] = Math.max(-1, Math.min(1, value)) * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

export type Recorder = { stop: () => Promise<Blob> };

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(node);
  node.connect(ctx.destination);

  return {
    stop: async () => {
      stream.getTracks().forEach((t) => t.stop());
      node.disconnect();
      source.disconnect();
      const blob = encodeWav(chunks, ctx.sampleRate);
      await ctx.close();
      return blob;
    },
  };
}

export async function transcribe(blob: Blob): Promise<string> {
  if (blob.size < 2048) throw new Error("Enregistrement trop court, réessayez.");
  const form = new FormData();
  form.append("audio", blob, "recording.wav");
  const res = await fetch("/api/voice/transcribe", {
    method: "POST",
    headers: await authHeader(),
    body: form,
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Transcription impossible.");
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

/* ---------------------------------- TTS ---------------------------------- */

export async function speak(
  text: string,
  gender: VoiceGender,
  signal?: AbortSignal,
): Promise<void> {
  const ctx = new AudioContext({ sampleRate: 24000 });
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  let playhead = 0;
  let pending = new Uint8Array(0);
  const sources: AudioBufferSourceNode[] = [];

  const playChunk = (incoming: Uint8Array) => {
    const bytes = new Uint8Array(pending.length + incoming.length);
    bytes.set(pending);
    bytes.set(incoming, pending.length);
    const usable = bytes.length - (bytes.length % 2);
    pending = bytes.slice(usable);
    if (usable === 0) return;
    const samples = new Int16Array(bytes.buffer, 0, usable / 2);
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    playhead = playhead === 0 ? ctx.currentTime + 0.05 : Math.max(playhead, ctx.currentTime);
    source.start(playhead);
    playhead += buffer.duration;
    sources.push(source);
  };

  const cleanup = () => {
    sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    void ctx.close().catch(() => {});
  };

  signal?.addEventListener("abort", cleanup, { once: true });

  try {
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ text, gender }),
      signal: signal ?? null,
    });
    if (!res.ok || !res.body) {
      throw new Error((await res.text().catch(() => "")) || "Synthèse vocale indisponible.");
    }

    const parser = createParser({
      onEvent(event) {
        let payload: { type?: string; audio?: string };
        try {
          payload = JSON.parse(event.data) as { type?: string; audio?: string };
        } catch {
          return;
        }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;
        const binary = atob(payload.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        playChunk(bytes);
      },
    });

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }

    const remaining = Math.max(0, playhead - ctx.currentTime);
    await new Promise((resolve) => setTimeout(resolve, remaining * 1000 + 150));
  } finally {
    cleanup();
  }
}
