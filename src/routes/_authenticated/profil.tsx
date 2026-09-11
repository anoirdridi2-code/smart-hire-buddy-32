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
import { BriefcaseBusiness, Globe2, Languages, MapPin, Save, Sparkles, UserRound } from "lucide-react";

const SECTORS = [
  "Informatique/IT", "Électricité", "Automatisme", "Mécanique", "Maintenance industrielle", "Restauration", "Hôtellerie", "Commerce", "Marketing", "Finance/Comptabilité", "Logistique/Transport", "Santé", "Éducation", "BTP", "Administration", "Autre",
] as const;

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil candidat — Karriera" },
      { name: "description", content: "Renseignez vos métiers, préférences et informations professionnelles pour personnaliser Karriera." },
      { property: "og:title", content: "Mon profil candidat — Karriera" },
      { property: "og:description", content: "Vos préférences personnalisent les recommandations et les outils IA de Karriera." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const refresh = useRefresh();
  const [form, setForm] = useState({ full_name: "", domain: "", target_roles: "", experience_years: "", countries: "", city: "", desired_salary: "", languages: "", contract_type: "", voice_gender: "female" });
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
    setSectors((prev) => prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim().slice(0, 120) || null,
      domain: form.domain.trim().slice(0, 80) || null,
      sectors,
      target_roles: form.target_roles.split(",").map((r) => r.trim()).filter(Boolean),
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      countries: form.countries.split(",").map((c) => c.trim()).filter(Boolean),
      city: form.city.trim().slice(0, 80) || null,
      desired_salary: form.desired_salary.trim().slice(0, 80) || null,
      languages: form.languages.split(",").map((c) => c.trim()).filter(Boolean),
      contract_type: form.contract_type.trim().slice(0, 40) || null,
      voice_gender: form.voice_gender === "male" ? "male" : "female",
    }).eq("id", userData.user!.id);
    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    refresh(["profile"]);
    toast.success("Profil enregistré.");
  }

  const fields: [keyof typeof form, string, string][] = [
    ["full_name", "Nom complet", "Amine Ben Salah"],
    ["experience_years", "Années d'expérience", "3"],
    ["countries", "Pays souhaités", "Tunisie, France, Canada"],
    ["city", "Ville", "Tunis"],
    ["desired_salary", "Salaire souhaité", "2500 € / mois"],
    ["languages", "Langues", "Français, Anglais, Allemand"],
    ["contract_type", "Type de contrat", "CDI, Stage, PFE"],
  ];

  return (
    <AppShell title="Profil" description="Vos informations et préférences professionnelles">
      <form onSubmit={save} className="mx-auto max-w-4xl space-y-6">
        <Card className="rounded-2xl border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm"><UserRound className="size-6" /></span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">Construisez un profil utile</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Vos métiers recherchés sont prioritaires pour la recherche d'emploi. Les autres informations servent à affiner les recommandations et les outils IA.</p>
                </div>
              </div>
              <Button type="submit" className="shrink-0"><Save className="mr-2 size-4" />Enregistrer</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><BriefcaseBusiness className="size-4" /></span>
              <div><h2 className="font-display font-semibold text-slate-950">Métiers recherchés</h2><p className="text-xs text-slate-500">Décrivez les postes que vous souhaitez trouver.</p></div>
            </div>
            <Label htmlFor="target_roles">Métiers recherchés</Label>
            <Input id="target_roles" className="mt-2 h-11" value={form.target_roles} placeholder="Automaticien, Technicien maintenance, Électricien industriel…" maxLength={160} onChange={(e) => setForm({ ...form, target_roles: e.target.value })} />
            <p className="mt-2 text-xs text-slate-500">Séparez plusieurs métiers par des virgules. Vous pourrez aussi lancer une recherche ponctuelle depuis Recherche d'emploi.</p>

            <div className="mt-6">
              <Label htmlFor="domain">Domaine principal <span className="font-normal text-slate-400">(optionnel)</span></Label>
              <Input id="domain" className="mt-2" value={form.domain} placeholder="Électricité, Maintenance industrielle, Hôtellerie…" maxLength={160} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
            </div>

            <div className="mt-6 space-y-3">
              <Label>Secteur(s) d'activité</Label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((sector) => (
                  <button key={sector} type="button" onClick={() => toggleSector(sector)} className={`rounded-full border px-3 py-2 text-sm transition-all ${sectors.includes(sector) ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50"}`}>
                    {sector}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Globe2 className="size-4" /></span><div><h2 className="font-display font-semibold text-slate-950">Mobilité & préférences</h2><p className="text-xs text-slate-500">Définissez où et dans quelles conditions vous souhaitez travailler.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([key, label, placeholder]) => (
                <div key={key} className="space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} value={form[key]} placeholder={placeholder} maxLength={160} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Languages className="size-4" /></span><div><h2 className="font-display font-semibold text-slate-950">Assistant IA</h2><p className="text-xs text-slate-500">Préférences utilisées par le coach et la simulation d'entretien.</p></div></div>
            <Label>Voix de l'assistant IA</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([ ["female", "Féminine"], ["male", "Masculine"] ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setForm({ ...form, voice_gender: value })} className={`rounded-xl border p-3 text-sm font-medium transition-all ${form.voice_gender === value ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{label}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Utilisée par le coach IA et la simulation d'entretien.</p>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex justify-end rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur-md sm:hidden">
          <Button type="submit" className="w-full"><Save className="mr-2 size-4" />Enregistrer les modifications</Button>
        </div>
      </form>
    </AppShell>
  );
}
