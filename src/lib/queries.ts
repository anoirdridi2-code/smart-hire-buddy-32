import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, AtsBreakdown, CvAnalysis, LearningPlan, Prediction } from "@/lib/types";

export type CvRow = { id: string; file_name: string; file_path: string | null; raw_text: string | null; analysis: CvAnalysis | null; global_score: number | null; ats_score: number | null; readability_score: number | null; label: string | null; is_primary: boolean; language: string; is_anonymous: boolean; ats_breakdown: AtsBreakdown | null; prediction: Prediction | null; learning_plan: LearningPlan | null; created_at: string };
export type JobRow = { id: string; is_demo: boolean; title: string; company: string; location: string | null; country: string | null; salary: string | null; contract_type: string | null; level: string | null; source: string | null; url: string | null; description: string | null; posted_at: string | null; remote: string | null; visa_sponsorship: boolean; required_language: string | null; salary_min: number | null; salary_currency: string | null; skills: string[]; experience_min: number | null; is_published: boolean; user_id: string | null };

const INDUSTRIAL_PROFILE = ["industrie", "industrial", "electricite", "electrical", "automatisme", "automation", "maintenance", "electrotechnique", "electrotechnics", "electromecanique", "electromechanical", "instrumentation", "robotique", "robotics", "plc", "scada", "controls"];
const INDUSTRIAL_JOB = ["automaticien", "automation", "automatisierung", "plc", "sps", "scada", "control engineer", "controls", "electrical engineer", "electrical technician", "electrician", "electrical maintenance", "electrotechnician", "electrotechnicien", "electrotechnics", "electromechanical", "electromecanique", "instrumentation", "maintenance technician", "maintenance engineer", "industrial maintenance", "technicien maintenance", "technicien electricite", "ingenieur maintenance", "ingenieur automatisme", "ingenieur electrique", "technicien electromecanique", "technicien instrumentation", "robotics technician", "robotics engineer", "cnc technician", "hvac technician"];
const INCOMPATIBLE = ["software developer", "software engineer", "web developer", "frontend", "front-end", "backend", "back-end", "fullstack", "full-stack", "javascript developer", "typescript developer", "react developer", "node.js developer", "devops", "cloud engineer", "data scientist", "data analyst", "machine learning engineer", "cybersecurity", "marketing", "sales", "commercial", "recruiter", "human resources", "accountant", "finance", "customer success", "ux designer", "ui designer", "copywriter", "content manager"];
function norm(v: string | null | undefined): string { return (v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function hasMarker(text: string, markers: string[]): boolean { const t = norm(text); return markers.some((m) => t.includes(norm(m))); }
function isExternalLiveSource(source: string | null): boolean { const s = norm(source); return s.includes("arbeitnow") || s.includes("remotive") || s.includes("jobicy"); }
function isIndustrialProfile(text: string): boolean { return hasMarker(text, INDUSTRIAL_PROFILE); }
function isCompatibleExternalJob(job: JobRow, profileText: string): boolean {
  const text = `${job.title} ${job.description ?? ""}`;
  if (hasMarker(job.title, INCOMPATIBLE)) return false;
  if (!isIndustrialProfile(profileText)) return true;
  const titleIndustrial = hasMarker(job.title, INDUSTRIAL_JOB);
  const signals = INDUSTRIAL_JOB.filter((m) => norm(text).includes(norm(m))).length;
  return titleIndustrial || signals >= 2;
}

export function useCvs() {
  return useQuery({ queryKey: ["cvs"], queryFn: async () => { const { data, error } = await supabase.from("cvs").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as unknown as CvRow[]; } });
}
export function useLatestCv() { const { data, ...rest } = useCvs(); return { ...rest, data: data?.[0] ?? null }; }

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const [{ data, error }, { data: userData }] = await Promise.all([supabase.from("jobs").select("*").eq("is_demo", false).order("posted_at", { ascending: false }), supabase.auth.getUser()]);
      if (error) throw error;
      const uid = userData.user?.id;
      if (!uid) return (data ?? []) as unknown as JobRow[];
      const { data: profile } = await supabase.from("profiles").select("domain, sectors, target_roles").eq("id", uid).maybeSingle();
      const profileText = [profile?.domain ?? "", ...(profile?.sectors ?? []), ...(profile?.target_roles ?? [])].join(" ");
      return ((data ?? []) as unknown as JobRow[]).filter((job) => !isExternalLiveSource(job.source) || isCompatibleExternalJob(job, profileText));
    },
  });
}

export function useMatches(cvId: string | null) {
  return useQuery({ queryKey: ["matches", cvId], enabled: !!cvId, queryFn: async () => { const { data, error } = await supabase.from("matches").select("job_id, score, breakdown, reasoning").eq("cv_id", cvId!); if (error) throw error; return data ?? []; } });
}
export function useApplications() {
  return useQuery({ queryKey: ["applications"], queryFn: async () => { const { data, error } = await supabase.from("applications").select("id, job_id, status, notes, applied_at, jobs(title, company, location, url)").order("applied_at", { ascending: false }); if (error) throw error; return data ?? []; } });
}
export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: async () => { const { data: userData } = await supabase.auth.getUser(); const uid = userData.user?.id; if (!uid) return null; const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle(); if (error) throw error; return data; } });
}
export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: async () => { const { data, error } = await supabase.from("documents").select("id, doc_type, language, title, content, created_at").order("created_at", { ascending: false }).limit(30); if (error) throw error; return data ?? []; } });
}
export function useRefresh() { const qc = useQueryClient(); return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }
export function useRole() {
  return useQuery({ queryKey: ["role"], queryFn: async () => { const { data: userData } = await supabase.auth.getUser(); const uid = userData.user?.id; if (!uid) return null; const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid).order("role"); if (error) throw error; const roles = (data ?? []).map((r) => r.role as AppRole); return (roles.includes("recruiter") ? "recruiter" : roles[0] ?? null) as AppRole | null; }, staleTime: 60_000 });
}
export function useMissions() { return useQuery({ queryKey: ["missions"], queryFn: async () => { const { data, error } = await supabase.from("agent_missions").select("*").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; } }); }
export function useAlerts() { return useQuery({ queryKey: ["alerts"], queryFn: async () => { const { data, error } = await supabase.from("agent_alerts").select("id, score, message, is_read, created_at, mission_id, job_id, jobs(title, company, location, url)").order("created_at", { ascending: false }).limit(50); if (error) throw error; return data ?? []; } }); }
export function useRecruiterJobs() { return useQuery({ queryKey: ["recruiter-jobs"], queryFn: async () => { const { data: userData } = await supabase.auth.getUser(); const uid = userData.user?.id; if (!uid) return []; const { data, error } = await supabase.from("jobs").select("*").eq("user_id", uid).order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as unknown as JobRow[]; } }); }
export function useRecruiterApplications() { return useQuery({ queryKey: ["recruiter-applications"], queryFn: async () => { const { data: userData } = await supabase.auth.getUser(); const uid = userData.user?.id; if (!uid) return []; const { data, error } = await supabase.from("applications").select("id, user_id, job_id, cv_id, stage, status, recruiter_note, match_score, match_reasoning, applied_at, jobs!inner(id, title, company, user_id), profiles(full_name, domain, experience_years, city, countries, languages)").eq("jobs.user_id", uid).order("applied_at", { ascending: false }); if (error) throw error; return data ?? []; } }); }
export function useCompanies() { return useQuery({ queryKey: ["companies"], queryFn: async () => { const { data, error } = await supabase.from("companies").select("*").order("name"); if (error) throw error; return data ?? []; } }); }
