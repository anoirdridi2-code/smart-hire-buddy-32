import { aiJson, aiText } from "./ai-gateway.server";
import type {
  CandidateRanking,
  CvAnalysis,
  JobDraft,
  MatchResult,
  ParsedJob,
  ProfileInput,
} from "./types";
import { DOC_TYPES, LANGUAGES, type DocLanguage, type DocType } from "./types";

function profileBlock(p: ProfileInput | null | undefined): string {
  if (!p) return "Profil non renseigné.";
  return [
    `Nom: ${p.full_name ?? "non précisé"}`,
    `Domaine: ${p.domain ?? "non précisé"}`,
    `Expérience: ${p.experience_years ?? 0} an(s)`,
    `Pays visés: ${(p.countries ?? []).join(", ") || "non précisé"}`,
    `Ville: ${p.city ?? "non précisé"}`,
    `Salaire souhaité: ${p.desired_salary ?? "non précisé"}`,
    `Langues: ${(p.languages ?? []).join(", ") || "non précisé"}`,
    `Type de contrat: ${p.contract_type ?? "non précisé"}`,
  ].join("\n");
}

const ANALYSIS_SCHEMA = `{
  "global_score": number 0-100,
  "ats_score": number 0-100,
  "readability_score": number 0-100,
  "ats_breakdown": {"format":0-100,"keywords":0-100,"experience":0-100,"skills":0-100,"languages":0-100,"contact":0-100,"issues":["problèmes ATS concrets"]},
  "prediction": {"interview_probability":0-100,"hire_probability":0-100,"confidence":"faible"|"moyenne"|"élevée","rationale":"2 phrases","levers":["actions qui augmenteraient le plus les chances"]},
  "learning_plan": {"gaps":["compétences manquantes"],"actions":[{"title":string,"detail":string,"duration":"ex: 3 semaines","resource":"type de formation ou certification recommandée"}]},
  "summary": "3 phrases max",
  "skills": string[],
  "technologies": string[],
  "experiences": [{"title": string, "company": string, "period": string, "highlights": string[]}],
  "education": string[],
  "certifications": string[],
  "languages": string[],
  "missing_keywords": string[],
  "strengths": string[],
  "improvements": [{"title": string, "detail": string, "priority": "haute"|"moyenne"|"basse"}],
  "country_advice": [{"country": string, "advice": string}]
}`;

export async function analyzeCv(input: {
  text?: string | undefined;
  fileName?: string | undefined;
  fileDataUrl?: string | undefined;
  profile: ProfileInput | null;
}): Promise<CvAnalysis> {
  const instruction = `Analyse ce CV en profondeur pour un candidat au profil suivant :
${profileBlock(input.profile)}

Évalue de manière exigeante et réaliste : score global, score ATS (compatibilité avec les logiciels de tri automatique), lisibilité.
Donne des améliorations concrètes et actionnables, et un conseil d'adaptation pour chaque pays visé.
Réponds UNIQUEMENT en JSON valide respectant ce schéma :
${ANALYSIS_SCHEMA}`;

  const content: Array<
    { type: "text"; text: string } | { type: "file"; file: { filename: string; file_data: string } }
  > = [{ type: "text", text: instruction }];

  if (input.fileDataUrl && input.fileName) {
    content.push({
      type: "file",
      file: { filename: input.fileName, file_data: input.fileDataUrl },
    });
  } else {
    content.push({ type: "text", text: `Contenu du CV :\n${input.text ?? ""}` });
  }

  return aiJson<CvAnalysis>([
    {
      role: "system",
      content:
        "Tu es un expert en recrutement international et en optimisation ATS. Tu réponds toujours en français et uniquement en JSON valide.",
    },
    { role: "user", content },
  ]);
}

export async function matchCvToJob(input: {
  analysis: CvAnalysis;
  cvText: string;
  job: { title: string; company: string; description: string; level?: string | null; location?: string | null };
}): Promise<MatchResult> {
  return aiJson<MatchResult>([
    {
      role: "system",
      content:
        "Tu es un moteur de matching CV/offre. Tu notes avec rigueur, sans complaisance. Réponds uniquement en JSON valide, en français.",
    },
    {
      role: "user",
      content: `CV (synthèse structurée) :
${JSON.stringify({
  skills: input.analysis.skills,
  technologies: input.analysis.technologies,
  experiences: input.analysis.experiences,
  education: input.analysis.education,
  languages: input.analysis.languages,
})}

Texte du CV (extrait) :
${input.cvText.slice(0, 4000)}

Offre :
Poste: ${input.job.title}
Entreprise: ${input.job.company}
Lieu: ${input.job.location ?? ""}
Niveau: ${input.job.level ?? ""}
Description: ${input.job.description}

Renvoie ce JSON :
{"score": 0-100, "breakdown": {"skills":0-100,"experience":0-100,"language":0-100,"education":0-100}, "reasoning": "2-3 phrases", "missing": ["compétences manquantes"]}`,
    },
  ]);
}

export async function parseJobPosting(raw: string): Promise<ParsedJob> {
  return aiJson<ParsedJob>([
    {
      role: "system",
      content:
        "Tu extrais les informations structurées d'une annonce d'emploi. Réponds uniquement en JSON valide, en français. Laisse une chaîne vide si l'information est absente.",
    },
    {
      role: "user",
      content: `Annonce :
${raw.slice(0, 12000)}

Renvoie ce JSON :
{"title":"","company":"","location":"","country":"","salary":"","contract_type":"","level":"","source":"","url":"","description":"résumé structuré de 5 à 10 lignes"}`,
    },
  ]);
}

export async function generateDocument(input: {
  docType: DocType;
  language: DocLanguage;
  analysis: CvAnalysis;
  cvText: string;
  profile: ProfileInput | null;
  job?: { title: string; company: string; description: string; location?: string | null } | null;
}): Promise<string> {
  const langName = LANGUAGES[input.language];
  const jobBlock = input.job
    ? `Offre ciblée :
Poste: ${input.job.title}
Entreprise: ${input.job.company}
Lieu: ${input.job.location ?? ""}
Description: ${input.job.description}`
    : "Aucune offre ciblée : rédige une version générique adaptée au domaine du candidat.";

  const task: Record<DocType, string> = {
    cover_letter:
      "Rédige une lettre de motivation percutante et personnalisée (300-400 mots), sans formules creuses, avec des preuves chiffrées tirées du CV.",
    email:
      "Rédige un e-mail de candidature professionnel et court (120-180 mots) avec un objet clair sur la première ligne au format 'Objet : ...'.",
    optimized_cv:
      "Réécris le CV complet optimisé ATS en texte structuré (sections claires, verbes d'action, mots-clés du secteur, résultats chiffrés). Pas de tableaux ni de colonnes.",
  };

  return aiText([
    {
      role: "system",
      content: `Tu es un coach carrière expert. Tu écris exclusivement en ${langName}, dans un style professionnel et naturel, sans texte d'introduction ni commentaire méta. Adapte les codes de rédaction au pays visé.`,
    },
    {
      role: "user",
      content: `${task[input.docType]}
Type de document : ${DOC_TYPES[input.docType]}

Profil candidat :
${profileBlock(input.profile)}

Analyse du CV :
${JSON.stringify({
  skills: input.analysis.skills,
  technologies: input.analysis.technologies,
  experiences: input.analysis.experiences,
  education: input.analysis.education,
  certifications: input.analysis.certifications,
  languages: input.analysis.languages,
})}

Texte du CV :
${input.cvText.slice(0, 6000)}

${jobBlock}`,
    },
  ]);
}

export async function coachReply(input: {
  history: { role: "user" | "assistant"; content: string }[];
  analysis: CvAnalysis | null;
  profile: ProfileInput | null;
}): Promise<string> {
  return aiText([
    {
      role: "system",
      content: `Tu es un coach carrière IA. Tu réponds en français, de façon directe, concrète et bienveillante, avec des exemples et des formulations prêtes à l'emploi. Utilise le markdown (titres courts, listes).

Profil du candidat :
${profileBlock(input.profile)}

${input.analysis ? `Synthèse de son CV : ${JSON.stringify({ skills: input.analysis.skills, experiences: input.analysis.experiences, languages: input.analysis.languages })}` : "Le candidat n'a pas encore importé de CV."}`,
    },
    ...input.history,
  ]);
}

export async function interviewQuestions(input: {
  analysis: CvAnalysis | null;
  job?: { title: string; company: string; description: string } | null;
  profile: ProfileInput | null;
}): Promise<{ technical: string[]; hr: string[] }> {
  return aiJson<{ technical: string[]; hr: string[] }>([
    {
      role: "system",
      content: "Tu prépares des entretiens d'embauche. Réponds uniquement en JSON valide, en français.",
    },
    {
      role: "user",
      content: `Profil :
${profileBlock(input.profile)}
${input.analysis ? `Compétences : ${input.analysis.skills.join(", ")}` : ""}
${input.job ? `Offre visée : ${input.job.title} chez ${input.job.company}. ${input.job.description}` : ""}

Génère 6 questions techniques et 6 questions RH réalistes.
JSON : {"technical": string[], "hr": string[]}`,
    },
  ]);
}

export async function evaluateAnswer(input: {
  question: string;
  answer: string;
}): Promise<{ score: number; feedback: string; improved_answer: string }> {
  return aiJson<{ score: number; feedback: string; improved_answer: string }>([
    {
      role: "system",
      content:
        "Tu es un recruteur qui évalue une réponse d'entretien. Sois exigeant et utile. Réponds uniquement en JSON valide, en français.",
    },
    {
      role: "user",
      content: `Question : ${input.question}
Réponse du candidat : ${input.answer}

JSON : {"score": 0-100, "feedback": "points forts et points à corriger", "improved_answer": "version améliorée de la réponse"}`,
    },
  ]);
}

export async function rankCandidate(input: {
  job: { title: string; company: string; description: string; skills?: string[] | null; level?: string | null };
  cvText: string;
  analysis: CvAnalysis | null;
  profile: ProfileInput | null;
}): Promise<CandidateRanking> {
  return aiJson<CandidateRanking>([
    {
      role: "system",
      content:
        "Tu es un assistant recruteur exigeant et objectif. Tu évites tout biais lié au nom, au genre, à l'âge ou à la nationalité. Réponds uniquement en JSON valide, en français.",
    },
    {
      role: "user",
      content: `Offre :
Poste: ${input.job.title} chez ${input.job.company}
Niveau: ${input.job.level ?? ""}
Compétences attendues: ${(input.job.skills ?? []).join(", ")}
Description: ${input.job.description}

Candidat :
${profileBlock(input.profile)}
${input.analysis ? `Synthèse CV: ${JSON.stringify({ skills: input.analysis.skills, technologies: input.analysis.technologies, experiences: input.analysis.experiences, education: input.analysis.education, languages: input.analysis.languages })}` : ""}
Texte du CV : ${input.cvText.slice(0, 5000)}

JSON : {"score":0-100,"breakdown":{"skills":0-100,"experience":0-100,"language":0-100,"education":0-100},"summary":"3 phrases","strengths":string[],"risks":string[],"recommendation":"à rencontrer"|"à considérer"|"à écarter","interview_questions":["4 questions ciblées"]}`,
    },
  ]);
}

export async function draftJobPosting(input: {
  brief: string;
  company: string;
}): Promise<JobDraft> {
  return aiJson<JobDraft>([
    {
      role: "system",
      content:
        "Tu es un assistant recruteur qui rédige des offres d'emploi attractives, inclusives et précises. Réponds uniquement en JSON valide, en français.",
    },
    {
      role: "user",
      content: `Brief du recruteur :
${input.brief.slice(0, 6000)}
Entreprise : ${input.company}

Renvoie ce JSON (mets 0 ou "" si inconnu) :
{"title":"","company":"","location":"","country":"","contract_type":"","level":"","remote":"sur site|hybride|full remote","required_language":"","salary":"","salary_min":0,"salary_currency":"","experience_min":0,"skills":[],"description":"annonce structurée: mission, responsabilités, profil recherché, avantages"}`,
    },
  ]);
}

export async function translateDocument(input: {
  content: string;
  language: DocLanguage;
}): Promise<string> {
  return aiText([
    {
      role: "system",
      content: `Tu traduis des documents de candidature en ${LANGUAGES[input.language]} en adaptant les codes culturels du pays. Rends uniquement le document traduit, sans commentaire.`,
    },
    { role: "user", content: input.content.slice(0, 12000) },
  ]);
}

export async function anonymizeCvText(input: { cvText: string }): Promise<string> {
  return aiText([
    {
      role: "system",
      content:
        "Tu produis une version anonyme d'un CV : supprime nom, photo, adresse, e-mail, téléphone, âge, nationalité, genre, photo et noms d'écoles trop identifiants. Conserve compétences, réalisations chiffrées et durées. Rends uniquement le CV anonymisé en français.",
    },
    { role: "user", content: input.cvText.slice(0, 8000) },
  ]);
}

export async function missionRelevance(input: {
  mission: {
    title: string;
    target_role?: string | null;
    countries: string[];
    cities: string[];
    remote_only: boolean;
    visa_required: boolean;
    salary_min?: number | null;
    languages: string[];
    contract_type?: string | null;
  };
  job: { title: string; company: string; location?: string | null; country?: string | null; description: string };
  analysis: CvAnalysis | null;
}): Promise<{ score: number; message: string }> {
  return aiJson<{ score: number; message: string }>([
    {
      role: "system",
      content:
        "Tu es un agent de veille emploi. Tu évalues si une offre correspond à la mission d'un candidat. Sois strict. Réponds uniquement en JSON valide, en français.",
    },
    {
      role: "user",
      content: `Mission : ${JSON.stringify(input.mission)}
Offre : ${JSON.stringify({ ...input.job, description: input.job.description.slice(0, 2500) })}
${input.analysis ? `Compétences du candidat : ${input.analysis.skills.join(", ")}` : ""}

JSON : {"score":0-100,"message":"1 phrase expliquant pourquoi cette offre mérite (ou non) l'attention du candidat"}`,
    },
  ]);
}
