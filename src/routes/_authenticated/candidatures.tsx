import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useApplications, useRefresh } from "@/lib/queries";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/candidatures")({
  head: () => ({
    meta: [
      { title: "Suivi des candidatures — Karriera" },
      {
        name: "description",
        content:
          "Suivez chaque candidature : postulé, réponse reçue, entretien, refus ou acceptation, au même endroit.",
      },
      { property: "og:title", content: "Suivi des candidatures — Karriera" },
      {
        property: "og:description",
        content: "Un suivi clair pour ne perdre aucune opportunité.",
      },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { data: applications } = useApplications();
  const refresh = useRefresh();

  async function updateStatus(id: string, status: ApplicationStatus) {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) {
      toast.error("Mise à jour impossible.");
      return;
    }
    refresh(["applications"]);
  }

  return (
    <AppShell title="Candidatures" description="Suivez l'avancement de vos opportunités">
      {(applications ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune candidature enregistrée. Recherchez une offre depuis la page Recherche d'emploi.
        </p>
      )}
      <div className="space-y-3">
        {(applications ?? []).map((a) => {
          const job = a.jobs as unknown as {
            title: string;
            company: string;
            location: string | null;
          } | null;
          return (
            <Card key={a.id} className="panel">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{job?.title ?? "Offre"}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {job?.company} · {job?.location}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {new Date(a.applied_at as string).toLocaleDateString("fr-FR")}
                  </Badge>
                </div>
                <Select
                  value={a.status as string}
                  onValueChange={(v) => updateStatus(a.id as string, v as ApplicationStatus)}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(APPLICATION_STATUSES) as ApplicationStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {APPLICATION_STATUSES[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
