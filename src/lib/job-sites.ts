export type JobSite = {
  id: string;
  name: string;
  scope: string;
  build: (query: string, location: string) => string;
};

const e = encodeURIComponent;

export const JOB_SITES: JobSite[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    scope: "Mondial",
    build: (q, l) => `https://www.linkedin.com/jobs/search/?keywords=${e(q)}&location=${e(l)}`,
  },
  {
    id: "indeed",
    name: "Indeed",
    scope: "Mondial",
    build: (q, l) => `https://www.indeed.com/jobs?q=${e(q)}&l=${e(l)}`,
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    scope: "Mondial",
    build: (q) => `https://www.glassdoor.fr/Emploi/emplois.htm?sc.keyword=${e(q)}`,
  },
  {
    id: "google",
    name: "Google Jobs",
    scope: "Mondial",
    build: (q, l) => `https://www.google.com/search?q=${e(`${q} emploi ${l}`)}&ibp=htl;jobs`,
  },
  {
    id: "tanitjobs",
    name: "TanitJobs",
    scope: "Tunisie",
    build: (q) => `https://www.tanitjobs.com/jobs/?keywords%5B%5D=${e(q)}`,
  },
  {
    id: "keejob",
    name: "Keejob",
    scope: "Tunisie",
    build: (q) => `https://www.keejob.com/offres-emploi/?keywords=${e(q)}`,
  },
  {
    id: "apec",
    name: "Apec",
    scope: "France",
    build: (q) => `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=${e(q)}`,
  },
  {
    id: "wttj",
    name: "Welcome to the Jungle",
    scope: "France",
    build: (q, l) => `https://www.welcometothejungle.com/fr/jobs?query=${e(q)}&aroundQuery=${e(l)}`,
  },
  {
    id: "francetravail",
    name: "France Travail",
    scope: "France",
    build: (q) => `https://candidat.francetravail.fr/offres/recherche?motsCles=${e(q)}`,
  },
  {
    id: "stepstone",
    name: "StepStone",
    scope: "Allemagne",
    build: (q, l) => `https://www.stepstone.de/jobs/${e(q)}/in-${e(l || "Deutschland")}`,
  },
  {
    id: "indeedde",
    name: "Indeed DE",
    scope: "Allemagne",
    build: (q, l) => `https://de.indeed.com/jobs?q=${e(q)}&l=${e(l)}`,
  },
  {
    id: "jobbank",
    name: "Job Bank",
    scope: "Canada",
    build: (q, l) =>
      `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${e(q)}&locationstring=${e(l)}`,
  },
  {
    id: "indeedca",
    name: "Indeed CA",
    scope: "Canada",
    build: (q, l) => `https://ca.indeed.com/jobs?q=${e(q)}&l=${e(l)}`,
  },
  {
    id: "bayt",
    name: "Bayt",
    scope: "Golfe",
    build: (q) => `https://www.bayt.com/en/international/jobs/${e(q)}-jobs/`,
  },
  {
    id: "gulftalent",
    name: "GulfTalent",
    scope: "Golfe",
    build: (q) => `https://www.gulftalent.com/jobs/search?keyword=${e(q)}`,
  },
  {
    id: "naukrigulf",
    name: "NaukriGulf",
    scope: "Golfe",
    build: (q) => `https://www.naukrigulf.com/${e(q)}-jobs`,
  },
];

export const SITE_SCOPES = Array.from(new Set(JOB_SITES.map((s) => s.scope)));
