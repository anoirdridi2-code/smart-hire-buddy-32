import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BriefcaseBusiness, FileText, MessagesSquare, Sparkles, Target, Mic } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karriera — Votre copilote emploi propulsé par l'IA" },
      {
        name: "description",
        content:
          "Analysez votre CV, obtenez un score ATS, trouvez les offres les plus compatibles et générez lettres et e-mails en FR, EN et DE.",
      },
      { property: "og:title", content: "Karriera — Votre copilote emploi propulsé par l'IA" },
      {
        property: "og:description",
        content: "Analyse de CV, matching IA, documents générés et suivi des candidatures.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: FileText, title: "Analyse de CV", text: "Compétences, diplômes, langues et score ATS détaillé." },
  { icon: Sparkles, title: "Documents générés", text: "CV optimisé, lettre et e-mail en français, anglais ou allemand." },
  { icon: Target, title: "Matching IA", text: "Un score de compatibilité offre par offre, avec les points manquants." },
  { icon: BriefcaseBusiness, title: "Offres multi-pays", text: "Tunisie, France, Allemagne, Canada et Golfe." },
  { icon: MessagesSquare, title: "Coach carrière", text: "Préparez vos entretiens et négociez votre salaire." },
  { icon: Mic, title: "Simulation d'entretien", text: "Questions techniques et RH, avec évaluation notée." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-primary-foreground">
            K
          </span>
          <span className="font-display text-xl font-semibold">Karriera</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Se connecter</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-20">
        <p className="mb-4 inline-flex rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
          Analyse de CV · Matching · Candidatures
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
          Votre copilote emploi propulsé par l'IA
        </h1>
        <p className="mt-5 text-base text-muted-foreground sm:text-lg">
          Importez votre CV, obtenez un score ATS, découvrez les offres où vous avez le plus de
          chances et générez vos lettres de motivation en quelques secondes.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/auth">Créer mon compte gratuitement</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="mb-3 size-6 text-primary" />
              <h2 className="font-display text-lg font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
