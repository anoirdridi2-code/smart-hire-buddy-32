import { useMemo, useState } from "react";
import { Check, Clock3, Lightbulb } from "lucide-react";

const options = [
  "Runs after paint; useLayoutEffect runs synchronously before paint",
  "They are identical except for naming",
  "useEffect blocks browser painting; useLayoutEffect never runs",
  "useLayoutEffect can only be used on the server",
];

export function SkillAssessment() {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const progress = 60;

  const status = useMemo(() => (submitted ? "Answer submitted" : "Question 3 of 5"), [submitted]);

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-indigo-600">AI Skill Assessment</p>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Frontend Developer Level II</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
          <Clock3 className="h-4 w-4 text-indigo-500" /> 08:42
        </div>
      </div>

      <div className="mb-7">
        <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
          <span>{status}</span><span>{progress}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
        <p className="mb-6 text-lg font-semibold leading-8 text-slate-950">
          What is the primary difference between <code className="rounded bg-white px-1.5 py-1 text-indigo-700 shadow-sm">useEffect</code> and <code className="rounded bg-white px-1.5 py-1 text-indigo-700 shadow-sm">useLayoutEffect</code> in React?
        </p>
        <div className="grid gap-3">
          {options.map((option, index) => {
            const isSelected = selected === index;
            return (
              <button key={option} type="button" onClick={() => setSelected(index)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-950 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:shadow-sm"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 text-slate-500"}`}>{isSelected ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + index)}</span>
                <span className="text-sm font-medium leading-6">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700">
          <Lightbulb className="h-4 w-4" /> Hint from AI Coach
        </button>
        <button type="button" disabled={selected === null} onClick={() => setSubmitted(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
          Submit Answer &amp; Next
        </button>
      </div>
    </section>
  );
}
