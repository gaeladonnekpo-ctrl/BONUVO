import type { ContinentKey } from "@/lib/i18n/countries";

export type BettingPriorityTier = 1 | 2 | 3;

/**
 * Tier 1: West Africa prioritized first, followed by key African and global sports-betting markets.
 */
export const TOP_BETTING_TIER1_CODES = [
  "BJ",
  "CI",
  "SN",
  "TG",
  "BF",
  "ML",
  "NE",
  "GN",
  "GW",
  "GH",
  "NG",
  "CV",
  "GM",
  "LR",
  "SL",
  "CM",
  "CD",
  "GA",
  "CG",
  "TD",
  "ZA",
  "KE",
  "MA",
  "TZ",
  "UG",
  "GB",
  "NO",
  "IT",
  "DE",
  "ES",
  "FR",
  "SE",
  "PL",
  "RO",
  "US",
  "BR",
  "CA",
  "MX",
  "AR",
  "CO",
  "AU",
  "IN",
  "PH",
] as const;

/**
 * Tier 2: Secondary regional and international betting markets.
 */
export const TOP_BETTING_TIER2_CODES = [
  "RW",
  "ZM",
  "AO",
  "MZ",
  "ET",
  "TN",
  "MG",
  "MW",
  "BW",
  "NA",
  "MU",
  "BE",
  "CH",
  "PT",
  "NL",
  "DK",
  "IE",
  "AT",
  "GR",
  "CZ",
  "HU",
  "FI",
  "BG",
  "HR",
  "RS",
  "UA",
  "TR",
  "SK",
  "LT",
  "LV",
  "EE",
  "CL",
  "PE",
  "EC",
  "UY",
  "PY",
  "BO",
  "CR",
  "PA",
  "DO",
  "GT",
  "HN",
  "SV",
  "NI",
  "NZ",
  "KR",
  "KZ",
  "GE",
  "AZ",
] as const;

const TIER1_RANK = new Map<string, number>(TOP_BETTING_TIER1_CODES.map((c, i) => [c, i]));
const TIER2_RANK = new Map<string, number>(TOP_BETTING_TIER2_CODES.map((c, i) => [c, i]));

const AFRICA_CODES = new Set(
  "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW".split(
    " ",
  ),
);

const EUROPE_CODES = new Set(
  "AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK".split(
    " ",
  ),
);

const AMERICAS_CODES = new Set(
  "AG AI AR AW BB BL BM BO BQ BR BS BZ CA CL CO CR CU CW DM DO EC FK GD GF GL GP GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PM PR PY SR SV SX TC TT US UY VC VE VG VI".split(
    " ",
  ),
);

const OCEANIA_CODES = new Set(
  "AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS".split(" "),
);

export function getCountryContinent(code: string): ContinentKey {
  const upper = code.trim().toUpperCase();
  if (upper === "GLOBAL" || upper === "ALL") return "global";
  if (AFRICA_CODES.has(upper)) return "africa";
  if (EUROPE_CODES.has(upper)) return "europe";
  if (AMERICAS_CODES.has(upper)) return "americas";
  if (OCEANIA_CODES.has(upper)) return "oceania";
  return "asia";
}

export function getBettingPriorityTier(code: string): BettingPriorityTier {
  const upper = code.trim().toUpperCase();
  if (TIER1_RANK.has(upper)) return 1;
  if (TIER2_RANK.has(upper)) return 2;
  return 3;
}

export function getBettingPriorityRank(code: string): number {
  const upper = code.trim().toUpperCase();
  if (TIER1_RANK.has(upper)) return TIER1_RANK.get(upper)!;
  if (TIER2_RANK.has(upper)) return 100 + TIER2_RANK.get(upper)!;
  return 1000;
}

export function compareByBettingPriority(
  a: { code: string; nameFr?: string },
  b: { code: string; nameFr?: string },
): number {
  const rankDiff = getBettingPriorityRank(a.code) - getBettingPriorityRank(b.code);
  if (rankDiff !== 0) return rankDiff;
  return (a.nameFr ?? a.code).localeCompare(b.nameFr ?? b.code, "fr");
}
