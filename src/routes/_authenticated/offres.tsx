import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Filter, Globe2, Loader2, MapPin, Plus, Search, Send, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useJobs, useRefresh } from "@/lib/queries";
import { fetchLiveJobsFn, importJobFn } from "@/lib/career.functions";

type Job = NonNullable<ReturnType<typeof useJobs>["data"]>[number];

const PROFESSION_ALIASES: Record<string, string[]> = {
  automaticien: ["automaticien", "automatisme", "automation", "automation technician", "automation engineer", "plc", "sps", "scada", "controls", "automatisierungstechniker"],
  automatisme: ["automatisme", "automaticien", "automation", "automation technician", "automation engineer", "plc", "sps", "scada", "controls"],
  maintenance: ["maintenance", "technicien maintenance", "maintenance technician", "maintenance engineer", "instandhaltung", "wartung"],
  electrique: ["électrique", "electrique", "électricité", "electricite", "electrical", "electrician", "electrical engineer", "electrical technician", "elektro", "elektrotechnik"],
  electricite: ["électricité", "electricite", "electrical", "electrician", "electrical engineer", "electrical technician", "elektro", "elektrotechnik"],
  electromecanique: ["électromécanique", "electromecanique", "electromechanical", "electromechanical technician", "electromechanical engineer", "elektromechanik"],
  electrotechnique: ["électrotechnique", "electrotechnique", "electrotechnics", "electrical engineering", "electrical technician", "elektrotechnik"],
  instrumentation: ["instrumentation", "instrumentation technician", "instrumentation engineer", "messtechnik"],
  robotique: ["robotique", "robotics", "robotics technician", "robotics engineer"],
  energie: ["énergie", "energie", "energy engineer", "electrical energy", "photovoltaic", "solar", "renewable"],
  mecanique: ["mécanique", "mecanique", "mechanical", "mechanical technician", "mechanik", "maschinenbau"],
  serveur: ["serveur", "serveuse", "waiter", "waitress", "server", "restaurant server", "food service"],
  cuisinier: ["cuisinier", "cuisinière", "cook", "chef", "kitchen", "commis de cuisine"],
};

function normalizeSearch(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function professionTerms(query: string): string[] {
  const normalized = normalizeSearch(query);
  const terms = new Set<string>(normalized.split(/\s+/).filter((term) => term.length > 2));
  for (const [key, aliases] of Object.entries(PROFESSION_ALIASES)) {
    if (normalized.includes(key)) aliases.forEach((alias) => terms.add(normalizeSearch(alias)));
  }
  return [...terms];
}

function jobMatchesProfession(job: Job, query: string): boolean {
  const terms = professionTerms(query);
  if (terms.length === 0) return true;
  const title = normalizeSearch(String(job.title ?? ""));
  const description = normalizeSearch(String(job.description ?? ""));
  const searchableTitle = ` ${title} `;

  // The title is the authoritative signal. Description matches are only a fallback
  // when the title contains a concrete profession-family signal.
  if (terms.some((term) => searchableTitle.includes(` ${term} `) || searchableTitle.includes(term))) return true;

  const strongTerms = terms.filter((term) => term.length >= 5);
  const descriptionHits = strongTerms.filter((term) => description.includes(term)).length;
  return descriptionHits >= 2;
}

export const Route = createFileRoute("/_authenticated/offres")({
  head: () => ({
    meta: [
      { title: "Recherche mondiale d'emploi IA — Karriera" },
      { name: "description", content: "Décrivez le métier recherché et Karriera lance une recherche mondiale assistée par IA." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const [profession, setProfession] = useState("");
  const [lastSearch, setLastSearch] = useState("");
  const [location, setLocation] = useState("");
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data: jobs } = useJobs();
  const refresh = useRefresh();
  const fetchLive = useServerFn(fetchLiveJobsFn);
  const importJob = useServerFn(importJobFn);

  const searchJobs = useCallback(async () => {
    const query = profession.trim();
    if (query.length < 2) {
      toast.error("Écrivez d'abord le métier ou l'emploi recherché.");
      return;
    }

    setLoadingLive(true);
    setLastSearch(query);
    try {
      const res = await fetchLive({ data: { query } });
      await refresh(["jobs"]);
      toast.success(res.imported > 0 ? `${res.imported} nouvelles offres trouvées.` : "Recherche terminée : les offres sont à jour.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La recherche mondiale a échoué.");
    } finally {
      setLoadingLive(false);
    }
  }, [fetchLive, profession, refresh]);

  const visibleJobs = useMemo(() => {
    const source = jobs ?? [];
    if (!lastSearch) return [];
    const query = lastSearch.trim();
    return source.filter((job) => {
      const locationText = normalizeSearch(`${job.location ?? ""} ${job.country ?? ""}`);
      const locationMatch = !location.trim() || locationText.includes(normalizeSearch(location.trim()));
      return locationMatch && jobMatchesProfession(job, query);
    });
  }, [jobs, lastSearch, location]);

  async function handleImport() {
    if (raw.trim().length < 40) {
      toast.error("Collez une annonce plus complète (40 caractères minimum).");
      return;
    }
    setImporting(true);
    try {
      await importJob({ data: { raw: raw.trim() } });
      setRaw("");
      setOpenImport(false);
      await refresh(["jobs"]);
      toast.success("Offre analysée et ajoutée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  async function apply(jobId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Session utilisateur introuvable.");
      return;
    }
    const { error } = await supabase.from("applications").insert({
      user_id: userData.user.id,
      job_id: jobId,
      cv_id: null,
      status: "applied",
    });
    if (error) {
      toast.error("Candidature déjà enregistrée ou erreur.");
      return;
    }
    refresh(["applications"]);
    toast.success("Candidature enregistrée.");
  }

  return (
    <AppShell title="Recherche d'emploi IA" description="Décrivez le métier que vous voulez. Karriera cherche pour vous dans le monde entier.">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-violet-100 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-indigo-100 blur-3xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
            <Sparkles className="size-3.5" /> AI GLOBAL JOB SEARCH
          </div>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">Quel métier cherchez-vous ?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Écrivez simplement votre métier. L’IA comprend les intitulés proches et lance une recherche internationale. Les offres réelles restent visibles directement dans Karriera avec leur source originale.
          </p>

          <div className="mt-7 flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-14 rounded-2xl border-slate-200 bg-white pl-12 pr-4 text-base text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:ring-indigo-500"
                placeholder="Ex. Automaticien, serveur, électricien industriel…"
                value={profession}
                onChange={(event) => setProfession(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void searchJobs(); }}
                maxLength={100}
              />
            </div>
            <Button className="h-14 rounded-2xl bg-indigo-600 px-7 text-white shadow-md hover:bg-indigo-700" onClick={() => void searchJobs()} disabled={loadingLive}>
              {loadingLive ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Globe2 className="mr-2 size-5" />}
              Rechercher dans le monde
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Automaticien", "Technicien maintenance", "Serveur", "Électricien industriel"].map((example) => (
              <button key={example} type="button" onClick={() => setProfession(example)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          {lastSearch ? <p className="text-sm font-semibold text-slate-900">Résultats pour « {lastSearch} » <span className="font-normal text-slate-500">· {visibleJobs.length} offre(s)</span></p> : <p className="text-sm text-slate-500">Lancez une recherche pour afficher les offres.</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setShowFilters((value) => !value)}><Filter className="mr-2 size-4" />Filtres</Button>
          <Dialog open={openImport} onOpenChange={setOpenImport}>
            <DialogTrigger asChild><Button variant="outline" className="rounded-xl border-slate-200"><Plus className="mr-2 size-4" />Ajouter une offre</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Importer une annonce</DialogTitle></DialogHeader><Textarea rows={10} placeholder="Collez le texte de l'annonce…" value={raw} onChange={(event) => setRaw(event.target.value)} maxLength={30000} /><Button onClick={handleImport} disabled={importing}>{importing && <Loader2 className="mr-2 size-4 animate-spin" />}Analyser et ajouter</Button></DialogContent>
          </Dialog>
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <MapPin className="size-4 text-slate-400" />
          <Input className="h-10 w-64 rounded-xl" placeholder="Pays ou ville" value={location} onChange={(event) => setLocation(event.target.value)} />
          {location && <Button size="sm" variant="ghost" onClick={() => setLocation("")}><X className="mr-1 size-3" />Effacer</Button>}
          <span className="text-xs text-slate-500">Le pays ne change pas le métier recherché.</span>
        </div>
      )}

      {!lastSearch ? (
        <Card className="mt-6 rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="flex flex-col items-center py-16 text-center"><div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Globe2 className="size-7" /></div><h2 className="text-xl font-bold text-slate-950">Recherche mondiale assistée par IA</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">Votre CV n’est pas nécessaire pour commencer. Choisissez uniquement le métier qui vous intéresse et Karriera s’occupe de la recherche.</p></CardContent></Card>
      ) : visibleJobs.length === 0 ? (
        <Card className="mt-6 rounded-2xl border-dashed border-slate-300 bg-white shadow-sm"><CardContent className="flex flex-col items-center py-16 text-center"><Search className="mb-3 size-10 text-slate-300" /><h2 className="text-lg font-bold text-slate-950">Aucune offre affichée pour cette recherche</h2><p className="mt-2 max-w-md text-sm text-slate-500">Essayez un intitulé plus général ou une autre localisation. La recherche peut être relancée à tout moment.</p><Button className="mt-5 rounded-xl bg-indigo-600" onClick={() => void searchJobs()} disabled={loadingLive}>{loadingLive && <Loader2 className="mr-2 size-4 animate-spin" />}Relancer la recherche</Button></CardContent></Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleJobs.map((job) => <JobCard key={job.id} job={job} onOpen={() => setSelectedJob(job)} onApply={() => void apply(job.id)} />)}
        </div>
      )}

      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full overflow-y-auto border-slate-200 bg-white sm:max-w-xl">
          {selectedJob && <JobPreview job={selectedJob} onApply={() => void apply(selectedJob.id)} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function JobCard({ job, onOpen, onApply }: { job: Job; onOpen: () => void; onApply: () => void }) {
  return (
    <Card className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md" onClick={onOpen}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><CardTitle className="line-clamp-2 text-base leading-snug text-slate-950">{job.title}</CardTitle><p className="mt-1 truncate text-sm text-slate-500">{job.company}</p></div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">{String(job.company ?? "K").charAt(0).toUpperCase()}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600"><MapPin className="mr-1 size-3" />{job.location || job.country || "Monde"}</Badge>{job.contract_type && <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{job.contract_type}</Badge>}</div>
        {job.source && <span className="text-xs font-medium text-indigo-600">Source : {job.source}</span>}
        <p className="line-clamp-4 text-sm leading-6 text-slate-600">{job.description}</p>
        <div className="mt-auto flex gap-2 pt-2" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={onApply}><Send className="mr-1 size-3" />Postuler</Button>
          {job.url && <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><a href={job.url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir l'offre originale"><ExternalLink className="size-4" /></a></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function JobPreview({ job, onApply }: { job: Job; onApply: () => void }) {
  return (
    <>
      <SheetHeader><div className="mb-2 flex flex-wrap gap-2"><Badge className="bg-indigo-600">Offre trouvée par l’IA</Badge>{job.source && <Badge variant="outline">{job.source}</Badge>}</div><SheetTitle className="text-2xl text-slate-950">{job.title}</SheetTitle><p className="text-sm text-slate-500">{job.company} · {job.location || job.country || "Monde"}</p></SheetHeader>
      <div className="space-y-6 py-6">
        <div className="grid grid-cols-2 gap-3">{[["Contrat", job.contract_type], ["Niveau", job.level], ["Salaire", job.salary], ["Pays", job.country]].map(([label, value]) => value && <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>)}</div>
        <div><h3 className="mb-2 font-semibold text-slate-950">Description</h3><p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{job.description}</p></div>
        <div className="flex gap-2"><Button className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={onApply}><Send className="mr-2 size-4" />Enregistrer ma candidature</Button>{job.url && <Button asChild variant="outline" className="rounded-xl border-slate-200"><a href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-4" />Voir l'offre originale</a></Button>}</div>
      </div>
    </>
  );
}
