import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApplications, useCvs, useJobs, useMatches } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";
import { ArrowRight, BriefcaseBusiness, FileText, Search, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Karriera" },
      {
        name: "description",
        content: "Suivez votre profil, découvrez des opportunités et gardez vos candidatures sous contrôle.",
      },
      { property: "og:title", content: "Tableau de bord — Karriera" },
      {
        property: "og:description",
        content: "Profil, recherche d'emploi et suivi des candidatures en un coup d'œil.",
      },
    ],
  }),
  component: Dashboard,
});

function ScoreCard({ label, value, icon: Icon }: { label: string; value: number | null; icon: typeof Search }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold text-slate-950">
          {value ?? "—"}{value != null && <span className="text-lg font-normal text-slate-400">/100</span>}
        </div>
        <Progress value={value ?? 0} className="mt-3" />
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data: cvs, isLoading } = useCvs();
  const cv = cvs?.[0] ?? null;
  const { data: jobs } = useJobs();
  const { data: matches } = useMatches(cv?.id ?? null);
  const { data: applications } = useApplications();

  const topMatches = (matches ?? [])
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 4)
    .map((m) => ({ ...m, job: jobs?.find((j) => j.id === m.job_id) }))
    .filter((m) => m.job);

  const counts = (applications ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.status as string] = (acc[a.status as string] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell title="Tableau de bord" description="Votre progression en un coup d'œil">
      {!isLoading && !cv && (
        <Card className="mb-6 overflow-hidden rounded-2xl border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 shadow-sm">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <FileText className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950">Complétez votre profil CV</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                  Analysez votre CV pour obtenir un score ATS, améliorer sa lisibilité et préparer vos prochaines candidatures.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link to="/cv">Ajouter mon CV <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><BriefcaseBusiness className="size-4" /></span>
            <h2 className="font-display text-base font-semibold text-slate-950">Prêt pour votre prochaine opportunité ?</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Saisissez simplement le métier que vous recherchez et explorez les offres disponibles dans le monde.</p>
        </div>
        <Button asChild variant="outline" className="shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Link to="/offres">Rechercher un métier <Search className="ml-2 size-4" /></Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScoreCard label="Score global" value={cv?.global_score ?? null} icon={TrendingUp} />
        <ScoreCard label="Compatibilité ATS" value={cv?.ats_score ?? null} icon={Search} />
        <ScoreCard label="Lisibilité" value={cv?.readability_score ?? null} icon={FileText} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-base text-slate-950">Offres recommandées</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Des opportunités basées sur votre profil.</p>
            </div>
            <Link to="/offres" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Voir tout</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {topMatches.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-medium text-slate-700">Aucune recommandation pour l'instant</p>
                <p className="mt-1 text-xs text-slate-500">Recherchez directement un métier pour découvrir des opportunités.</p>
                <Button asChild size="sm" className="mt-4"><Link to="/offres">Rechercher un métier</Link></Button>
              </div>
            )}
            {topMatches.map((m) => (
              <div key={m.job_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{m.job!.title}</p>
                  <p className="truncate text-xs text-slate-500">{m.job!.company} · {m.job!.location}</p>
                </div>
                <Badge className="shrink-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{m.score}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base text-slate-950">Suivi des candidatures</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Visualisez rapidement où vous en êtes.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(APPLICATION_STATUSES) as ApplicationStatus[]).map((s) => (
                <div key={s} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="font-display text-2xl font-semibold text-slate-950">{counts[s] ?? 0}</p>
                  <p className="mt-1 text-xs text-slate-500">{APPLICATION_STATUSES[s]}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-4 w-full border-slate-200">
              <Link to="/candidatures">Voir mes candidatures <ArrowRight className="ml-2 size-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
