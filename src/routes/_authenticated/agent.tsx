import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Loader2, Plus, Radar, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAlerts, useCvs, useMissions, useRefresh } from "@/lib/queries";
import { runAgentFn } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({
    meta: [
      { title: "Agent IA de veille emploi — Karriera" },
      {
        name: "description",
        content:
          "Confiez une mission à l'agent IA : il surveille les offres, note leur compatibilité et vous alerte uniquement sur les meilleures.",
      },
      { property: "og:title", content: "Agent IA de veille emploi — Karriera" },
      {
        property: "og:description",
        content: "Veille automatique des offres et alertes intelligentes basées sur votre CV.",
      },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  const { data: missions } = useMissions();
  const { data: alerts } = useAlerts();
  const { data: cvs } = useCvs();
  const refresh = useRefresh();
  const runAgent = useServerFn(runAgentFn);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [countries, setCountries] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [minScore, setMinScore] = useState("80");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [visaRequired, setVisaRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  async function createMission() {
    if (title.trim().length < 3) {
      toast.error("Donnez un nom à votre mission.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("agent_missions").insert({
        user_id: userData.user!.id,
        cv_id: cvs?.[0]?.id ?? null,
        title: title.trim().slice(0, 120),
        target_role: targetRole.trim().slice(0, 120) || null,
        countries: countries
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 10),
        remote_only: remoteOnly,
        visa_required: visaRequired,
        salary_min: salaryMin ? Number(salaryMin) : null,
        min_score: Math.min(100, Math.max(0, Number(minScore) || 80)),
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      setTitle("");
      setTargetRole("");
      setCountries("");
      setSalaryMin("");
      refresh(["missions"]);
      toast.success("Mission créée. Lancez l'agent pour la première veille.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function run(missionId: string) {
    setRunning(missionId);
    try {
      const result = await runAgent({ data: { missionId } });
      refresh(["missions", "alerts"]);
      toast.success(
        result.created > 0
          ? `${result.created} nouvelle(s) alerte(s) sur ${result.scanned} offres analysées.`
          : `Aucune offre au-dessus de votre seuil sur ${result.scanned} analysées.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'agent n'a pas pu s'exécuter.");
    } finally {
      setRunning(null);
    }
  }

  async function removeMission(id: string) {
    await supabase.from("agent_missions").delete().eq("id", id);
    refresh(["missions", "alerts"]);
  }

  async function markRead(id: string) {
    await supabase.from("agent_alerts").update({ is_read: true }).eq("id", id);
    refresh(["alerts"]);
  }

  return (
    <AppShell
      title="Agent IA"
      description="Votre agent surveille les offres et vous alerte sur les meilleures opportunités"
    >
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Nouvelle mission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confier une mission à l'agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="m-title">Nom de la mission</Label>
                <Input
                  id="m-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ingénieur mécanique en Allemagne"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-role">Poste visé</Label>
                <Input
                  id="m-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Ingénieur automatisation"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-countries">Pays (séparés par des virgules)</Label>
                <Input
                  id="m-countries"
                  value={countries}
                  onChange={(e) => setCountries(e.target.value)}
                  placeholder="Allemagne, Canada, France"
                  maxLength={200}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="m-salary">Salaire minimum (annuel)</Label>
                  <Input
                    id="m-salary"
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="45000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-score">Seuil d'alerte (score)</Label>
                  <Input
                    id="m-score"
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                <Label htmlFor="m-remote">Télétravail uniquement</Label>
                <Switch id="m-remote" checked={remoteOnly} onCheckedChange={setRemoteOnly} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                <Label htmlFor="m-visa">Sponsor de visa nécessaire</Label>
                <Switch id="m-visa" checked={visaRequired} onCheckedChange={setVisaRequired} />
              </div>
              <Button className="w-full" onClick={() => void createMission()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Créer la mission
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Missions
          </h2>
          {(missions ?? []).length === 0 && (
            <Card className="panel">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Aucune mission pour l'instant. Créez-en une : l'agent analysera les offres et ne vous
                préviendra que si le score dépasse votre seuil.
              </CardContent>
            </Card>
          )}
          {(missions ?? []).map((mission) => (
            <Card key={mission.id} className="panel">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="font-display text-base">{mission.title}</CardTitle>
                  <Badge variant="secondary">≥ {mission.min_score}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {mission.target_role ?? "Tous postes"} ·{" "}
                  {(mission.countries ?? []).join(", ") || "Tous pays"}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                {mission.remote_only && <Badge variant="outline">Remote</Badge>}
                {mission.visa_required && <Badge variant="outline">Visa sponsorisé</Badge>}
                {mission.salary_min != null && (
                  <Badge variant="outline">≥ {mission.salary_min}</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {mission.last_run_at
                    ? `Dernière veille : ${new Date(mission.last_run_at).toLocaleString("fr-FR")}`
                    : "Jamais exécutée"}
                </span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void run(mission.id)}
                    disabled={running === mission.id}
                  >
                    {running === mission.id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Radar className="mr-2 size-4" />
                    )}
                    Lancer la veille
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Supprimer la mission"
                    onClick={() => void removeMission(mission.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Alertes intelligentes
          </h2>
          {(alerts ?? []).length === 0 && (
            <Card className="panel">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Aucune alerte pour le moment.
              </CardContent>
            </Card>
          )}
          {(alerts ?? []).map((alert) => {
            const job = alert.jobs as unknown as {
              title: string;
              company: string;
              location: string | null;
            } | null;
            return (
              <Card key={alert.id} className={alert.is_read ? "panel opacity-60" : "panel"}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{job?.title ?? "Offre"}</p>
                      <p className="text-sm text-muted-foreground">
                        {job?.company} · {job?.location}
                      </p>
                    </div>
                    <Badge>{alert.score}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  {!alert.is_read && (
                    <Button size="sm" variant="ghost" onClick={() => void markRead(alert.id)}>
                      <Bell className="mr-2 size-4" />
                      Marquer comme lue
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
