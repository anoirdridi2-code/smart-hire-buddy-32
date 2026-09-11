import { motion } from "framer-motion";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Upload, CheckCircle2, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCvs, useDocuments, useRefresh } from "@/lib/queries";
import { analyzeCvFn, generateDocFn } from "@/lib/career.functions";
import { DOC_TYPES, LANGUAGES, type CvAnalysis, type DocLanguage, type DocType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cv")({
  head: () => ({ meta: [
    { title: "Analyse de CV par IA — Karriera" },
    { name: "description", content: "Analyse ATS, compétences, recommandations et documents générés par l'IA." },
  ]}),
  component: CvPage,
});

async function extractText(file: File): Promise<{ text: string; dataUrl?: string }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return { text: result.value };
  }
  if (name.endsWith(".txt")) return { text: await file.text() };
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
  return { text: "", dataUrl };
}

function CvPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState<DocType>("cover_letter");
  const [language, setLanguage] = useState<DocLanguage>("fr");
  const [generating, setGenerating] = useState(false);
  const { data: cvs } = useCvs();
  const { data: documents } = useDocuments();
  const refresh = useRefresh();
  const analyze = useServerFn(analyzeCvFn);
  const generate = useServerFn(generateDocFn);
  const cv = cvs?.[0] ?? null;
  const analysis = (cv?.analysis ?? null) as CvAnalysis | null;

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error("Fichier trop volumineux (10 Mo max)."); return; }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("cvs").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);
      const { text, dataUrl } = await extractText(file);
      const { data: row, error } = await supabase.from("cvs").insert({ user_id: uid, file_name: file.name, file_path: path, raw_text: text || null }).select("id").single();
      if (error) throw new Error(error.message);
      toast.info("CV importé. Analyse IA en cours…");
      await analyze({ data: { cvId: row.id, text: text || undefined, fileDataUrl: text ? undefined : dataUrl } });
      refresh(["cvs"]); toast.success("Analyse terminée !");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  async function handleGenerate() {
    if (!cv) return;
    setGenerating(true);
    try { await generate({ data: { cvId: cv.id, jobId: null, docType, language } }); refresh(["documents"]); toast.success("Document généré."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Génération impossible."); }
    finally { setGenerating(false); }
  }

  return (
    <AppShell title="Mon CV" description="Transformez votre CV en véritable outil de candidature.">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
        <Card className="panel overflow-hidden">
          <CardContent className="p-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Sparkles className="size-3.5" /> CV Intelligence</div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Analysez. Optimisez. Postulez.</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Importez votre CV et obtenez une lecture ATS, vos forces, les mots-clés manquants et des recommandations concrètes.</p>
                </div>
                {analysis && <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-3xl border border-success/20 bg-success/10"><span className="text-2xl font-black text-success">{analysis.global_score}</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">score</span></div>}
              </div>
            </div>
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }} className="m-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Upload className="size-6" /></div>
              <p className="mt-4 font-semibold">Déposez votre CV ici</p>
              <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX ou TXT — 10 Mo max</p>
              <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />
              <Button className="mt-4 rounded-full bg-gradient-primary px-6 shadow-glow" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}{busy ? "Analyse en cours…" : "Choisir un fichier"}</Button>
              {cv && <p className="mt-3 text-xs text-muted-foreground">Dernier CV : {cv.file_name}</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {analysis && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .08 }} className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="panel lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4 text-primary" /> Votre profil analysé</CardTitle></CardHeader><CardContent className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">{analysis.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">{[["Score global", analysis.global_score], ["ATS", analysis.ats_score], ["Lisibilité", analysis.readability_score]].map(([label, val]) => <div key={label as string} className="rounded-2xl border border-border/70 bg-secondary/30 p-4"><div className="flex justify-between text-xs text-muted-foreground"><span>{label as string}</span><b className="text-foreground">{val as number}</b></div><Progress value={val as number} className="mt-3" /></div>)}</div>
          <Section title="Compétences détectées" items={analysis.skills} /><Section title="Technologies" items={analysis.technologies} /><Section title="Langues" items={analysis.languages} /><Section title="Mots-clés manquants" items={analysis.missing_keywords} tone="destructive" />
          {analysis.improvements?.length > 0 && <div><h3 className="mb-3 text-sm font-semibold">Recommandations prioritaires</h3><div className="space-y-2">{analysis.improvements.map((imp, i) => <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .05 }} className="rounded-2xl border border-border/70 p-4"><div className="flex items-center gap-2"><Badge variant={imp.priority === "haute" ? "destructive" : "secondary"}>{imp.priority}</Badge><span className="text-sm font-medium">{imp.title}</span></div><p className="mt-1 text-sm text-muted-foreground">{imp.detail}</p></motion.div>)}</div></div>}
        </CardContent></Card>

        <Card className="panel h-fit"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" /> Créer avec l'IA</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={docType} onValueChange={(v) => setDocType(v as DocType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select><Select value={language} onValueChange={(v) => setLanguage(v as DocLanguage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(LANGUAGES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select><Button className="w-full rounded-xl bg-gradient-primary" onClick={handleGenerate} disabled={generating}>{generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Générer</Button><div className="space-y-3 pt-2">{(documents ?? []).slice(0, 5).map((d) => <details key={d.id} className="rounded-xl border border-border/70 p-3"><summary className="cursor-pointer text-sm font-medium">{DOC_TYPES[d.doc_type as DocType]} · {LANGUAGES[d.language as DocLanguage]}</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{d.content}</pre></details>)}</div></CardContent></Card>
      </motion.div>}
    </AppShell>
  );
}

function Section({ title, items, tone }: { title: string; items?: string[]; tone?: "destructive" }) {
  if (!items || items.length === 0) return null;
  return <div><h3 className="mb-2 text-sm font-semibold">{title}</h3><div className="flex flex-wrap gap-2">{items.map((s) => <Badge key={s} variant={tone === "destructive" ? "destructive" : "secondary"}>{s}</Badge>)}</div></div>;
}
