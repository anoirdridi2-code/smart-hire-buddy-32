import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CvAnalysis } from "@/lib/types";

export type CvRow = {
  id: string;
  file_name: string;
  file_path: string | null;
  raw_text: string | null;
  analysis: CvAnalysis | null;
  global_score: number | null;
  ats_score: number | null;
  readability_score: number | null;
  created_at: string;
};

export type JobRow = {
  id: string;
  is_demo: boolean;
  title: string;
  company: string;
  location: string | null;
  country: string | null;
  salary: string | null;
  contract_type: string | null;
  level: string | null;
  source: string | null;
  url: string | null;
  description: string | null;
  posted_at: string | null;
};

export function useCvs() {
  return useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cvs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CvRow[];
    },
  });
}

export function useLatestCv() {
  const { data, ...rest } = useCvs();
  return { ...rest, data: data?.[0] ?? null };
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as JobRow[];
    },
  });
}

export function useMatches(cvId: string | null) {
  return useQuery({
    queryKey: ["matches", cvId],
    enabled: !!cvId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("job_id, score, breakdown, reasoning")
        .eq("cv_id", cvId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, job_id, status, notes, applied_at, jobs(title, company, location, url)")
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, doc_type, language, title, content, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRefresh() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}
