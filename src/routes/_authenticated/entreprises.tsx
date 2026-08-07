import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Globe, Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCompanies, useRefresh } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/entreprises")({
  head: () => ({
    meta: [
      { title: "Profils d'entreprises — Karriera" },
      {
        name: "description",
        content:
          "Consultez la culture, les technologies et les fourchettes de salaires des entreprises qui recrutent sur Karriera.",
      },
      { property: "og:title", content: "Profils d'entreprises — Karriera" },
      {
        property: "og:description",
        content: "Culture, technologies et salaires des entreprises qui recrutent.",
      },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { data: companies } = useCompanies();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    website: "",
    country: "",
    city: "",
    industry: "",
    size: "",
    technologies: "",
    culture: "",
    salary_range: "",
    description: "",
  });

  const filtered = (companies ?? []).filter((c) =>
    [c.name, c.industry, c.country, c.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function save() {
    if (form.name.trim().length < 2) {
      toast.error("Le nom de l'entreprise est requis.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("companies").insert({
        owner_id: userData.user!.id,
        name: form.name.trim().slice(0, 160),
        website: form.website.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        industry: form.industry.trim() || null,
        size: form.size.trim() || null,
        culture: form.culture.trim() || null,
        salary_range: form.salary_range.trim() || null,
        description: form.description.trim() || null,
        technologies: form.technologies
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20),
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      refresh(["companies"]);
      toast.success("Fiche entreprise publiée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Entreprises" description="Culture, technologies et salaires avant de postuler">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Rechercher une entreprise, un secteur, un pays…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={80}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Ajouter une fiche
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fiche entreprise</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {(
                [
                  ["name", "Nom"],
                  ["website", "Site web"],
                  ["industry", "Secteur"],
                  ["country", "Pays"],
                  ["city", "Ville"],
                  ["size", "Taille (ex: 50-200)"],
                  ["technologies", "Technologies (virgules)"],
                  ["salary_range", "Fourchette de salaire"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`c-${key}`}>{label}</Label>
                  <Input
                    id={`c-${key}`}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    maxLength={200}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="c-culture">Culture d'entreprise</Label>
                <Textarea
                  id="c-culture"
                  rows={3}
                  value={form.culture}
                  onChange={(e) => setForm({ ...form, culture: e.target.value })}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-desc">Description</Label>
                <Textarea
                  id="c-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={4000}
                />
              </div>
              <Button className="w-full" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Publier la fiche
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <Card className="panel md:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Aucune fiche entreprise pour l'instant.
            </CardContent>
          </Card>
        )}
        {filtered.map((company) => (
          <Card key={company.id} className="panel">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
                  <Building2 className="size-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="font-display text-base">{company.name}</CardTitle>
                  <p className="truncate text-sm text-muted-foreground">
                    {[company.industry, company.city, company.country].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {company.description && (
                <p className="line-clamp-3 text-sm text-muted-foreground">{company.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {(company.technologies ?? []).slice(0, 6).map((tech: string) => (
                  <Badge key={tech} variant="outline">
                    {tech}
                  </Badge>
                ))}
                {company.size && <Badge variant="secondary">{company.size}</Badge>}
                {company.salary_range && <Badge variant="secondary">{company.salary_range}</Badge>}
              </div>
              {company.culture && (
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Culture :</strong> {company.culture}
                </p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="size-4" />
                  Site web
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
