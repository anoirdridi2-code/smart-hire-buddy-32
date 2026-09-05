import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  analyzeCv,
  anonymizeCvText,
  draftJobPosting,
  missionRelevance,
  rankCandidate,
  translateDocument,
  coachReply,
  evaluateAnswer,
  generateDocument,
  interviewQuestions,
  matchCvToJob,
  parseJobPosting,
} from "./career.server";
import { buildSearchPlan, splitJobPostings } from "./jobsearch.server";
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
        ats_breakdown: analysis.ats_breakdown ?? null,
        prediction: analysis.prediction ?? null,
        learning_plan: analysis.learning_plan ?? null,
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

export const claimRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ role: z.enum(["candidate", "recruiter"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { role: data.role };
  });

export const draftJobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        brief: z.string().trim().min(20).max(8000),
        company: z.string().trim().min(1).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data }) => draftJobPosting(data));

export const publishJobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        jobId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(2).max(160),
        company: z.string().trim().min(1).max(160),
        location: z.string().max(160).optional(),
        country: z.string().max(80).optional(),
        contract_type: z.string().max(60).optional(),
        level: z.string().max(60).optional(),
        remote: z.string().max(40).optional(),
        required_language: z.string().max(80).optional(),
        salary: z.string().max(80).optional(),
        salary_min: z.number().int().min(0).max(10000000).optional(),
        salary_currency: z.string().max(10).optional(),
        experience_min: z.number().int().min(0).max(60).optional(),
        visa_sponsorship: z.boolean().optional(),
        skills: z.array(z.string().max(60)).max(30).optional(),
        description: z.string().trim().min(20).max(20000),
        is_published: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { jobId, ...fields } = data;
    const payload = {
      title: fields.title,
      company: fields.company,
      description: fields.description,
      is_published: fields.is_published,
      location: fields.location ?? null,
      country: fields.country ?? null,
      contract_type: fields.contract_type ?? null,
      level: fields.level ?? null,
      remote: fields.remote ?? null,
      required_language: fields.required_language ?? null,
      salary: fields.salary ?? null,
      salary_min: fields.salary_min ?? null,
      salary_currency: fields.salary_currency ?? null,
      experience_min: fields.experience_min ?? null,
      visa_sponsorship: fields.visa_sponsorship ?? false,
      skills: fields.skills ?? [],
      user_id: userId,
      is_demo: false,
      source: "Espace recruteur",
      posted_at: new Date().toISOString().slice(0, 10),
    };
    if (jobId) {
      const { error } = await supabase
        .from("jobs")
        .update(payload)
        .eq("id", jobId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { jobId };
    }
    const { data: inserted, error } = await supabase
      .from("jobs")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { jobId: inserted.id };
  });

export const rankApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ applicationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: application, error } = await supabase
      .from("applications")
      .select("id, user_id, cv_id, job_id, jobs(id, user_id, title, company, description, skills, level)")
      .eq("id", data.applicationId)
      .single();
    if (error || !application) throw new Error("Candidature introuvable.");
    const job = application.jobs as unknown as {
      user_id: string;
      title: string;
      company: string;
      description: string | null;
      skills: string[] | null;
      level: string | null;
    } | null;
    if (!job || job.user_id !== userId) throw new Error("Accès refusé.");

    let cvText = "";
    let analysis: CvAnalysis | null = null;
    if (application.cv_id) {
      const { data: cv } = await supabase
        .from("cvs")
        .select("raw_text, analysis")
        .eq("id", application.cv_id)
        .maybeSingle();
      cvText = cv?.raw_text ?? "";
      analysis = (cv?.analysis as unknown as CvAnalysis) ?? null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, domain, experience_years, countries, city, desired_salary, languages, contract_type",
      )
      .eq("id", application.user_id)
      .maybeSingle();

    const ranking = await rankCandidate({
      job: { ...job, description: job.description ?? "" },
      cvText,
      analysis,
      profile: (profile ?? null) as ProfileInput | null,
    });

    await supabase
      .from("applications")
      .update({
        match_score: Math.round(ranking.score ?? 0),
        match_breakdown: ranking.breakdown,
        match_reasoning: ranking.summary,
      })
      .eq("id", data.applicationId);

    return ranking;
  });

export const runAgentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ missionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mission, error } = await supabase
      .from("agent_missions")
      .select("*")
      .eq("id", data.missionId)
      .eq("user_id", userId)
      .single();
    if (error || !mission) throw new Error("Mission introuvable.");

    let analysis: CvAnalysis | null = null;
    if (mission.cv_id) {
      const { data: cv } = await supabase
        .from("cvs")
        .select("analysis")
        .eq("id", mission.cv_id)
        .maybeSingle();
      analysis = (cv?.analysis as unknown as CvAnalysis) ?? null;
    }

    const { data: existing } = await supabase
      .from("agent_alerts")
      .select("job_id")
      .eq("mission_id", mission.id);
    const seen = new Set((existing ?? []).map((a) => a.job_id));

    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, company, location, country, description")
      .order("posted_at", { ascending: false })
      .limit(40);

    const candidates = (jobs ?? []).filter((j) => !seen.has(j.id)).slice(0, 10);
    let created = 0;

    for (const job of candidates) {
      const result = await missionRelevance({
        mission: {
          title: mission.title,
          target_role: mission.target_role,
          countries: mission.countries ?? [],
          cities: mission.cities ?? [],
          remote_only: mission.remote_only,
          visa_required: mission.visa_required,
          salary_min: mission.salary_min,
          languages: mission.languages ?? [],
          contract_type: mission.contract_type,
        },
        job: { ...job, description: job.description ?? "" },
        analysis,
      });
      const score = Math.round(result.score ?? 0);
      if (score >= (mission.min_score ?? 80)) {
        const { error: insertError } = await supabase.from("agent_alerts").insert({
          user_id: userId,
          mission_id: mission.id,
          job_id: job.id,
          score,
          message: result.message,
        });
        if (!insertError) created += 1;
      }
    }

    await supabase
      .from("agent_missions")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", mission.id);

    return { scanned: candidates.length, created };
  });

export const translateDocFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ documentId: z.string().uuid(), language: z.enum(["fr", "en", "de"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc } = await supabase
      .from("documents")
      .select("cv_id, job_id, doc_type, title, content")
      .eq("id", data.documentId)
      .maybeSingle();
    if (!doc) throw new Error("Document introuvable.");

    const content = await translateDocument({ content: doc.content, language: data.language });
    const { data: created, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        cv_id: doc.cv_id,
        job_id: doc.job_id,
        doc_type: doc.doc_type,
        language: data.language,
        title: doc.title,
        content,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const anonymizeCvFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ cvId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cv } = await supabase
      .from("cvs")
      .select("file_name, raw_text, analysis, global_score, ats_score, readability_score")
      .eq("id", data.cvId)
      .maybeSingle();
    if (!cv?.raw_text) throw new Error("Ce CV n'a pas de texte exploitable.");

    const content = await anonymizeCvText({ cvText: cv.raw_text });
    const { data: created, error } = await supabase
      .from("cvs")
      .insert({
        user_id: userId,
        file_name: `Anonyme — ${cv.file_name}`,
        label: "CV anonyme",
        raw_text: content,
        analysis: cv.analysis,
        global_score: cv.global_score,
        ats_score: cv.ats_score,
        readability_score: cv.readability_score,
        is_anonymous: true,
        source_cv_id: data.cvId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const searchPlanFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ wish: z.string().max(300).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: cv }] = await Promise.all([
      supabase
        .from("profiles")
        .select("domain, experience_years, countries, city, desired_salary, languages, contract_type")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("cvs")
        .select("raw_text")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return buildSearchPlan({
      profileText: JSON.stringify(profile ?? {}),
      cvText: cv?.raw_text ?? "",
      wish: data.wish ?? "",
    });
  });

export const importJobsBulkFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ raw: z.string().trim().min(60).max(30000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const jobs = await splitJobPostings(data.raw);
    if (jobs.length === 0) throw new Error("Aucune offre détectée dans ce texte.");

    const rows = jobs.map((parsed) => ({
      user_id: userId,
      is_demo: false,
      title: parsed.title || "Offre importée",
      company: parsed.company || "Entreprise non précisée",
      location: parsed.location || null,
      country: parsed.country || null,
      salary: parsed.salary || null,
      contract_type: parsed.contract_type || null,
      level: parsed.level || null,
      source: parsed.source || "Import multiple",
      url: parsed.url || null,
      description: parsed.description || "",
      posted_at: new Date().toISOString().slice(0, 10),
    }));

    const { error } = await supabase.from("jobs").insert(rows);
    if (error) throw new Error(error.message);
    return { imported: rows.length };
  });
