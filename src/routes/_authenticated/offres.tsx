import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe2,
  Loader2,
  MapPin,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useCvs, useJobs, useMatches, useRefresh } from "@/lib/queries";
import { fetchLiveJobsFn, importJobFn, matchJobFn } from "@/lib/career.functions";
import { GlobalJobSearch } from "@/components/GlobalJobSearch";
import type { MatchResult } from "@/lib/types";

const MIN_RELEVANT_SCORE = 40;
const TARGET_ROLE_PATTERNS = [
  /automaticien/i,
  /automation/i,
  /automatisme/i,
  /plc/i,
  /programmable logic/i,
  /industrial maintenance/i,
  /maintenance industrielle/i,
  /maintenance technician/i,
  /technicien maintenance/i,
  /maintenance engineer/i,
  /ingénieur maintenance/i,
  /electrical engineer/i,
  /electrical technician/i,
  /electrotechnicien/i,
  /electrotechnique/i,
  /electromecani/i,
  /electromechan/i,
  /instrumentation/i,
  /control systems/i,
  /control engineer/i,
  /contrôle[- ]commande/i,
  /industrial engineer/i,
  /industrial automation/i,
  /robotics/i,
];
const EXCLUDED_ROLE_PATTERNS = [
  /software developer/i,
  /software engineer/i,
  /web developer/i,
  /frontend/i,
  /front[- ]end/i,
  /backend/i,
  /back[- ]end/i,
  /fullstack/i,
  /full[- ]stack/i,
  /devops/i,
  /cloud engineer/i,
  /data scientist/i,
  /data analyst/i,
  /machine learning/i,
  /marketing/i,
  /sales/i,
  /commercial/i,
  /recruit/i,
  /human resources/i,
  /ressources humaines/i,
  /designer/i,
];

type MatchLite = Pick<MatchResult, "score" | "breakdown" | "reasoning">;

type Job = NonNullable<ReturnType<typeof useJobs>["data"]>[number];

const BREAKDOWN_LABELS: Record<keyof MatchResult["breakdown"], string> = {
  role_match: "Métier",
  skills: "Compétences",
  experience: "Expérience",
  language: "Langues",
  education: "Éducation",
};

function isCompatibleJob(job: Job) {
  const title = String(job.title ?? "");
  const text = `${title} ${job.description ?? ""}`;
  if (EXCLUDED_ROLE_PATTERNS.some((pattern) => pattern.test(title))) return false;
  if (TARGET_ROLE_PATTERNS.some((pattern) => pattern.test(title))) return true;
  const coreHits = [
    /automation|automatisme|automaticien/i,
    /maintenance/i,
    /electrical|électrique|electrotechnique/i,
    /electromechan|électromécan/i,
    /instrumentation|control systems|contrôle[- ]commande/i,
    /plc|scada/i,
    /industrial|industriel/i,
  ].filter((pattern) => pattern.test(text)).length;
  return coreHits >= 2 && !/software|web|devops|data|marketing|sales/i.test(title);
}

export const Route = createFileRoute("/_authenticated/offres")({
  head: () => ({
    meta: [
      { title: "Offres d'emploi & matching IA — Karriera" },
      { name: "description", content: "Agrégateur intelligent d'offres avec filtrage métier et matching IA." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const [search, setSearch] = useState("");
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [matchingAll, setMatchingAll] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const autoLoaded = useRef(false);

  const { data: cvs } = useCvs();
  const cv = cvs?.[0] ?? null;
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches(cv?.id ?? null);
  const refresh = useRefresh();
  const importJob = useServerFn(importJobFn);
  const matchJob = useServerFn(matchJobFn);
  const fetchLive = useServerFn(fetchLiveJobsFn);

  const loadLiveJobs = useCallback(async (silent = false) => {
    setLoadingLive(true);
    try {
      const res = await fetchLive({ data: { query: search.trim() } });
      refresh(["jobs"]);
      if (!silent) toast.success(res.imported > 0 ? `${res.imported} offres compatibles ajoutées.` : "Les offres sont à jour.");
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Récupération impossible.");
    } finally {
      setLoadingLive(false);
    }
  }, [fetchLive, refresh, search]);

  const compatibleJobs = useMemo(() => (jobs ?? []).filter(isCompatibleJob), [jobs]);

  // Important: stale/incompatible Supabase jobs must not block the live-job fetch.
  useEffect(() => {
    if (autoLoaded.current || !jobs) return;
    if (compatibleJobs.length > 0) {
      autoLoaded.current = true;
      return;
    }
    autoLoaded.current = true;
    void loadLiveJobs(true);
  }, [jobs, compatibleJobs.length, loadLiveJobs]);

  const scoreByJob = useMemo(() => {
    const map = new Map<string, number>();
    (matches ?? []).forEach((m) => map.set(m.job_id as string, m.score as number));
    return map;
  }, [matches]);

  const matchByJob = useMemo(() => {
    const map = new Map<string, MatchLite>();
    (matches ?? []).forEach((m) => map.set(m.job_id as string, {
      score: m.score as number,
      breakdown: m.breakdown as MatchResult["breakdown"],
      reasoning: m.reasoning as string,
    }));
    return map;
  }, [matches]);

  const searched = useMemo(() => compatibleJobs.filter((j) => {
    const haystack = [j.title, j.company, j.location, j.country, j.contract_type].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase()) && (!locationFilter || haystack.includes(locationFilter.toLowerCase()));
  }), [compatibleJobs, search, locationFilter]);

  const relevantJobs = searched.filter((j) => (scoreByJob.get(j.id) ?? -1) >= MIN_RELEVANT_SCORE)
    .sort((a, b) => (scoreByJob.get(b.id) ?? 0) - (scoreByJob.get(a.id) ?? 0));
  const unevaluatedJobs = searched.filter((j) => !scoreByJob.has(j.id));
  const lessRelevantJobs = searched.filter((j) => scoreByJob.has(j.id) && (scoreByJob.get(j.id) ?? 0) < MIN_RELEVANT_SCORE);
  const visibleJobs = [...relevantJobs, ...unevaluatedJobs, ...lessRelevantJobs];

  async function handleImport() {
    if (raw.trim().length < 40) { toast.error("Collez une annonce plus complète (40 caractères minimum)."); return; }
    setImporting(true);
    try {
      await importJob({ data: { raw: raw.trim() } });
      setRaw(""); setOpenImport(false); refresh(["jobs"]); toast.success("Offre analysée et ajoutée.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Import impossible."); }
    finally { setImporting(false); }
  }

  async function runMatch(jobId: string) {
    if (!cv) { toast.error("Importez et analysez d'abord un CV."); return; }
    setBusyJob(jobId);
    try { await matchJob({ data: { cvId: cv.id, jobId } }); refresh(["matches"]); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Matching impossible."); }
    finally { setBusyJob(null); }
  }

  async function matchAll() {
    if (!cv) { toast.error("Importez et analysez d'abord un CV."); return; }
    setMatchingAll(true);
    try {
      for (const job of compatibleJobs.filter((j) => !scoreByJob.has(j.id)).slice(0, 8)) await matchJob({ data: { cvId: cv.id, jobId: job.id } });
      refresh(["matches"]); toast.success("Matching terminé sur les offres compatibles.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Matching impossible."); }
    finally { setMatchingAll(false); }
  }

  async function apply(jobId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast.error("Session utilisateur introuvable."); return; }
    const { error } = await supabase.from("applications").insert({ user_id: userData.user.id, job_id: jobId, cv_id: cv?.id ?? null, status: "applied" });
    if (error) { toast.error("Candidature déjà enregistrée ou erreur."); return; }
    refresh(["applications"]); toast.success("Candidature enregistrée.");
  }

  return (
    <AppShell title="Offres intelligentes" description="Un flux centré sur votre métier, pas sur des offres génériques.">
      <section className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-slate-950 px-5 py-8 shadow-2xl sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"><Sparkles className="size-4" /> Intelligent Job Hub</div>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">Trouvez les offres qui correspondent vraiment à votre métier.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">Filtrage professionnel + matching IA + offres live. Les anciennes offres incompatibles ne bloquent plus la récupération.</p>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="h-12 border-white/10 bg-white/10 pl-11 text-white placeholder:text-slate-400" placeholder="Automaticien, maintenance industrielle, PLC…" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={80} />
            </div>
            <Button className="h-12 bg-blue-600 hover:bg-blue-500" onClick={() => void loadLiveJobs()} disabled={loadingLive}>
              {loadingLive ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Globe2 className="mr-2 size-4" />}Actualiser les offres
            </Button>
            <Button variant="outline" className="h-12 border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setShowFilters((v) => !v)}><Filter className="mr-2 size-4" />Filtres</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">{compatibleJobs.length} offres compatibles</span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-cyan-300">{relevantJobs.length} matchées ≥ {MIN_RELEVANT_SCORE}%</span>
            {cv && <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-blue-300">CV actif</span>}
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {showFilters && <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
          <MapPin className="size-4 text-muted-foreground" />
          <Input className="h-9 w-56" placeholder="Ville / pays" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
          {locationFilter && <Button size="sm" variant="ghost" onClick={() => setLocationFilter("")}><X className="mr-1 size-3" />Effacer</Button>}
        </div>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={matchAll} disabled={matchingAll}>{matchingAll ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Matcher mon CV</Button>
          <GlobalJobSearch onImported={() => refresh(["jobs"])} />
          <Dialog open={openImport} onOpenChange={setOpenImport}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Ajouter une offre</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Importer une annonce</DialogTitle></DialogHeader><Textarea rows={10} placeholder="Collez le texte de l'annonce…" value={raw} onChange={(e) => setRaw(e.target.value)} maxLength={30000} /><Button onClick={handleImport} disabled={importing}>{importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Analyser et ajouter</Button></DialogContent>
          </Dialog>
        </div>
      </div>

      {visibleJobs.length === 0 ? (
        <Card className="mt-6 border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><CheckCircle2 className="mb-3 size-10 text-emerald-500" /><h2 className="text-lg font-semibold">Aucune offre compatible trouvée</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Le système peut relancer la recherche live sans être bloqué par les anciennes offres incompatibles.</p><Button className="mt-5" onClick={() => void loadLiveJobs()} disabled={loadingLive}>{loadingLive ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Globe2 className="mr-2 size-4" />}Lancer une recherche live</Button></CardContent></Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleJobs.map((job) => <JobCard key={job.id} job={job} match={matchByJob.get(job.id)} busy={busyJob === job.id} onOpen={() => setSelectedJob(job)} onMatch={() => void runMatch(job.id)} onApply={() => void apply(job.id)} />)}
        </div>
      )}

      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selectedJob && <JobPreview job={selectedJob} match={matchByJob.get(selectedJob.id)} busy={busyJob === selectedJob.id} onMatch={() => void runMatch(selectedJob.id)} onApply={() => void apply(selectedJob.id)} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function JobCard({ job, match, busy, onOpen, onMatch, onApply }: { job: Job; match?: MatchLite | undefined; busy: boolean; onOpen: () => void; onMatch: () => void; onApply: () => void }) {
  const score = match?.score;
  return (
    <Card className="group flex cursor-pointer flex-col overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-xl" onClick={onOpen}>
      <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base leading-snug">{job.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{job.company}</p></div>{score != null && <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-500">{score}% match</div>}</div></CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-2"><Badge variant="outline"><MapPin className="mr-1 size-3" />{job.location || job.country || "Localisation non précisée"}</Badge>{job.contract_type && <Badge variant="outline">{job.contract_type}</Badge>}{job.salary && <Badge variant="outline">{job.salary}</Badge>}</div>
        {score != null && <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Compatibilité</span><span>{score}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div></div>}
        <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
        <div className="mt-auto flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}><Button variant="outline" size="sm" onClick={onMatch} disabled={busy}>{busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3" />}Score IA</Button><Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={onApply}><Send className="mr-1 size-3" />Postuler</Button>{job.url && <Button asChild size="sm" variant="ghost"><a href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /></a></Button>}</div>
      </CardContent>
    </Card>
  );
}

function JobPreview({ job, match, busy, onMatch, onApply }: { job: Job; match?: MatchLite | undefined; busy: boolean; onMatch: () => void; onApply: () => void }) {
  return <><SheetHeader><div className="mb-2 flex flex-wrap gap-2"><Badge className="bg-blue-600">Offre compatible</Badge>{job.source && <Badge variant="outline">{job.source}</Badge>}</div><SheetTitle className="text-2xl">{job.title}</SheetTitle><p className="text-sm text-muted-foreground">{job.company} · {job.location || job.country}</p></SheetHeader><div className="space-y-6 py-6"><div className="grid grid-cols-2 gap-3">{[["Contrat", job.contract_type], ["Niveau", job.level], ["Salaire", job.salary], ["Pays", job.country]].map(([label, value]) => value && <div key={label} className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</div><div><h3 className="mb-2 font-semibold">Description</h3><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{job.description}</p></div>{match && <div><h3 className="mb-3 font-semibold">Analyse de compatibilité</h3><div className="space-y-2 rounded-xl border p-4">{(Object.keys(BREAKDOWN_LABELS) as (keyof MatchResult["breakdown"])[]).map((key) => { const value = match.breakdown?.[key]; return value == null ? null : <div key={key}><div className="flex justify-between text-xs"><span>{BREAKDOWN_LABELS[key]}</span><span>{value}%</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>; })}<p className="pt-2 text-xs text-muted-foreground">{match.reasoning}</p></div></div>}<div className="flex gap-2"><Button className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={onApply}><Send className="mr-2 size-4" />Postuler</Button><Button variant="outline" onClick={onMatch} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}</Button>{job.url && <Button asChild variant="outline"><a href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /></a></Button>}</div></div></>;
}
