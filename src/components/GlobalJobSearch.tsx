import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe2, Loader2, MapPin, Search, Sparkles } from "lucide-react";
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
    setStatus("L’IA prépare les intitulés internationaux…");
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
        <Button className="border-slate-200 bg-white text-slate-900 shadow-sm hover:border-indigo-300 hover:bg-indigo-50">
          <Globe2 className="mr-2 size-4 text-indigo-600" />Recherche mondiale IA
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-xl">
        <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-950">
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm"><Sparkles className="size-5" /></span>
              Recherche mondiale par IA
            </DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm leading-6 text-slate-600">Décrivez uniquement le métier que vous recherchez. Karriera transforme votre demande en requêtes internationales et ramène les offres réelles dans votre espace.</p>
        </div>
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="global-profession" className="text-slate-900">Quel métier recherchez-vous ?</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input id="global-profession" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Automaticien, Serveur, Technicien maintenance…" className="h-12 border-slate-200 bg-white pl-10 text-slate-950 shadow-sm focus-visible:ring-indigo-500" maxLength={120} onKeyDown={(e) => { if (e.key === "Enter") void searchWorldwide(); }} autoFocus />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="global-location" className="text-slate-900">Pays / localisation <span className="font-normal text-slate-400">(optionnel)</span></Label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input id="global-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Monde entier, France, Allemagne, Canada…" className="h-12 border-slate-200 bg-white pl-10 text-slate-950 shadow-sm focus-visible:ring-indigo-500" maxLength={100} />
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-slate-600">
            <div className="mb-1 flex items-center gap-2 font-semibold text-indigo-700"><Globe2 className="size-4" />Recherche orientée métier</div>
            Le CV n’est pas nécessaire. Le métier reste le critère principal et le pays reste un filtre indépendant.
          </div>
          {status && <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600"><Loader2 className="size-4 animate-spin text-indigo-600" />{status}</div>}
          <Button className="h-12 w-full rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" size="lg" onClick={() => void searchWorldwide()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {loading ? "Recherche en cours…" : "Lancer la recherche mondiale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
