import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  analyzeCv,
  coachReply,
  evaluateAnswer,
  generateDocument,
  interviewQuestions,
  matchCvToJob,
  parseJobPosting,
} from "./career.server";
import type { CvAnalysis, ProfileInput } from "./types";

export const analyzeCvFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cvId: z.string().uuid(),
        text: z.string().max(200000).optional(),
        fileDataUrl: z.string().max(20000000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cv, error } = await supabase
      .from("cvs")
      .select("id, file_name, raw_text")
      .eq("id", data.cvId)
      .single();
    if (error || !cv) throw new Error("CV introuvable.");

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, domain, experience_years, countries, city, desired_salary, languages, contract_type",
      )
      .eq("id", userId)
      .maybeSingle();

    const analysis = await analyzeCv({
      text: data.text ?? cv.raw_text ?? "",
      fileName: cv.file_name,
      fileDataUrl: data.fileDataUrl,
      profile: (profile ?? null) as ProfileInput | null,
    });

    const { error: updateError } = await supabase
      .from("cvs")
      .update({
        raw_text: data.text ?? cv.raw_text ?? analysis.summary,
        analysis,
        global_score: Math.round(analysis.global_score ?? 0),
        ats_score: Math.round(analysis.ats_score ?? 0),
        readability_score: Math.round(analysis.readability_score ?? 0),
      })
      .eq("id", data.cvId);
    if (updateError) throw new Error(updateError.message);

    return { analysis };
  });

export const matchJobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cvId: z.string().uuid(), jobId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: cv }, { data: job }] = await Promise.all([
      supabase.from("cvs").select("id, raw_text, analysis").eq("id", data.cvId).single(),
      supabase
        .from("jobs")
        .select("id, title, company, description, level, location")
        .eq("id", data.jobId)
        .single(),
    ]);
    if (!cv?.analysis) throw new Error("Analysez d'abord votre CV.");
    if (!job) throw new Error("Offre introuvable.");

    const result = await matchCvToJob({
      analysis: cv.analysis as unknown as CvAnalysis,
      cvText: cv.raw_text ?? "",
      job: { ...job, description: job.description ?? "" },
    });

    await supabase.from("matches").upsert(
      {
        user_id: userId,
        cv_id: data.cvId,
        job_id: data.jobId,
        score: Math.round(result.score ?? 0),
        breakdown: result.breakdown,
        reasoning: result.reasoning,
      },
      { onConflict: "cv_id,job_id" },
    );

    return result;
  });

export const importJobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ raw: z.string().trim().min(40).max(30000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const parsed = await parseJobPosting(data.raw);
    const { data: inserted, error } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        is_demo: false,
        title: parsed.title || "Offre importée",
        company: parsed.company || "Entreprise non précisée",
        location: parsed.location || null,
        country: parsed.country || null,
        salary: parsed.salary || null,
        contract_type: parsed.contract_type || null,
        level: parsed.level || null,
        source: parsed.source || "Import manuel",
        url: parsed.url || null,
        description: parsed.description || data.raw.slice(0, 4000),
        posted_at: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { jobId: inserted.id };
  });

export const generateDocFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cvId: z.string().uuid(),
        jobId: z.string().uuid().nullable().optional(),
        docType: z.enum(["cover_letter", "email", "optimized_cv"]),
        language: z.enum(["fr", "en", "de"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cv } = await supabase
      .from("cvs")
      .select("raw_text, analysis")
      .eq("id", data.cvId)
      .single();
    if (!cv?.analysis) throw new Error("Analysez d'abord votre CV.");

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, domain, experience_years, countries, city, desired_salary, languages, contract_type",
      )
      .eq("id", userId)
      .maybeSingle();

    let job = null;
    if (data.jobId) {
      const { data: jobRow } = await supabase
        .from("jobs")
        .select("title, company, description, location")
        .eq("id", data.jobId)
        .maybeSingle();
      if (jobRow) job = { ...jobRow, description: jobRow.description ?? "" };
    }

    const content = await generateDocument({
      docType: data.docType,
      language: data.language,
      analysis: cv.analysis as unknown as CvAnalysis,
      cvText: cv.raw_text ?? "",
      profile: (profile ?? null) as ProfileInput | null,
      job,
    });

    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        cv_id: data.cvId,
        job_id: data.jobId ?? null,
        doc_type: data.docType,
        language: data.language,
        title: job ? `${job.title} — ${job.company}` : "Version générique",
        content,
      })
      .select("id, content, doc_type, language, title, created_at")
      .single();
    if (error) throw new Error(error.message);
    return doc;
  });

export const coachFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(8000),
            }),
          )
          .min(1)
          .max(40),
        cvId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, domain, experience_years, countries, city, desired_salary, languages, contract_type",
      )
      .eq("id", userId)
      .maybeSingle();

    let analysis: CvAnalysis | null = null;
    if (data.cvId) {
      const { data: cv } = await supabase
        .from("cvs")
        .select("analysis")
        .eq("id", data.cvId)
        .maybeSingle();
      analysis = (cv?.analysis as unknown as CvAnalysis) ?? null;
    }

    const reply = await coachReply({
      history: data.messages,
      analysis,
      profile: (profile ?? null) as ProfileInput | null,
    });
    return { reply };
  });

export const interviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cvId: z.string().uuid().nullable().optional(),
        jobId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, domain, experience_years, countries, city, desired_salary, languages, contract_type",
      )
      .eq("id", userId)
      .maybeSingle();

    let analysis: CvAnalysis | null = null;
    if (data.cvId) {
      const { data: cv } = await supabase
        .from("cvs")
        .select("analysis")
        .eq("id", data.cvId)
        .maybeSingle();
      analysis = (cv?.analysis as unknown as CvAnalysis) ?? null;
    }

    let job = null;
    if (data.jobId) {
      const { data: jobRow } = await supabase
        .from("jobs")
        .select("title, company, description")
        .eq("id", data.jobId)
        .maybeSingle();
      if (jobRow) job = { ...jobRow, description: jobRow.description ?? "" };
    }

    return interviewQuestions({
      analysis,
      job,
      profile: (profile ?? null) as ProfileInput | null,
    });
  });

export const evaluateAnswerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(3).max(2000),
        answer: z.string().trim().min(5).max(8000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => evaluateAnswer(data));
