import { ArrowRight, MoreHorizontal } from "lucide-react";

const columns = [
  { title: "New Applicants", count: 8, items: [["Sonia Ben Ali", "Automaticien", "95% AI Fit"], ["Karim Mansour", "Maintenance Technician", "91% AI Fit"]] },
  { title: "Interview Phase", count: 4, items: [["Nour Trabelsi", "Electrical Engineer", "93% AI Fit"], ["Yassine Gharbi", "Automation Engineer", "89% AI Fit"]] },
  { title: "Shortlisted", count: 2, items: [["Amira Jlassi", "Industrial Engineer", "97% AI Fit"], ["Walid Saidi", "PLC Technician", "94% AI Fit"]] },
] as const;

export function RecruiterPipeline() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-indigo-600">Recruiter workspace</p><h2 className="text-xl font-bold text-slate-950">Candidate Pipeline</h2></div>
        <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="More options"><MoreHorizontal className="h-5 w-5" /></button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className="rounded-2xl bg-slate-100/80 p-3">
            <div className="mb-3 flex items-center justify-between px-1"><h3 className="text-sm font-bold text-slate-800">{column.title}</h3><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{column.count}</span></div>
            <div className="space-y-3">
              {column.items.map(([name, profession, fit]) => (
                <article key={name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{name}</p><p className="mt-1 text-xs text-slate-500">{profession}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{fit}</span></div>
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">Review candidate <ArrowRight className="h-3.5 w-3.5" /></button>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
