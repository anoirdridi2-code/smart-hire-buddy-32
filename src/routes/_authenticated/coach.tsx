import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCvs } from "@/lib/queries";
import { coachFn } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Coach carrière IA — Karriera" },
      {
        name: "description",
        content:
          "Discutez avec un coach IA pour préparer vos entretiens, négocier votre salaire et cibler les bons postes.",
      },
      { property: "og:title", content: "Coach carrière IA — Karriera" },
      {
        property: "og:description",
        content: "Un coach disponible 24/7 qui connaît votre CV et vos objectifs.",
      },
    ],
  }),
  component: CoachPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis votre coach carrière. Posez-moi une question sur votre CV, un entretien à préparer ou une négociation de salaire.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: cvs } = useCvs();
  const coach = useServerFn(coachFn);

  async function send() {
    const text = input.trim();
    if (!text) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await coach({
        data: { messages: next.slice(-20), cvId: cvs?.[0]?.id ?? null },
      });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le coach est indisponible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Coach IA" description="Préparation entretien, salaire, stratégie">
      <Card className="panel">
        <CardContent className="space-y-4 p-4">
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm"
                }
              >
                {m.content}
              </div>
            ))}
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={input}
              maxLength={4000}
              placeholder="Votre question…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button onClick={send} disabled={loading}>
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
