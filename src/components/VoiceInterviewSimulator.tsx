import { Mic, Send, Square } from "lucide-react";
import { useState } from "react";

export function VoiceInterviewSimulator() {
  const [recording, setRecording] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">Voice Interview Simulator</h2>
        <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> REC · Live AI Simulation
        </div>
      </div>
      <div className="flex flex-col items-center py-8">
        <div className="relative mb-6">
          <div className={`absolute inset-0 rounded-full bg-indigo-200/60 blur-2xl ${recording ? "animate-pulse" : ""}`} />
          <button type="button" onClick={() => setRecording((v) => !v)} aria-label={recording ? "Stop recording" : "Start recording"} className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200 transition-transform hover:scale-105">
            {recording ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-9 w-9" />}
          </button>
        </div>
        <div className="flex h-12 items-center gap-1.5" aria-label="Audio visualizer">
          {[18, 32, 46, 28, 38].map((height, i) => <span key={i} className={`w-1.5 rounded-full bg-gradient-to-t from-indigo-600 to-violet-500 ${recording ? "animate-pulse" : ""}`} style={{ height }} />)}
        </div>
        <p className="mt-4 text-sm text-slate-500">{recording ? "Listening to your answer…" : "Tap the microphone to answer"}</p>
      </div>
      <div className="space-y-3">
        <textarea rows={4} placeholder="Your answer will appear here…" className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" />
        <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto">
          <Send className="h-4 w-4" /> Submit Voice Answer
        </button>
      </div>
    </section>
  );
}
