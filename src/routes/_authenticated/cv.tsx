import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Upload } from "lucide-react";
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
  head: () => ({
    meta: [
      { title: "Analyse de CV par IA — Karriera" },
      {
        name: "description",
        content:
          "Importez votre CV PDF ou Word et obtenez un score ATS, les mots-clés manquants et des documents générés par l'IA.",
      },
      { property: "og:title", content: "Analyse de CV par IA — Karriera" },
      {
        property: "og:description",
        content: "Score ATS, compétences détectées et lettre de motivation générée automatiquement.",
      },
    ],
  }),
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
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (10 Mo max).");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("cvs").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      const { text, dataUrl } = await extractText(file);

      const { data: row, error } = await supabase
        .from("cvs")
        .insert({ user_id: uid, file_name: file.name, file_path: path, raw_text: text || null })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      toast.info("CV importé. Analyse IA en cours…");
      await analyze({
        data: { cvId: row.id, text: text || undefined, fileDataUrl: text ? undefined : dataUrl },
      });
      refresh(["cvs"]);
      toast.success("Analyse terminée !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!cv) return;
    setGenerating(true);
    try {
      await generate({ data: { cvId: cv.id, jobId: null, docType, language } });
      refresh(["documents"]);
      toast.success("Document généré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell title="Mon CV" description="Import, analyse ATS et documents générés">
      <Card className="panel">
        <CardContent className="p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center"
          >
            <Upload className="mb-3 size-8 text-primary" />
            <p className="font-medium">Déposez votre CV ici</p>
            <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX ou TXT — 10 Mo max</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <Button className="mt-4" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {busy ? "Analyse en cours…" : "Choisir un fichier"}
            </Button>
            {cv && <p className="mt-3 text-xs text-muted-foreground">Dernier CV : {cv.file_name}</p>}
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="panel lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-base">Synthèse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Score global", analysis.global_score],
                  ["ATS", analysis.ats_score],
                  ["Lisibilité", analysis.readability_score],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{label as string}</span>
                      <span>{val as number}/100</span>
                    </div>
                    <Progress value={val as number} className="mt-1.5" />
                  </div>
                ))}
              </div>

              <Section title="Compétences détectées" items={analysis.skills} />
              <Section title="Technologies" items={analysis.technologies} />
              <Section title="Langues" items={analysis.languages} />
              <Section title="Mots-clés manquants" items={analysis.missing_keywords} tone="destructive" />

              {analysis.improvements?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Améliorations proposées</h3>
                  <ul className="space-y-2">
                    {analysis.improvements.map((imp, i) => (
                      <li key={i} className="rounded-lg border border-border/70 p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={imp.priority === "haute" ? "destructive" : "secondary"}>
                            {imp.priority}
                          </Badge>
                          <span className="text-sm font-medium">{imp.title}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{imp.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.country_advice?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Conseils par pays</h3>
                  <ul className="space-y-2">
                    {analysis.country_advice.map((c, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{c.country} :</strong> {c.advice}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel h-fit">
            <CardHeader>
              <CardTitle className="font-display text-base">Générer un document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={(v) => setLanguage(v as DocLanguage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Générer
              </Button>

              <div className="space-y-3 pt-2">
                {(documents ?? []).slice(0, 5).map((d) => (
                  <details key={d.id} className="rounded-lg border border-border/70 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {DOC_TYPES[d.doc_type as DocType]} · {LANGUAGES[d.language as DocLanguage]}
                    </summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {d.content}
                    </pre>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Section({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone?: "destructive";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <Badge key={s} variant={tone === "destructive" ? "destructive" : "secondary"}>
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
