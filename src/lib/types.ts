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
  ats_breakdown?: AtsBreakdown;
  prediction?: Prediction;
  learning_plan?: LearningPlan;
};

export type MatchResult = {
  score: number;
  breakdown: {
    role_match?: number;
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

export const PIPELINE_STAGES = {
  new: "Nouveau",
  screening: "Pré-sélection",
  hr_interview: "Entretien RH",
  tech_interview: "Entretien technique",
  test: "Test technique",
  offer: "Offre",
  hired: "Embauché",
  rejected: "Refusé",
} as const;

export type PipelineStage = keyof typeof PIPELINE_STAGES;

export const ROLES = {
  candidate: "Candidat",
  recruiter: "Recruteur",
  admin: "Admin",
} as const;

export type AppRole = keyof typeof ROLES;

export type AtsBreakdown = {
  format: number;
  keywords: number;
  experience: number;
  skills: number;
  languages: number;
  contact: number;
  issues: string[];
};

export type Prediction = {
  interview_probability: number;
  hire_probability: number;
  confidence: "faible" | "moyenne" | "élevée";
  rationale: string;
  levers: string[];
};

export type LearningPlan = {
  gaps: string[];
  actions: { title: string; detail: string; duration: string; resource: string }[];
};

export type CandidateRanking = {
  score: number;
  breakdown: { skills: number; experience: number; language: number; education: number };
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: "à rencontrer" | "à considérer" | "à écarter";
  interview_questions: string[];
};

export type JobDraft = {
  title: string;
  company: string;
  location: string;
  country: string;
  contract_type: string;
  level: string;
  remote: string;
  required_language: string;
  salary: string;
  salary_min: number;
  salary_currency: string;
  experience_min: number;
  skills: string[];
  description: string;
};
