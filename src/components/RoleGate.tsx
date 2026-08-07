import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { claimRoleFn } from "@/lib/career.functions";
import { useRefresh, useRole } from "@/lib/queries";

const OPTIONS = [
  {
    value: "candidate" as const,
    label: "Je cherche un emploi",
    description: "Analyse de CV, matching IA, agent de veille et suivi des candidatures.",
    icon: UserRound,
  },
  {
    value: "recruiter" as const,
    label: "Je recrute",
    description: "Publication d'offres assistée par IA, classement des candidats et pipeline.",
    icon: Building2,
  },
];

export function RoleGate({ children }: { children: ReactNode }) {
  const { data: role, isPending } = useRole();
  const [busy, setBusy] = useState<string | null>(null);
  const claim = useServerFn(claimRoleFn);
  const refresh = useRefresh();

  async function choose(value: "candidate" | "recruiter") {
    setBusy(value);
    try {
      await claim({ data: { role: value } });
      refresh(["role"]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'enregistrer votre choix.");
    } finally {
      setBusy(null);
    }
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (role) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
      <div className="w-full max-w-3xl">
        <h1 className="text-center font-display text-2xl font-semibold sm:text-3xl">
          Comment allez-vous utiliser Karriera ?
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Vous pourrez ajouter l'autre espace plus tard depuis votre profil.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <Card key={option.value} className="panel">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <option.icon className="size-7 text-primary" />
                <h2 className="font-display text-lg font-semibold">{option.label}</h2>
                <p className="text-sm text-muted-foreground">{option.description}</p>
                <Button
                  className="mt-auto"
                  onClick={() => void choose(option.value)}
                  disabled={busy !== null}
                >
                  {busy === option.value ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Continuer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
