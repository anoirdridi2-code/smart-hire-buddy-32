import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Globe, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JOB_SITES } from "@/lib/job-sites";
import { importJobsBulkFn, searchPlanFn } from "@/lib/career.functions";

type PlanQuery = { label: string; query: string; location: string; language: string };
type Plan = { queries: PlanQuery[]; keywords: string[]; advice: string[] };

export function GlobalJobSearch({ onImported }: { onImported: () => void }) {
  const searchPlan = useServerFn(searchPlanFn);
  const importBulk = useServerFn(importJobsBulkFn);

  const [open, setOpen] = useState(false);
  const [wish, setWish] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const result = (await searchPlan({ data: { wish: wish.trim() } })) as Plan;
      const queries = Array.isArray(result?.queries) ? result.queries : [];
      if (queries.length === 0) throw new Error("Aucune recherche générée.");
      setPlan({ ...result, queries });
      setSelected(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function bulkImport() {
    setImporting(true);
    try {
      const { imported } = await importBulk({ data: { raw: raw.trim() } });
      setRaw("");
      onImported();
      toast.success(`${imported} offre(s) importée(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  const active = plan?.queries[selected] ?? null;
  const scopes = Array.from(new Set(JOB_SITES.map((s) => s.scope)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Globe className="mr-2 size-4" />
          Recherche mondiale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recherche d'offres sur les grands sites</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search">
          <TabsList className="w-full">
            <TabsTrigger value="search" className="flex-1">
              Recherches intelligentes
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1">
              Import multiple
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="wish">Ce que vous cherchez (optionnel)</Label>
              <div className="flex gap-2">
                <Input
                  id="wish"
                  value={wish}
                  onChange={(event) => setWish(event.target.value)}
                  placeholder="Ingénieur mécanique, Allemagne, CDI"
                  maxLength={300}
                />
                <Button onClick={() => void generate()} disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Générer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                L'IA lit votre profil et votre CV pour composer les meilleures recherches, puis
                ouvre chaque site avec les bons mots-clés.
              </p>
            </div>

            {plan && active && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {plan.queries.map((q, index) => (
                    <Button
                      key={`${q.query}-${index}`}
                      size="sm"
                      variant={index === selected ? "default" : "outline"}
                      onClick={() => setSelected(index)}
                    >
                      {q.label || q.query}
                    </Button>
                  ))}
                </div>

                <div className="rounded-lg border border-border/70 p-3 text-sm">
                  <p className="font-medium">{active.query}</p>
                  <p className="text-muted-foreground">
                    {active.location || "Tous lieux"} · {(active.language || "fr").toUpperCase()}
                  </p>
                </div>

                {scopes.map((scope) => (
                  <div key={scope} className="space-y-2">
                    <p className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {scope}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {JOB_SITES.filter((s) => s.scope === scope).map((site) => (
                        <a
                          key={site.id}
                          href={site.build(active.query, active.location)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline">
                            {site.name}
                            <ExternalLink className="ml-2 size-3.5" />
                          </Button>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}

                {plan.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {plan.keywords.slice(0, 20).map((k) => (
                      <Badge key={k} variant="secondary">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}

                {plan.advice?.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {plan.advice.slice(0, 6).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Copiez plusieurs annonces d'un coup depuis LinkedIn, Indeed, TanitJobs… L'IA les
              découpe, les structure et les ajoute à votre liste.
            </p>
            <Textarea
              rows={12}
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder="Collez ici plusieurs annonces à la suite…"
              maxLength={30000}
            />
            <Button
              className="w-full"
              onClick={() => void bulkImport()}
              disabled={importing || raw.trim().length < 60}
            >
              {importing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Importer les offres
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
