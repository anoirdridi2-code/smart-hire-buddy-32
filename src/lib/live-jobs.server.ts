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

function matches(job: LiveJob, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const hay = `${job.title} ${job.company} ${job.location ?? ""} ${job.description}`.toLowerCase();
  return terms.some((t) => hay.includes(t));
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

/** Agrège les sources, filtre sur les mots-clés et déduplique par lien. */
export async function fetchLiveJobs(query: string, limit = 40): Promise<LiveJob[]> {
  const terms = query
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);

  const results = await Promise.all([
    fromArbeitnow(),
    fromRemotive(query),
    fromJobicy(query),
  ]);

  const seen = new Set<string>();
  const out: LiveJob[] = [];
  const pools = results.filter((r) => r.length > 0);

  // Entrelacement pour équilibrer les sources.
  let index = 0;
  while (out.length < limit) {
    let added = false;
    for (const pool of pools) {
      const job = pool[index];
      if (!job) continue;
      added = true;
      if (!job.url || !job.title || !job.company) continue;
      if (seen.has(job.url)) continue;
      if (!matches(job, terms)) continue;
      seen.add(job.url);
      out.push(job);
      if (out.length >= limit) break;
    }
    if (!added) break;
    index += 1;
  }
  return out;
}
