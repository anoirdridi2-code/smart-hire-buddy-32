import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCvs } from "@/lib/queries";
import { MicButton, SpeakButton } from "@/components/VoiceControls";
import { AiAvatar } from "@/components/AiAvatar";

import { evaluateAnswerFn, interviewFn } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/entretien")({
  head: () => ({
    meta: [
      { title: "Simulation d'entretien — Karriera" },
      {
        name: "description",
        content:
          "Générez des questions techniques et RH adaptées à votre profil, répondez et recevez un score détaillé.",
      },
      { property: "og:title", content: "Simulation d'entretien — Karriera" },
      {
        property: "og:description",
        content: "Entraînez-vous avec des questions personnalisées et un feedback IA.",
      },
    ],
  }),
  component: InterviewPage,
});

function InterviewPage() {
  const { data: cvs } = useCvs();
  const [questions, setQuestions] = useState<{ technical: string[]; hr: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string; improved_answer: string } | null>(

    null,
  );

  const generate = useServerFn(interviewFn);
  const evaluate = useServerFn(evaluateAnswerFn);

  async function load() {
    setLoading(true);
    try {
      setQuestions(await generate({ data: { cvId: cvs?.[0]?.id ?? null, jobId: null } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!active || answer.trim().length < 5) return;
    setEvaluating(true);
    try {
      setResult(await evaluate({ data: { question: active, answer: answer.trim() } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Évaluation impossible.");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <AppShell title="Entretien" description="Questions personnalisées et feedback IA">
      <Button onClick={load} disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
        Générer mes questions
      </Button>

      {questions && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {([
            ["Questions techniques", questions.technical],
            ["Questions RH", questions.hr],
          ] as const).map(([title, list]) => (
            <Card key={title} className="panel">
              <CardHeader>
                <CardTitle className="font-display text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setActive(q);
                      setAnswer("");
                      setResult(null);
                    }}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      active === q ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {active && (
        <Card className="panel mt-6">
          <CardHeader>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <AiAvatar speaking={speaking} />
              <div className="flex flex-1 items-start justify-between gap-2">
                <CardTitle className="font-display text-base">{active}</CardTitle>
                <SpeakButton key={active} text={active} autoPlay onSpeakingChange={setSpeaking} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            <Textarea
              rows={6}
              value={answer}
              maxLength={8000}
              placeholder="Votre réponse…"
              onChange={(e) => setAnswer(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <MicButton
                disabled={evaluating}
                onText={(text) => setAnswer((prev) => (prev ? `${prev} ${text}` : text))}
              />
              <span className="text-xs text-muted-foreground">Répondez à l'oral ou à l'écrit</span>
            </div>
            <Button onClick={submit} disabled={evaluating}>
              {evaluating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Évaluer ma réponse
            </Button>
            {result && (
              <div className="space-y-2 rounded-lg border border-border/70 p-4">
                <Badge variant={result.score >= 70 ? "default" : "secondary"}>{result.score}/100</Badge>
                <div className="flex items-start gap-1">
                  <p className="text-sm text-muted-foreground">{result.feedback}</p>
                  <SpeakButton text={result.feedback} />
                </div>
                <p className="whitespace-pre-wrap text-sm">
                  <strong>Version améliorée :</strong> {result.improved_answer}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
