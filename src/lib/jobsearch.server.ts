import { aiJson } from "./ai-gateway.server";
import type { ParsedJob } from "./types";

export type SearchPlan = {
  queries: Array<{ label: string; query: string; location: string; language: string }>;
  keywords: string[];
  advice: string[];
};

export async function buildSearchPlan(input: {
  profileText: string;
  cvText: string;
  wish: string;
}): Promise<SearchPlan> {
  return aiJson<SearchPlan>([
    {
      role: "system",
      content:
        "Tu es un expert du sourcing d'emploi international. Tu produis des requêtes de recherche prêtes à coller dans LinkedIn, Indeed, Glassdoor, TanitJobs, Apec, StepStone, Job Bank et Bayt. " +
        'Réponds en JSON strict: {"queries":[{"label":string,"query":string,"location":string,"language":"fr"|"en"|"de"|"ar"}],"keywords":[string],"advice":[string]}. ' +
        "6 à 10 requêtes maximum, variées (intitulés synonymes, langues locales des pays visés), sans opérateurs exotiques. Les conseils sont en français, courts et concrets.",
    },
    {
      role: "user",
      content: `Profil: ${input.profileText}\n\nSouhait: ${input.wish || "non précisé"}\n\nExtrait du CV:\n${input.cvText.slice(0, 6000)}`,
    },
  ]);
}

export async function splitJobPostings(raw: string): Promise<ParsedJob[]> {
  const result = await aiJson<{ jobs: ParsedJob[] }>([
    {
      role: "system",
      content:
        "Tu reçois un copier-coller brut contenant PLUSIEURS annonces d'emploi. Découpe-les et structure chacune. " +
        'Réponds en JSON strict: {"jobs":[{"title":string,"company":string,"location":string,"country":string,"salary":string,"contract_type":string,"level":string,"source":string,"url":string,"description":string}]}. ' +
        "Maximum 15 offres. Ignore les menus, publicités et éléments de navigation. Champs inconnus = chaîne vide.",
    },
    { role: "user", content: raw.slice(0, 30000) },
  ]);
  return Array.isArray(result?.jobs) ? result.jobs.slice(0, 15) : [];
}
