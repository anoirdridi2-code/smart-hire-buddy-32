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
        "Tu es un expert du sourcing d'emploi international spécialisé dans les métiers industriels et techniques. " +
        'Réponds en JSON strict: {"queries":[{"label":string,"query":string,"location":string,"language":"fr"|"en"|"de"|"ar"}],"keywords":[string],"advice":[string]}. ' +
        "Les requêtes doivent cibler UNIQUEMENT des métiers concrets compatibles avec un profil génie électrique, automatisme, maintenance industrielle, électrotechnique, électromécanique, instrumentation ou contrôle-commande. " +
        "Utilise des intitulés précis comme automaticien, automation engineer/technician, PLC engineer/technician, electrical engineer/technician, electrotechnician, industrial maintenance technician/engineer, electromechanical technician/engineer, instrumentation and control engineer/technician, control systems engineer, industrial automation. " +
        "N'utilise JAMAIS comme requête principale des termes trop génériques seuls comme engineer, technician, maintenance, industrial, electricity ou electrician sans contexte métier. " +
        "Exclus explicitement software developer, web developer, frontend, backend, fullstack, DevOps, cloud, data, marketing, sales, commercial, HR/recruitment et design. " +
        "6 à 10 requêtes maximum, variées par intitulé et langue des pays visés, sans opérateurs exotiques. Les conseils sont en français, courts et concrets.",
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
        '{"jobs":[{"title":string,"company":string,"location":string,"country":string,"salary":string,"contract_type":string,"level":string,"source":string,"url":string,"description":string}]}. ' +
        "Maximum 15 offres. Ignore les menus, publicités et éléments de navigation. Champs inconnus = chaîne vide.",
    },
    { role: "user", content: raw.slice(0, 30000) },
  ]);
  return Array.isArray(result?.jobs) ? result.jobs.slice(0, 15) : [];
}
