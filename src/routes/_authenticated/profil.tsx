import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRefresh } from "@/lib/queries";

const SECTORS = [
  "Informatique/IT",
  "Électricité",
  "Automatisme",
  "Mécanique",
  "Maintenance industrielle",
  "Restauration",
  "Hôtellerie",
  "Commerce",
  "Marketing",
  "Finance/Comptabilité",
  "Logistique/Transport",
  "Santé",
  "Éducation",
  "BTP",
  "Administration",
  "Autre",
] as const;

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil candidat — Karriera" },
      {
        name: "description",
        content:
          "Renseignez votre domaine, expérience, pays cibles, salaire souhaité et langues pour affiner l'IA.",
      },
      { property: "og:title", content: "Mon profil candidat — Karriera" },
      {
        property: "og:description",
        content: "Vos préférences guident l'analyse du CV et le matching des offres.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const refresh = useRefresh();
  const [form, setForm] = useState({
    full_name: "",
    domain: "",
    target_roles: "",
    experience_years: "",
    countries: "",
    city: "",
    desired_salary: "",
    languages: "",
    contract_type: "",
    voice_gender: "female",
  });
  const [sectors, setSectors] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      domain: profile.domain ?? "",
      target_roles: (profile.target_roles ?? []).join(", "),
      experience_years: profile.experience_years?.toString() ?? "",
      countries: (profile.countries ?? []).join(", "),
      city: profile.city ?? "",
      desired_salary: profile.desired_salary ?? "",
      languages: (profile.languages ?? []).join(", "),
      contract_type: profile.contract_type ?? "",
      voice_gender: profile.voice_gender === "male" ? "male" : "female",
    });
    setSectors(profile.sectors ?? []);
  }, [profile]);

  function toggleSector(sector: string) {
    setSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector],
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim().slice(0, 120) || null,
        domain: form.domain.trim().slice(0, 80) || null,
        sectors,
        target_roles: form.target_roles
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        countries: form.countries
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        city: form.city.trim().slice(0, 80) || null,
        desired_salary: form.desired_salary.trim().slice(0, 80) || null,
        languages: form.languages
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        contract_type: form.contract_type.trim().slice(0, 40) || null,
        voice_gender: form.voice_gender === "male" ? "male" : "female",
      })
      .eq("id", userData.user!.id);
    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    refresh(["profile"]);
    toast.success("Profil enregistré.");
  }

  const fields: [keyof typeof form, string, string][] = [
    ["full_name", "Nom complet", "Amine Ben Salah"],
    ["target_roles", "Métiers recherchés", "Serveuse, Réceptionniste hôtel"],
    ["domain", "Domaine (ancien champ, optionnel)", "Informatique, Mécanique, Électrique…"],
    ["experience_years", "Années d'expérience", "3"],
    ["countries", "Pays souhaités", "Tunisie, France, Canada"],
    ["city", "Ville", "Tunis"],
    ["desired_salary", "Salaire souhaité", "2500 € / mois"],
    ["languages", "Langues", "Français, Anglais, Allemand"],
    ["contract_type", "Type de contrat", "CDI, Stage, PFE"],
  ];

  return (
    <AppShell title="Profil" description="Ces informations affinent l'analyse et le matching">
      <Card className="panel max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, placeholder]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={form[key]}
                  placeholder={placeholder}
                  maxLength={160}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="space-y-2 sm:col-span-2">
              <Label>Secteur(s) d'activité</Label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((sector) => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => toggleSector(sector)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      sectors.includes(sector)
                        ? "border-primary bg-primary/10"
                        : "border-border/70 hover:bg-muted"
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Vous pouvez sélectionner plusieurs secteurs. Utilisé pour trouver des offres
                réellement pertinentes pour votre métier.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Voix de l'assistant IA</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["female", "Féminine"],
                    ["male", "Masculine"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, voice_gender: value })}
                    className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${
                      form.voice_gender === value
                        ? "border-primary bg-primary/10"
                        : "border-border/70 hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisée par le coach IA et la simulation d'entretien.
              </p>
            </div>
            <Button type="submit" className="sm:col-span-2">
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
