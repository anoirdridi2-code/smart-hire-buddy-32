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
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
  hellip: "…",
  eacute: "é",
  egrave: "è",
  agrave: "à",
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
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Karriera/1.0" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Synonymes multilingues par métier pour ne pas rater les annonces EN/DE. */
const SYNONYMS: Record<string, string[]> = {
  electrique: ["electrical", "elektro", "elektriker", "electrician", "elektrotechnik"],
  electricite: ["electrical", "elektro", "electrician"],
  automatisme: ["automation", "automatisierung", "plc", "sps", "scada", "controls"],
  automatique: ["automation", "control engineer", "plc"],
  maintenance: ["maintenance", "instandhaltung", "wartung", "technicien de maintenance"],
  industriel: ["industrial", "industrie", "manufacturing", "production"],
  mecanique: ["mechanical", "mechanik", "maschinenbau"],
  informatique: ["software", "developer", "it", "engineer", "entwickler"],
  developpeur: ["developer", "software engineer", "entwickler"],
  reseau: ["network", "netzwerk"],
  data: ["data", "analyst", "scientist"],
  energie: ["energy", "energie", "photovoltaic", "solar", "renewable"],
  robotique: ["robotics", "roboter"],
};

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Construit la liste de mots-clés (termes utilisateur + synonymes EN/DE). */
export function expandKeywords(sources: string[]): string[] {
  const out = new Set<string>();
  for (const source of sources) {
    for (const token of normalize(source).split(/[^a-z0-9+#]+/)) {
      if (token.length < 3) continue;
      out.add(token);
      for (const [key, syns] of Object.entries(SYNONYMS)) {
        if (token.startsWith(key.slice(0, 6))) syns.forEach((s) => out.add(s));
      }
    }
  }
  return [...out].slice(0, 40);
}

const STOP = new Set([
  "the","and","les","des","pour","avec","dans","une","son","ses","est","sur","cdi","stage",
  "job","jobs","emploi","poste","recherche","travail","work","full","time","remote",
  // Termes trop génériques : ils faisaient remonter n'importe quel métier (dev, marketing…)
  "engineer","engineering","ingenieur","technician","technicien","specialist","expert",
  "senior","junior","manager","assistant","consultant","support","service","services",
  "systeme","systemes","system","systems","project","projet","team","equipe","office",
]);

/**
 * Familles de métiers : sert à écarter les offres d'un autre corps de métier
 * (ex. développeur logiciel pour un technicien en automatisme).
 */
const FAMILIES: Record<string, string[]> = {
  industrie: [
    "automat", "automation", "automatisierung", "plc", "sps", "scada", "tia portal",
    "electric", "electrical", "electrique", "elektro", "elektriker", "electrician",
    "maintenance", "instandhaltung", "wartung", "mecanic", "mechanical", "mechanik",
    "maschinenbau", "industrial", "industrie", "manufacturing", "production", "hvac",
    "robotic", "roboter", "cnc", "hydraul", "pneumat", "chaudronn", "soudeur", "welder",
    "energie", "energy", "photovolta", "solar",
  ],
  logiciel: [
    "developer", "developpeur", "développeur", "software", "entwickler", "frontend",
    "front-end", "backend", "back-end", "fullstack", "full-stack", "javascript",
    "typescript", "react", "angular", "node", "php", "laravel", "django", "devops",
    "data scientist", "data analyst", "machine learning", "web", "mobile", "android",
    "ios", "qa engineer", "sre", "cloud", "cybersecurity", "programmer",
  ],
  business: [
    "marketing", "sales", "vente", "commercial", "account executive", "recruiter",
    "recrutement", "comptab", "accountant", "finance", "hr ", "ressources humaines",
    "customer success", "designer", "ux", "ui ", "copywriter", "content",
  ],
};

function familiesOf(text: string): Set<string> {
  const t = normalize(text);
  const found = new Set<string>();
  for (const [family, markers] of Object.entries(FAMILIES)) {
    if (markers.some((m) => t.includes(normalize(m)))) found.add(family);
  }
  return found;
}

/** Score de pertinence : titre = fort, description = faible. */
function relevance(job: LiveJob, terms: string[]): number {
  if (terms.length === 0) return 0;
  const title = normalize(`${job.title}`);
  const body = normalize(`${job.description} ${job.location ?? ""}`);
  let score = 0;
  for (const term of terms) {
    if (STOP.has(term)) continue;
    if (title.includes(term)) score += 3;
    else if (body.includes(term)) score += 1;
  }
  return score;
}



const EU_COUNTRIES: Record<string, string> = {
  berlin: "Allemagne",
  munich: "Allemagne",
  münchen: "Allemagne",
  hamburg: "Allemagne",
  köln: "Allemagne",
  frankfurt: "Allemagne",
  paris: "France",
  lyon: "France",
  marseille: "France",
  toulouse: "France",
  nantes: "France",
  bordeaux: "France",
  tunis: "Tunisie",
  sfax: "Tunisie",
  montréal: "Canada",
  montreal: "Canada",
  toronto: "Canada",
  dubai: "Émirats arabes unis",
  doha: "Qatar",
  riyadh: "Arabie saoudite",
};

function guessCountry(location: string | null): string | null {
  if (!location) return null;
  const low = location.toLowerCase();
  for (const [city, country] of Object.entries(EU_COUNTRIES)) {
    if (low.includes(city)) return country;
  }
  return null;
}

type ArbeitnowJob = {
  title: string;
  company_name: string;
  description: string;
  url: string;
  location: string;
  remote: boolean | string;
  job_types: string[] | string;
  created_at: number;
};

async function fromArbeitnow(): Promise<LiveJob[]> {
  const data = await getJson<{ data: ArbeitnowJob[] }>(
    "https://www.arbeitnow.com/api/job-board-api",
    25000,
  );
  if (!data?.data) return [];
  return data.data.map((j) => {
    const types = Array.isArray(j.job_types) ? j.job_types : [];
    return {
      title: j.title,
      company: j.company_name,
      description: clean(j.description),
      url: j.url,
      location: j.location || null,
      country: guessCountry(j.location) ?? "Allemagne",
      contract_type: types[0] ?? null,
      level: null,
      salary: null,
      source: "Arbeitnow (Europe)",
      posted_at: j.created_at
        ? new Date(Number(j.created_at) * 1000).toISOString().slice(0, 10)
        : null,
      remote: String(j.remote) === "true" || j.remote === true ? "Télétravail" : null,
    } satisfies LiveJob;
  });
}

type RemotiveJob = {
  title: string;
  company_name: string;
  description: string;
  url: string;
  candidate_required_location: string;
  job_type: string;
  salary: string;
  publication_date: string;
};

async function fromRemotive(query: string): Promise<LiveJob[]> {
  const q = query ? `&search=${encodeURIComponent(query)}` : "";
  const data = await getJson<{ jobs: RemotiveJob[] }>(
    `https://remotive.com/api/remote-jobs?limit=40${q}`,
    20000,
  );
  if (!data?.jobs) return [];
  return data.jobs.map((j) => ({
    title: j.title,
    company: (j.company_name || "").trim(),
    description: clean(j.description),
    url: j.url,
    location: j.candidate_required_location || "Télétravail",
    country: null,
    contract_type: j.job_type || null,
    level: null,
    salary: j.salary || null,
    source: "Remotive (télétravail)",
    posted_at: j.publication_date ? j.publication_date.slice(0, 10) : null,
    remote: "Télétravail",
  }));
}

type JobicyJob = {
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  jobExcerpt?: string;
  url: string;
  jobGeo: string;
  jobType: string[] | string;
  jobLevel: string;
  annualSalaryMin?: number;
  salaryCurrency?: string;
  pubDate: string;
};

async function fromJobicy(query: string): Promise<LiveJob[]> {
  const q = query ? `&tag=${encodeURIComponent(query)}` : "";
  const data = await getJson<{ jobs: JobicyJob[] }>(
    `https://jobicy.com/api/v2/remote-jobs?count=40${q}`,
    20000,
  );
  if (!data?.jobs) return [];
  return data.jobs.map((j) => {
    const types = Array.isArray(j.jobType) ? j.jobType : [j.jobType].filter(Boolean);
    return {
      title: j.jobTitle,
      company: j.companyName,
      description: clean(j.jobDescription ?? j.jobExcerpt ?? ""),
      url: j.url,
      location: j.jobGeo || "Télétravail",
      country: null,
      contract_type: (types[0] as string) ?? null,
      level: j.jobLevel || null,
      salary:
        j.annualSalaryMin && j.annualSalaryMin > 0
          ? `${j.annualSalaryMin} ${j.salaryCurrency ?? ""}`.trim()
          : null,
      source: "Jobicy (télétravail)",
      posted_at: j.pubDate ? j.pubDate.slice(0, 10) : null,
      remote: "Télétravail",
    } satisfies LiveJob;
  });
}

/**
 * Agrège les sources, ne garde que les offres réellement pertinentes
 * (mots-clés du profil / CV) et les trie par pertinence.
 */
export async function fetchLiveJobs(
  query: string,
  limit = 40,
  extraKeywords: string[] = [],
): Promise<LiveJob[]> {
  const terms = expandKeywords([query, ...extraKeywords]);

  const results = await Promise.all([
    fromArbeitnow(),
    fromRemotive(query),
    fromJobicy(query),
  ]);

  const seen = new Set<string>();
  const scored: Array<{ job: LiveJob; score: number }> = [];

  for (const pool of results) {
    for (const job of pool) {
      if (!job.url || !job.title || !job.company) continue;
      if (seen.has(job.url)) continue;
      seen.add(job.url);
      const score = relevance(job, terms);
      // Sans mots-clés exploitables on garde tout ; sinon on exige une vraie
      // correspondance (titre, ou plusieurs occurrences dans l'annonce).
      if (terms.length > 0 && score < 3) continue;
      scored.push({ job, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.job);
}

