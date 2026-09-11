import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useApplications, useRefresh } from "@/lib/queries";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/candidatures")({
  head: () => ({
    meta: [
      { title: "Suivi des candidatures — Karriera" },
      { name: "description", content: "Suivez chaque candidature et l'évolution de vos opportunités depuis un seul espace." },
      { property: "og:title", content: "Suivi des candidatures — Karriera" },
      { property: "og:description", content: "Un suivi clair pour ne perdre aucune opportunité." },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { data: applications } = useApplications();
  const refresh = useRefresh();
  const items = applications ?? [];

  async function updateStatus(id: string, status: ApplicationStatus) {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) {
      toast.error("Mise à jour impossible.");
      return;
    }
    refresh(["applications"]);
    toast.success("Statut mis à jour.");
  }

  const statusCounts = items.reduce<Record<string, number>>((acc, application) => {
    acc[application.status as string] = (acc[application.status as string] ?? 0) + 1;
    return acc;
  }, {});
  const activeCount = items.filter((a) => ["applied", "screening", "interview"].includes(a.status as string)).length;
  const interviewCount = statusCounts.interview ?? 0;
  const acceptedCount = statusCounts.accepted ?? 0;

  return (
    <AppShell title="Candidatures" description="Gardez une vue claire sur toutes vos opportunités">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={BriefcaseBusiness} label="Total" value={items.length} />
        <SummaryCard icon={Clock3} label="En cours" value={activeCount} />
        <SummaryCard icon={CheckCircle2} label="Entretiens" value={interviewCount} />
      </div>

      {items.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-slate-300 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center p-10 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><FileCheck2 className="size-7" /></span>
            <h2 className="mt-5 font-display text-lg font-semibold text-slate-950">Aucune candidature pour le moment</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Recherchez un métier, consultez les offres et ajoutez vos candidatures ici pour suivre leur évolution.</p>
            <Button asChild className="mt-5"><Link to="/offres">Rechercher des offres <ArrowRight className="ml-2 size-4" /></Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const job = a.jobs as unknown as { title: string; company: string; location: string | null } | null;
            return (
              <Card key={a.id} className="rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 sm:grid"><BriefcaseBusiness className="size-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold text-slate-950">{job?.title ?? "Offre"}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">{job?.company ?? "Entreprise"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {job?.location && <span className="text-xs text-slate-500">{job.location}</span>}
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 font-normal text-slate-500">{new Date(a.applied_at as string).toLocaleDateString("fr-FR")}</Badge>
                      </div>
                    </div>
                  </div>
                  <Select value={a.status as string} onValueChange={(v) => updateStatus(a.id as string, v as ApplicationStatus)}>
                    <SelectTrigger className="w-full border-slate-200 bg-white sm:w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(APPLICATION_STATUSES) as ApplicationStatus[]).map((s) => <SelectItem key={s} value={s}>{APPLICATION_STATUSES[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {acceptedCount > 0 && <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800">🎉 {acceptedCount} candidature{acceptedCount > 1 ? "s" : ""} acceptée{acceptedCount > 1 ? "s" : ""}. Félicitations !</div>}
    </AppShell>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: number }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="size-4" /></span>
        <div><p className="font-display text-2xl font-semibold text-slate-950">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
      </CardContent>
    </Card>
  );
}
