export type CvAnalysis = {
  global_score: number;
  ats_score: number;
  readability_score: number;
  summary: string;
  skills: string[];
  technologies: string[];
  experiences: { title: string; company: string; period: string; highlights: string[] }[];
  education: string[];
  certifications: string[];
  languages: string[];
  missing_keywords: string[];
  strengths: string[];
  improvements: { title: string; detail: string; priority: "haute" | "moyenne" | "basse" }[];
  country_advice: { country: string; advice: string }[];
};

export type MatchResult = {
  score: number;
  breakdown: {
    skills: number;
    experience: number;
    language: number;
    education: number;
  };
  reasoning: string;
  missing: string[];
};

export type ParsedJob = {
  title: string;
  company: string;
  location: string;
  country: string;
  salary: string;
  contract_type: string;
  level: string;
  source: string;
  url: string;
  description: string;
};

export type ProfileInput = {
  full_name?: string | null;
  domain?: string | null;
  experience_years?: number | null;
  countries?: string[] | null;
  city?: string | null;
  desired_salary?: string | null;
  languages?: string[] | null;
  contract_type?: string | null;
};

export const DOC_TYPES = {
  cover_letter: "Lettre de motivation",
  email: "E-mail de candidature",
  optimized_cv: "CV optimisé ATS",
} as const;

export type DocType = keyof typeof DOC_TYPES;

export const LANGUAGES = {
  fr: "Français",
  en: "Anglais",
  de: "Allemand",
} as const;

export type DocLanguage = keyof typeof LANGUAGES;

export const APPLICATION_STATUSES = {
  applied: "Postulé",
  replied: "Réponse reçue",
  interview: "Entretien",
  rejected: "Refus",
  accepted: "Accepté",
} as const;

export type ApplicationStatus = keyof typeof APPLICATION_STATUSES;
