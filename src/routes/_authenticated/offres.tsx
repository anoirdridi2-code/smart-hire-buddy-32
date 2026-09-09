import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown, ExternalLink, Globe2, Loader2, Plus, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useCvs, useJobs, useMatches, useRefresh } from "@/lib/queries";
import { fetchLiveJobsFn, importJobFn, matchJobFn } from "@/lib/career.functions";
import { GlobalJobSearch } from "@/components/GlobalJobSearch";
import type { MatchResult } from "@/lib/types";

/** Seuil minimum pour qu'une offre soit considérée "pertinente". Ne change pas le calcul du score, seulement l'affichage. */
const MIN_RELEVANT_SCORE = 40;

type MatchLite = Pick<MatchResult, "score" | "breakdown" | "reasoning">;

const BREAKDOWN_LABELS: Record<keyof MatchResult["breakdown"], string> = {
  role_match: "Métier",
  skills: "Compétences",
  experience: "Expérience",
  language: "Langues",
  education: "Éducation",
};

export const Route = createFileRoute("/_authenticated/offres")({
  head: () => ({
    meta: [
      { title: "Offres d'emploi & matching IA — Karriera" },
      {
        name: "description",
        content:
          "Parcourez les offres en Tunisie, France, Allemagne, Canada et Golfe, et obtenez un score de compatibilité IA.",
      },
      { property: "og:title", content: "Offres d'emploi & matching IA — Karriera" },
      {
        property: "og:description",
        content: "Score de compatibilité IA offre par offre et postulation en un clic.",
      },
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
  const autoLoaded = useRef(false);

  const { data: cvs } = useCvs();
  const cv = cvs?.[0] ?? null;
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches(cv?.id ?? null);
  const refresh = useRefresh();
  const importJob = useServerFn(importJobFn);
  const matchJob = useServerFn(matchJobFn);
  const fetchLive = useServerFn(fetchLiveJobsFn);

  const loadLiveJobs = useCallback(
    async (silent = false) => {
      setLoadingLive(true);
      try {
        const res = await fetchLive({ data: { query: search.trim() } });
        refresh(["jobs"]);
        if (!silent) {
          toast.success(
            res.imported > 0
              ? `${res.imported} offres réelles ajoutées.`
              : "Vos offres sont déjà à jour.",
          );
        }
      } catch (e) {
        if (!silent) toast.error(e instanceof Error ? e.message : "Récupération impossible.");
      } finally {
        setLoadingLive(false);
      }
    },
    [fetchLive, refresh, search],
  );

  useEffect(() => {
    if (autoLoaded.current || !jobs || jobs.length > 0) return;
    autoLoaded.current = true;
    void loadLiveJobs(true);
  }, [jobs, loadLiveJobs]);

  const scoreByJob = useMemo(() => {
    const map = new Map<string, number>();
    (matches ?? []).forEach((m) => map.set(m.job_id as string, m.score as number));
    return map;
  }, [matches]);

  const matchByJob = useMemo(() => {
    const map = new Map<string, MatchLite>();
    (matches ?? []).forEach((m) =>
      map.set(m.job_id as string, {
        score: m.score as number,
        breakdown: m.breakdown as MatchResult["breakdown"],
        reasoning: m.reasoning as string,
      }),
    );
    return map;
  }, [matches]);

  const searched = (jobs ?? []).filter((j) =>
    [j.title, j.company, j.location, j.country, j.contract_type]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // Phase 1 : une offre sans score n'est PAS considérée comme "peu pertinente" — c'est une
  // catégorie à part ("non évaluée"), distincte d'un vrai score faible.
  const relevantJobs = searched
    .filter((j) => (scoreByJob.get(j.id) ?? -1) >= MIN_RELEVANT_SCORE)
    .sort((a, b) => (scoreByJob.get(b.id) ?? 0) - (scoreByJob.get(a.id) ?? 0));
  const lessRelevantJobs = searched
    .filter((j) => scoreByJob.has(j.id) && (scoreByJob.get(j.id) as number) < MIN_RELEVANT_SCORE)
    .sort((a, b) => (scoreByJob.get(b.id) ?? 0) - (scoreByJob.get(a.id) ?? 0));
  const unevaluatedJobs = searched.filter((j) => !scoreByJob.has(j.id));

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
      refresh(["jobs"]);
      toast.success("Offre ajoutée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  async function runMatch(jobId: string) {
    if (!cv) {
      toast.error("Importez et analysez d'abord un CV.");
      return;
    }
    setBusyJob(jobId);
    try {
      await matchJob({ data: { cvId: cv.id, jobId } });
      refresh(["matches"]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Matching impossible.");
    } finally {
      setBusyJob(null);
    }
  }

  async function matchAll() {
    if (!cv) {
      toast.error("Importez et analysez d'abord un CV.");
      return;
    }
    setMatchingAll(true);
    try {
      const targets = (jobs ?? []).filter((j) => !scoreByJob.has(j.id)).slice(0, 8);
      for (const job of targets) {
        await matchJob({ data: { cvId: cv.id, jobId: job.id } });
      }
      refresh(["matches"]);
      toast.success("Matching terminé.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Matching impossible.");
    } finally {
      setMatchingAll(false);
    }
  }

  async function apply(jobId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("applications").insert({
      user_id: userData.user!.id,
      job_id: jobId,
      cv_id: cv?.id ?? null,
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
    <AppShell title="Offres & matching" description="Trouvez les offres où vous avez le plus de chances">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Rechercher un poste, une ville, un pays…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={80}
        />
        <Button variant="outline" onClick={matchAll} disabled={matchingAll}>
          {matchingAll ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
          Matcher mon CV
        </Button>
        <Button variant="outline" onClick={() => void loadLiveJobs()} disabled={loadingLive}>
          {loadingLive ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Globe2 className="mr-2 size-4" />}
          Offres réelles
        </Button>
        <GlobalJobSearch onImported={() => refresh(["jobs"])} />
        <Dialog open={openImport} onOpenChange={setOpenImport}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Ajouter une offre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Coller une annonce</DialogTitle>
            </DialogHeader>
            <Textarea
              rows={10}
              placeholder="Collez ici le texte de l'annonce (LinkedIn, Indeed, TanitJobs…)"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              maxLength={30000}
            />
            <Button onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Analyser et ajouter
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {relevantJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            match={matchByJob.get(job.id)}
            busy={busyJob === job.id}
            onMatch={() => runMatch(job.id)}
            onApply={() => apply(job.id)}
          />
        ))}
        {relevantJobs.length === 0 && (
          <p className="text-sm text-muted-foreground md:col-span-2">
            Aucune offre pertinente (≥ {MIN_RELEVANT_SCORE}%) pour l'instant. Lancez le matching
            sur vos offres ou consultez les sections ci-dessous.
          </p>
        )}
      </div>

      {lessRelevantJobs.length > 0 && (
        <Collapsible className="mt-6">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/70 px-4 py-3 text-sm font-medium hover:bg-muted">
            🟠 Offres moins pertinentes ({lessRelevantJobs.length})
            <ChevronDown className="size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 grid gap-4 md:grid-cols-2">
            {lessRelevantJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                match={matchByJob.get(job.id)}
                busy={busyJob === job.id}
                onMatch={() => runMatch(job.id)}
                onApply={() => apply(job.id)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {unevaluatedJobs.length > 0 && (
        <Collapsible className="mt-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/70 px-4 py-3 text-sm font-medium hover:bg-muted">
            ⚪ Offres non évaluées ({unevaluatedJobs.length})
            <ChevronDown className="size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 grid gap-4 md:grid-cols-2">
            {unevaluatedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                match={matchByJob.get(job.id)}
                busy={busyJob === job.id}
                onMatch={() => runMatch(job.id)}
                onApply={() => apply(job.id)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </AppShell>
  );
}

function JobCard({
  job,
  match,
  busy,
  onMatch,
  onApply,
}: {
  job: NonNullable<ReturnType<typeof useJobs>["data"]>[number];
  match: MatchLite | undefined;
  busy: boolean;
  onMatch: () => void;
  onApply: () => void;
}) {
  const score = match?.score;
  const breakdown = match?.breakdown;

  return (
    <Card className="panel flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-display text-base leading-snug">{job.title}</CardTitle>
          {score != null && <Badge variant={score >= 75 ? "default" : "secondary"}>{score}%</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {job.company} · {job.location}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {[job.contract_type, job.level, job.salary, job.source]
            .filter(Boolean)
            .map((t) => (
              <Badge key={t as string} variant="outline">
                {t}
              </Badge>
            ))}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>

        {breakdown && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border/60 p-3 text-xs">
            {(Object.keys(BREAKDOWN_LABELS) as (keyof MatchResult["breakdown"])[]).map((key) => {
              const value = breakdown[key];
              // Ne jamais afficher une valeur inexistante (ex. role_match absent sur un ancien
              // match) — on masque simplement la ligne plutôt que d'inventer 0%.
              if (value == null) return null;
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{BREAKDOWN_LABELS[key]}</span>
                  <span className="font-medium">{value}%</span>
                </div>
              );
            })}
          </div>
        )}

        {match?.reasoning && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Analyse : </span>
            {match.reasoning}
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onMatch} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            Score IA
          </Button>
          <Button size="sm" className="flex-1" onClick={onApply}>
            <Send className="mr-2 size-4" />
            Postuler
          </Button>
          {job.url && (
            <Button asChild size="sm" variant="ghost">
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                <span className="sr-only">Voir l'annonce</span>
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
