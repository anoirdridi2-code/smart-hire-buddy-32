import { createFileRoute } from "@tanstack/react-router";
import { SkillAssessment } from "@/components/SkillAssessment";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/evaluation")({
  head: () => ({
    meta: [
      { title: "Évaluation des compétences — Karriera" },
      {
        name: "description",
        content: "Évaluez vos compétences avec une simulation de test assistée par l'IA.",
      },
    ],
  }),
  component: EvaluationPage,
});

function EvaluationPage() {
  return (
    <AppShell
      title="Évaluation des compétences"
      description="Testez votre niveau et identifiez vos axes de progression"
    >
      <div className="mx-auto max-w-4xl">
        <SkillAssessment />
      </div>
    </AppShell>
  );
}
