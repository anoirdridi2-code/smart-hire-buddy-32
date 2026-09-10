import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/inscription-professionnel")({
  head: () => ({
    meta: [
      { title: "Inscription professionnel — Karriera" },
      { name: "description", content: "Créez votre profil professionnel sur Karriera." },
    ],
  }),
  component: ProfessionalRegistrationPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Nom complet requis").max(120),
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  profession: z.string().trim().min(2, "Métier requis").max(120),
  company: z.string().trim().max(160),
});

function ProfessionalRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", profession: "", company: "" });
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Vérifiez les informations.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.fullName,
          account_type: "professional",
          profession: parsed.data.profession,
          company: parsed.data.company || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setPendingEmail(true);
      return;
    }
    navigate({ to: "/tableau-de-bord", replace: true });
  }

  if (pendingEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-10">
        <Card className="w-full max-w-md panel shadow-elegant">
          <CardContent className="space-y-5 p-8 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-primary">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="text-2xl font-semibold">Vérifiez votre e-mail</h1>
            <p className="text-sm text-muted-foreground">Un lien de confirmation a été envoyé à <strong>{form.email}</strong>.</p>
            <Button variant="outline" className="w-full" onClick={() => setPendingEmail(false)}>Retour au formulaire</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero px-4 py-8 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden space-y-7 lg:block">
          <Link to="/" className="inline-flex items-center gap-3 text-lg font-semibold">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-primary font-bold">K</span>
            Karriera
          </Link>
          <div className="max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-sm">
              <Sparkles className="size-4" /> Profil professionnel
            </div>
            <h1 className="text-5xl font-semibold leading-tight">Un profil qui travaille pour <span className="text-gradient">votre carrière.</span></h1>
            <p className="text-lg text-muted-foreground">Présentez votre métier, vos compétences et vos objectifs. Karriera pourra ensuite personnaliser votre recherche d'emploi et vos outils de candidature.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Métier", "Positionnement précis"],
                ["Profil", "Informations utiles"],
                ["IA", "Recommandations ciblées"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-border bg-surface/75 p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="panel mx-auto w-full max-w-lg shadow-elegant">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-7 lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2 font-semibold"><span className="grid size-9 place-items-center rounded-lg bg-gradient-primary font-bold">K</span>Karriera</Link>
            </div>
            <div className="mb-7 space-y-2">
              <div className="mb-3 grid size-11 place-items-center rounded-xl bg-accent"><BriefcaseBusiness className="size-5" /></div>
              <h2 className="text-2xl font-semibold">Créer un profil professionnel</h2>
              <p className="text-sm text-muted-foreground">Quelques informations pour démarrer votre espace candidat.</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="pro-name">Nom complet</Label><Input id="pro-name" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" required /></div>
              <div className="space-y-2"><Label htmlFor="pro-email">E-mail professionnel</Label><Input id="pro-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="pro-profession">Métier / fonction</Label><Input id="pro-profession" placeholder="Ex. Automaticien" value={form.profession} onChange={(e) => update("profession", e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="pro-company">Entreprise</Label><Input id="pro-company" placeholder="Optionnel" value={form.company} onChange={(e) => update("company", e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="pro-password">Mot de passe</Label><Input id="pro-password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" required /><p className="text-xs text-muted-foreground">8 caractères minimum.</p></div>
              <Button type="submit" className="group w-full" disabled={loading}>{loading ? "Création…" : "Créer mon profil"}<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" /></Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">Déjà inscrit ? <Link to="/auth" className="font-medium text-foreground hover:underline">Se connecter</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
