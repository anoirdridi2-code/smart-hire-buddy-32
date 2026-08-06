import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCvs, useJobs, useMatches, useRefresh } from "@/lib/queries";
import { importJobFn, matchJobFn } from "@/lib/career.functions";

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

  const { data: cvs } = useCvs();
  const cv = cvs?.[0] ?? null;
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches(cv?.id ?? null);
  const refresh = useRefresh();
  const importJob = useServerFn(importJobFn);
  const matchJob = useServerFn(matchJobFn);

  const scoreByJob = useMemo(() => {
    const map = new Map<string, number>();
    (matches ?? []).forEach((m) => map.set(m.job_id as string, m.score as number));
    return map;
  }, [matches]);

  const filtered = (jobs ?? [])
    .filter((j) =>
      [j.title, j.company, j.location, j.country, j.contract_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => (scoreByJob.get(b.id) ?? -1) - (scoreByJob.get(a.id) ?? -1));

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
        {filtered.map((job) => {
          const score = scoreByJob.get(job.id);
          return (
            <Card key={job.id} className="panel flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="font-display text-base leading-snug">{job.title}</CardTitle>
                  {score != null && (
                    <Badge variant={score >= 75 ? "default" : "secondary"}>{score}%</Badge>
                  )}
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
                  {!job.is_demo && <Badge variant="outline">Ajoutée par vous</Badge>}
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => runMatch(job.id)}
                    disabled={busyJob === job.id}
                  >
                    {busyJob === job.id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    Score IA
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => apply(job.id)}>
                    <Send className="mr-2 size-4" />
                    Postuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
