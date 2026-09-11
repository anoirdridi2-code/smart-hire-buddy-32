import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchLiveJobsFn, searchPlanFn } from "@/lib/career.functions";

type Plan = { queries?: Array<{ label?: string; query?: string; location?: string; language?: string }> };

export function GlobalJobSearch({ onImported }: { onImported: () => void }) {
  const searchPlan = useServerFn(searchPlanFn);
  const fetchLive = useServerFn(fetchLiveJobsFn);
  const [open, setOpen] = useState(false);
  const [profession, setProfession] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function searchWorldwide() {
    const wish = profession.trim();
    if (wish.length < 2) {
      toast.error("Saisissez un métier ou une spécialité.");
      return;
    }
    setLoading(true);
    setStatus("L'IA prépare les intitulés internationaux…");
    try {
      const plan = (await searchPlan({ data: { wish: location.trim() ? `${wish}, ${location.trim()}` : wish } })) as Plan;
      const queries = (plan?.queries ?? [])
        .map((q) => String(q.query ?? "").trim())
        .filter(Boolean)
        .slice(0, 6);
      const searchQueries = queries.length > 0 ? queries : [wish];
      let imported = 0;
      for (const query of searchQueries) {
        setStatus(`Recherche mondiale : ${query}`);
        const result = await fetchLive({ data: { query } });
        imported += result.imported ?? 0;
      }
      onImported();
      setStatus("");
      toast.success(imported > 0 ? `${imported} nouvelles offres trouvées.` : "Recherche terminée : les offres sont à jour.");
      setOpen(false);
    } catch (e) {
      setStatus("");
      toast.error(e instanceof Error ? e.message : "Recherche mondiale impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Globe className="mr-2 size-4" />Recherche mondiale</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />Recherche mondiale par IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="global-profession">Quel métier recherchez-vous ?</Label>
            <Input
              id="global-profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="Automaticien, Serveur, Technicien maintenance…"
              maxLength={120}
              onKeyDown={(e) => { if (e.key === "Enter") void searchWorldwide(); }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="global-location">Pays / localisation (optionnel)</Label>
            <Input
              id="global-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Monde entier, France, Allemagne, Canada…"
              maxLength={100}
            />
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            L'IA transforme votre métier en plusieurs intitulés internationaux, puis Karriera récupère les offres réelles et affiche les résultats directement dans votre espace Offres. Le CV n'est pas nécessaire pour lancer la recherche.
          </div>
          {status && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{status}</div>}
          <Button className="w-full" size="lg" onClick={() => void searchWorldwide()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {loading ? "Recherche en cours…" : "Lancer la recherche mondiale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
