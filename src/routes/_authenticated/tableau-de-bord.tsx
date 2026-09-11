import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApplications, useCvs, useJobs, useMatches } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";
import { ArrowRight, FileText, Search, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Karriera" },
      {
        name: "description",
        content:
          "Suivez votre score CV, découvrez des offres adaptées à votre recherche et suivez vos candidatures.",
      },
      { property: "og:title", content: "Tableau de bord — Karriera" },
      {
        property: "og:description",
        content: "Score ATS, recherche d'emploi et suivi des candidatures en un coup d'œil.",
      },
    ],
  }),
  component: Dashboard,
});

function ScoreCard({ label, value, icon: Icon }: { label: string; value: number | null; icon: typeof Search }) {
  return (
    <Card className="panel">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold">
          {value ?? "—"}{value != null && <span className="text-lg text-muted-foreground">/100</span>}
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
        <Card className="panel mb-6 border-primary/40">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Commencez par votre CV</h2>
              <p className="text-sm text-muted-foreground">
                Importez votre CV (PDF ou Word) pour lancer l'analyse IA et optimiser vos candidatures.
              </p>
            </div>
            <Button asChild>
              <Link to="/cv">
                Importer mon CV <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScoreCard label="Score global" value={cv?.global_score ?? null} icon={TrendingUp} />
        <ScoreCard label="Compatibilité ATS" value={cv?.ats_score ?? null} icon={Search} />
        <ScoreCard label="Lisibilité" value={cv?.readability_score ?? null} icon={FileText} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="panel">
          <CardHeader>
            <CardTitle className="font-display text-base">Offres suggérées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topMatches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune offre enregistrée pour l'instant. {" "}
                <Link to="/offres" className="text-primary underline-offset-4 hover:underline">
                  Recherchez un métier
                </Link>{" "}
                pour découvrir des opportunités.
              </p>
            )}
            {topMatches.map((m) => (
              <div
                key={m.job_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.job!.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.job!.company} · {m.job!.location}
                  </p>
                </div>
                <Badge variant={m.score >= 75 ? "default" : "secondary"}>{m.score}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader>
            <CardTitle className="font-display text-base">Suivi des candidatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(APPLICATION_STATUSES) as ApplicationStatus[]).map((s) => (
                <div key={s} className="rounded-lg border border-border/70 p-3">
                  <p className="font-display text-2xl font-semibold">{counts[s] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{APPLICATION_STATUSES[s]}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/candidatures">Voir mes candidatures</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
