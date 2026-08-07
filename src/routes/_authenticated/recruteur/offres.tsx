import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterApplications, useRecruiterJobs, useRefresh } from "@/lib/queries";
import { draftJobFn, publishJobFn } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/recruteur/offres")({
  head: () => ({
    meta: [
      { title: "Publier une offre avec l'IA — Espace recruteur Karriera" },
      {
        name: "description",
        content:
          "Décrivez votre besoin en une phrase : l'IA rédige l'annonce complète, puis publiez-la auprès des candidats Karriera.",
      },
      { property: "og:title", content: "Espace recruteur — Karriera" },
      {
        property: "og:description",
        content: "Rédaction d'offres assistée par IA et diffusion immédiate aux candidats.",
      },
    ],
  }),
  component: RecruiterJobsPage,
});

const EMPTY = {
  title: "",
  company: "",
  location: "",
  country: "",
  contract_type: "",
  level: "",
  remote: "",
  required_language: "",
  salary: "",
  salary_min: "",
  salary_currency: "",
  experience_min: "",
  skills: "",
  description: "",
};

function RecruiterJobsPage() {
  const { data: jobs } = useRecruiterJobs();
  const { data: applications } = useRecruiterApplications();
  const refresh = useRefresh();
  const draft = useServerFn(draftJobFn);
  const publish = useServerFn(publishJobFn);

  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visa, setVisa] = useState(false);
  const [published, setPublished] = useState(true);
  const [form, setForm] = useState(EMPTY);

  const countByJob = new Map<string, number>();
  (applications ?? []).forEach((a) => {
    countByJob.set(a.job_id as string, (countByJob.get(a.job_id as string) ?? 0) + 1);
  });

  async function generate() {
    if (brief.trim().length < 20) {
      toast.error("Décrivez le poste en quelques lignes.");
      return;
    }
    setDrafting(true);
    try {
      const result = await draft({
        data: { brief: brief.trim(), company: form.company.trim() || "Notre entreprise" },
      });
      setForm({
        title: result.title ?? "",
        company: result.company || form.company,
        location: result.location ?? "",
        country: result.country ?? "",
        contract_type: result.contract_type ?? "",
        level: result.level ?? "",
        remote: result.remote ?? "",
        required_language: result.required_language ?? "",
        salary: result.salary ?? "",
        salary_min: result.salary_min ? String(result.salary_min) : "",
        salary_currency: result.salary_currency ?? "",
        experience_min: result.experience_min ? String(result.experience_min) : "",
        skills: (result.skills ?? []).join(", "),
        description: result.description ?? "",
      });
      toast.success("Annonce rédigée. Relisez et ajustez avant publication.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rédaction impossible.");
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    if (form.title.trim().length < 2 || form.description.trim().length < 20) {
      toast.error("Titre et description sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      await publish({
        data: {
          title: form.title.trim(),
          company: form.company.trim() || "Entreprise",
          location: form.location.trim(),
          country: form.country.trim(),
          contract_type: form.contract_type.trim(),
          level: form.level.trim(),
          remote: form.remote.trim(),
          required_language: form.required_language.trim(),
          salary: form.salary.trim(),
          salary_currency: form.salary_currency.trim(),
          ...(form.salary_min ? { salary_min: Number(form.salary_min) } : {}),
          ...(form.experience_min ? { experience_min: Number(form.experience_min) } : {}),
          visa_sponsorship: visa,
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 30),
          description: form.description.trim(),
          is_published: published,
        },
      });
      setOpen(false);
      setBrief("");
      setForm(EMPTY);
      refresh(["recruiter-jobs", "jobs"]);
      toast.success(published ? "Offre publiée." : "Brouillon enregistré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publication impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(jobId: string, value: boolean) {
    const { error } = await supabase.from("jobs").update({ is_published: value }).eq("id", jobId);
    if (error) {
      toast.error("Mise à jour impossible.");
      return;
    }
    refresh(["recruiter-jobs", "jobs"]);
  }

  return (
    <AppShell title="Mes offres" description="Rédaction assistée par IA et diffusion aux candidats">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Nouvelle offre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une offre</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brief">Brief (l'IA rédige l'annonce)</Label>
                <Textarea
                  id="brief"
                  rows={4}
                  placeholder="Nous cherchons un ingénieur automatisation à Tunis, 3 ans d'expérience, Siemens TIA Portal, CDI, anglais courant."
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  maxLength={8000}
                />
                <Button variant="outline" onClick={() => void generate()} disabled={drafting}>
                  {drafting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Rédiger avec l'IA
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["title", "Intitulé du poste"],
                    ["company", "Entreprise"],
                    ["location", "Ville"],
                    ["country", "Pays"],
                    ["contract_type", "Type de contrat"],
                    ["level", "Niveau"],
                    ["remote", "Télétravail"],
                    ["required_language", "Langue requise"],
                    ["salary", "Salaire affiché"],
                    ["salary_min", "Salaire minimum"],
                    ["salary_currency", "Devise"],
                    ["experience_min", "Expérience min. (années)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`j-${key}`}>{label}</Label>
                    <Input
                      id={`j-${key}`}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      maxLength={160}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-skills">Compétences clés (virgules)</Label>
                <Input
                  id="j-skills"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  maxLength={600}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-desc">Description de l'offre</Label>
                <Textarea
                  id="j-desc"
                  rows={10}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={20000}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                <Label htmlFor="j-visa">Nous sponsorisons le visa</Label>
                <Switch id="j-visa" checked={visa} onCheckedChange={setVisa} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                <Label htmlFor="j-pub">Publier immédiatement</Label>
                <Switch id="j-pub" checked={published} onCheckedChange={setPublished} />
              </div>

              <Button className="w-full" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(jobs ?? []).length === 0 && (
          <Card className="panel md:col-span-2">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Aucune offre publiée. Créez votre première annonce avec l'IA.
            </CardContent>
          </Card>
        )}
        {(jobs ?? []).map((job) => (
          <Card key={job.id} className="panel">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="font-display text-base leading-snug">{job.title}</CardTitle>
                <Badge variant={job.is_published ? "default" : "secondary"}>
                  {job.is_published ? "Publiée" : "Brouillon"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {job.company} · {job.location}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[job.contract_type, job.level, job.remote, job.required_language]
                  .filter(Boolean)
                  .map((t) => (
                    <Badge key={t as string} variant="outline">
                      {t}
                    </Badge>
                  ))}
                {job.visa_sponsorship && <Badge variant="outline">Visa sponsorisé</Badge>}
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-muted-foreground">
                  {countByJob.get(job.id) ?? 0} candidature(s)
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`pub-${job.id}`} className="text-xs text-muted-foreground">
                    Publiée
                  </Label>
                  <Switch
                    id={`pub-${job.id}`}
                    checked={job.is_published}
                    onCheckedChange={(v) => void togglePublished(job.id, v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
