import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterApplications, useRefresh } from "@/lib/queries";
import { rankApplicationFn } from "@/lib/career.functions";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/recruteur/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline de recrutement IA — Karriera" },
      {
        name: "description",
        content:
          "Classement automatique des candidats par l'IA et pipeline Kanban : pré-sélection, entretiens, offre et embauche.",
      },
      { property: "og:title", content: "Pipeline de recrutement — Karriera" },
      {
        property: "og:description",
        content: "Classez vos candidats avec l'IA et suivez chaque étape du recrutement.",
      },
    ],
  }),
  component: PipelinePage,
});

const STAGES = Object.keys(PIPELINE_STAGES) as PipelineStage[];

function PipelinePage() {
  const { data: applications } = useRecruiterApplications();
  const refresh = useRefresh();
  const rank = useServerFn(rankApplicationFn);
  const [busy, setBusy] = useState<string | null>(null);

  async function score(applicationId: string) {
    setBusy(applicationId);
    try {
      await rank({ data: { applicationId } });
      refresh(["recruiter-applications"]);
      toast.success("Candidat évalué par l'IA.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Évaluation impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function move(applicationId: string, stage: PipelineStage) {
    const { error } = await supabase
      .from("applications")
      .update({ stage })
      .eq("id", applicationId);
    if (error) {
      toast.error("Déplacement impossible.");
      return;
    }
    refresh(["recruiter-applications"]);
  }

  return (
    <AppShell title="Pipeline" description="Classement IA des candidats et suivi du recrutement">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const items = (applications ?? []).filter(
            (a) => (a.stage as PipelineStage) === stage,
          );
          return (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold">{PIPELINE_STAGES[stage]}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((application) => {
                  const job = application.jobs as unknown as { title: string } | null;
                  const profile = application.profiles as unknown as {
                    full_name: string | null;
                    domain: string | null;
                    experience_years: number | null;
                    city: string | null;
                  } | null;
                  return (
                    <Card key={application.id} className="panel">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">
                            {profile?.full_name ?? "Candidat"}
                          </p>
                          {application.match_score != null && (
                            <Badge variant={application.match_score >= 75 ? "default" : "secondary"}>
                              {application.match_score}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {[profile?.domain, profile?.city, profile?.experience_years
                            ? `${profile.experience_years} an(s)`
                            : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{job?.title}</p>
                        {application.match_reasoning && (
                          <p className="line-clamp-3 text-xs text-muted-foreground">
                            {application.match_reasoning}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => void score(application.id)}
                          disabled={busy === application.id}
                        >
                          {busy === application.id ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 size-4" />
                          )}
                          Évaluer avec l'IA
                        </Button>
                        <Select
                          value={stage}
                          onValueChange={(v) => void move(application.id, v as PipelineStage)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {PIPELINE_STAGES[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Vide
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
