/**
 * Récupération d'offres d'emploi RÉELLES depuis des sources publiques autorisées.
 * LinkedIn / Indeed / TanitJobs / Welcome to the Jungle bloquent la récupération
 * automatique : pour ces sites on fournit des liens de recherche directs (job-sites.ts).
 */

export type LiveJob = {
  title: string;
  company: string;
  description: string;
  url: string;
  location: string | null;
  country: string | null;
  contract_type: string | null;
  level: string | null;
  salary: string | null;
  source: string;
  posted_at: string | null;
  remote: string | null;
};

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ", hellip: "…",
  eacute: "é", egrave: "è", agrave: "à",
};

function decode(input: string): string {
  return input.replace(/&(#?\w+);/g, (m, k: string) => ENTITIES[k] ?? m);
}
function clean(html: string, max = 4000): string {
  let text = decode(decode(html ?? ""));
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, max);
}
async function getJson<T>(url: string, ms = 15000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "Karriera/1.0" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

/** Mots-clés multilingues centrés sur les métiers industriels. */
const SYNONYMS: Record<string, string[]> = {
  electrique: ["electrical", "electrician", "electrical engineer", "elektro", "elektrotechnik"],
  electricite: ["electrical", "electrician", "electrical engineer", "elektro"],
  automatisme: ["automation", "automation technician", "automation engineer", "plc", "sps", "scada", "controls"],
  automatique: ["automation", "control engineer", "plc", "controls"],
  maintenance: ["maintenance", "maintenance technician", "maintenance engineer", "instandhaltung", "wartung"],
  industriel: ["industrial", "industrial maintenance", "manufacturing", "production"],
  mecanique: ["mechanical", "mechanical technician", "mechanik", "maschinenbau"],
  electrotechnique: ["electrotechnics", "electrical engineering", "electrical technician", "elektrotechnik"],
  electromecanique: ["electromechanical", "electromechanical technician", "electromechanical engineer", "elektromechanik"],
  instrumentation: ["instrumentation", "instrumentation technician", "instrumentation engineer", "messtechnik"],
  controle: ["controls engineer", "control systems", "control technician", "leittechnik"],
  automaticien: ["automation technician", "automation engineer", "plc engineer", "automatisierungstechniker"],
  energie: ["energy engineer", "electrical energy", "photovoltaic", "solar", "renewable"],
  robotique: ["robotics", "robotics technician", "robotics engineer"],
  informatique: ["software", "developer", "it", "computer science", "entwickler"],
  developpeur: ["developer", "software engineer", "entwickler"],
  reseau: ["network", "network engineer", "netzwerk"],
  data: ["data", "data analyst", "data scientist"],
};

const INDUSTRIAL_CORE = [
  "automation", "automatisierung", "plc", "sps", "scada", "controls", "industrial maintenance",
  "maintenance technician", "maintenance engineer", "electrical technician", "electrical engineering",
  "electrical engineer", "electromechanical", "electrotechnics", "instrumentation", "control systems",
  "industrial", "manufacturing", "production", "robotics", "cnc", "hvac", "hydraulic", "pneumatic",
];

const EXCLUDED_FAMILIES: Record<string, string[]> = {
  logiciel: ["developer", "developpeur", "software", "frontend", "front-end", "backend", "back-end", "fullstack", "full-stack", "javascript", "typescript", "react", "angular", "node.js", "node", "php", "laravel", "django", "devops", "data scientist", "data analyst", "machine learning", "web developer", "mobile developer", "android developer", "ios developer", "sre", "cloud engineer", "cybersecurity", "programmer"],
  business: ["marketing", "sales", "vente", "commercial", "account executive", "recruiter", "recrutement", "accountant", "finance", "human resources", "ressources humaines", "customer success", "designer", "ux designer", "ui designer", "copywriter", "content manager"],
};

function normalize(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function hasAny(text: string, markers: string[]): boolean {
  const t = normalize(text);
  return markers.some((m) => t.includes(normalize(m)));
}
function expandKeywords(sources: string[]): string[] {
  const out = new Set<string>();
  for (const source of sources) {
    const norm = normalize(source);
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (norm.includes(key.slice(0, 6))) syns.forEach((s) => out.add(normalize(s)));
    }
    for (const token of norm.split(/[^a-z0-9+#.-]+/)) if (token.length >= 4) out.add(token);
  }
  return [...out].slice(0, 60);
}

const STOP = new Set([
  "the","and","les","des","pour","avec","dans","une","son","ses","est","sur","cdi","stage","job","jobs","emploi","poste","recherche","travail","work","full","time","remote","engineer","engineering","ingenieur","technician","technicien","specialist","expert","senior","junior","manager","assistant","consultant","support","service","services","systeme","systemes","system","systems","project","projet","team","equipe","office",
]);

const INDUSTRIAL_FAMILIES = ["industrie", "electricite", "automatisme", "maintenance", "electrotechnique", "electromecanique", "instrumentation", "controle", "robotique", "energie", "mecanique"];
function profileHasIndustrialFamily(text: string): boolean {
  return INDUSTRIAL_FAMILIES.some((x) => normalize(text).includes(normalize(x).slice(0, 6)));
}
function excludedFamily(text: string): string | null {
  const t = normalize(text);
  for (const [family, markers] of Object.entries(EXCLUDED_FAMILIES)) if (markers.some((m) => t.includes(normalize(m)))) return family;
  return null;
}
function isStrongIndustrialTitle(title: string): boolean {
  const t = normalize(title);
  return INDUSTRIAL_CORE.some((m) => t.includes(normalize(m))) ||
    ["automaticien", "electrotechnicien", "electrotechnicien", "electricien", "electrician", "electrical technician", "maintenance technician", "maintenance engineer", "technicien maintenance", "technicien maintenance industrielle", "ingenieur maintenance", "ingenieur automatisme", "ingenieur electrique", "ingenieur electricite", "technicien electricite", "technicien electromecanique", "technicien instrumentation", "control engineer", "automation engineer", "automation technician", "plc engineer", "industrial engineer", "industrial maintenance"].some((m) => t.includes(normalize(m)));
}
function relevance(job: LiveJob, terms: string[]): number {
  const title = normalize(job.title);
  const body = normalize(`${job.description} ${job.location ?? ""}`);
  let score = 0;
  for (const term of terms) {
    if (STOP.has(term)) continue;
    if (title.includes(term)) score += 5;
    else if (body.includes(term)) score += 1;
  }
  if (isStrongIndustrialTitle(job.title)) score += 8;
  return score;
}

const EU_COUNTRIES: Record<string, string> = { berlin: "Allemagne", munich: "Allemagne", münchen: "Allemagne", hamburg: "Allemagne", köln: "Allemagne", frankfurt: "Allemagne", paris: "France", lyon: "France", marseille: "France", toulouse: "France", nantes: "France", bordeaux: "France", tunis: "Tunisie", sfax: "Tunisie", montréal: "Canada", montreal: "Canada", toronto: "Canada", dubai: "Émirats arabes unis", doha: "Qatar", riyadh: "Arabie saoudite" };
function guessCountry(location: string | null): string | null { if (!location) return null; const low = location.toLowerCase(); for (const [city, country] of Object.entries(EU_COUNTRIES)) if (low.includes(city)) return country; return null; }

type ArbeitnowJob = { title: string; company_name: string; description: string; url: string; location: string; remote: boolean | string; job_types: string[] | string; created_at: number };
async function fromArbeitnow(): Promise<LiveJob[]> {
  const data = await getJson<{ data: ArbeitnowJob[] }>("https://www.arbeitnow.com/api/job-board-api", 25000);
  if (!data?.data) return [];
  return data.data.map((j) => ({ title: j.title, company: j.company_name, description: clean(j.description), url: j.url, location: j.location || null, country: guessCountry(j.location) ?? "Allemagne", contract_type: Array.isArray(j.job_types) ? j.job_types[0] ?? null : null, level: null, salary: null, source: "Arbeitnow (Europe)", posted_at: j.created_at ? new Date(Number(j.created_at) * 1000).toISOString().slice(0, 10) : null, remote: String(j.remote) === "true" || j.remote === true ? "Télétravail" : null }));
}

type RemotiveJob = { title: string; company_name: string; description: string; url: string; candidate_required_location: string; job_type: string; salary: string; publication_date: string };
async function fromRemotive(query: string): Promise<LiveJob[]> { const q = query ? `&search=${encodeURIComponent(query)}` : ""; const data = await getJson<{ jobs: RemotiveJob[] }>(`https://remotive.com/api/remote-jobs?limit=40${q}`, 20000); if (!data?.jobs) return []; return data.jobs.map((j) => ({ title: j.title, company: (j.company_name || "").trim(), description: clean(j.description), url: j.url, location: j.candidate_required_location || "Télétravail", country: null, contract_type: j.job_type || null, level: null, salary: j.salary || null, source: "Remotive (télétravail)", posted_at: j.publication_date ? j.publication_date.slice(0, 10) : null, remote: "Télétravail" })); }

type JobicyJob = { jobTitle: string; companyName: string; jobDescription?: string; jobExcerpt?: string; url: string; jobGeo: string; jobType: string[] | string; jobLevel: string; annualSalaryMin?: number; salaryCurrency?: string; pubDate: string };
async function fromJobicy(query: string): Promise<LiveJob[]> { const q = query ? `&tag=${encodeURIComponent(query)}` : ""; const data = await getJson<{ jobs: JobicyJob[] }>(`https://jobicy.com/api/v2/remote-jobs?count=40${q}`, 20000); if (!data?.jobs) return []; return data.jobs.map((j) => { const types = Array.isArray(j.jobType) ? j.jobType : [j.jobType].filter(Boolean); return { title: j.jobTitle, company: j.companyName, description: clean(j.jobDescription ?? j.jobExcerpt ?? ""), url: j.url, location: j.jobGeo || "Télétravail", country: null, contract_type: (types[0] as string) ?? null, level: j.jobLevel || null, salary: j.annualSalaryMin && j.annualSalaryMin > 0 ? `${j.annualSalaryMin} ${j.salaryCurrency ?? ""}`.trim() : null, source: "Jobicy (télétravail)", posted_at: j.pubDate ? j.pubDate.slice(0, 10) : null, remote: "Télétravail" } satisfies LiveJob; }); }

export function buildSearchQueries(sources: string[], max = 6): string[] {
  const queries: string[] = [];
  const push = (q: string) => { const v = q.trim(); if (v && !queries.some((x) => normalize(x) === normalize(v))) queries.push(v); };
  for (const source of sources) {
    if (!source?.trim()) continue;
    const norm = normalize(source);
    let matched = false;
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (norm.includes(key.slice(0, 6))) {
        for (const s of syns.slice(0, 2)) push(s);
        matched = true;
      }
    }
    if (!matched) push(source.trim());
    if (queries.length >= max) break;
  }
  return queries.slice(0, max);
}

export async function fetchLiveJobs(query: string, limit = 40, extraKeywords: string[] = [], roles: string[] = []): Promise<LiveJob[]> {
  const sources = [query, ...extraKeywords, ...roles].filter(Boolean);
  const terms = expandKeywords(sources);
  const industrialProfile = profileHasIndustrialFamily(sources.join(" "));
  const searchTerms = buildSearchQueries([...roles, query, ...extraKeywords].filter(Boolean), 6);
  const results = await Promise.all([fromArbeitnow(), ...searchTerms.flatMap((q) => [fromRemotive(q), fromJobicy(q)])]);
  const seen = new Set<string>();
  const scored: Array<{ job: LiveJob; score: number }> = [];
  for (const pool of results) for (const job of pool) {
    if (!job.url || !job.title || !job.company || seen.has(job.url)) continue;
    seen.add(job.url);
    const text = `${job.title} ${job.description}`;
    if (excludedFamily(text)) continue;
    if (industrialProfile) {
      const titleStrong = isStrongIndustrialTitle(job.title);
      const industrialBody = hasAny(text, INDUSTRIAL_CORE);
      // Pour un profil industriel, le titre doit porter un signal métier clair,
      // sauf si l'annonce contient plusieurs signaux industriels cohérents.
      const coreHits = INDUSTRIAL_CORE.filter((m) => normalize(text).includes(normalize(m))).length;
      if (!titleStrong && coreHits < 2) continue;
      if (coreHits === 0) continue;
    }
    const score = relevance(job, terms);
    if (score < (industrialProfile ? 5 : 3)) continue;
    scored.push({ job, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.job);
}
