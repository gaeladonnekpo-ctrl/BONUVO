import { ESPN_LEAGUE_SLUG_MAP } from "@/modules/ai/providers/espn-soccer-schemas";
import type { TeamKeyPlayerStat } from "@/modules/ai/providers/types";

const ROSTER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PLAYER_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const rosterCache = new Map<string, { expiresAt: number; photos: Map<string, string> }>();
const playerCache = new Map<string, { expiresAt: number; photoUrl: string | null }>();

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function doesTeamNameMatch(
  candidateTeam: string | undefined,
  expectedTeam: string,
): boolean {
  if (!candidateTeam || !expectedTeam) return false;
  const cand = normalizePlayerName(candidateTeam);
  const exp = normalizePlayerName(expectedTeam);
  if (!cand || !exp) return false;
  if (cand === exp || cand.includes(exp) || exp.includes(cand)) return true;

  const stopWords = new Set(["fc", "cf", "ac", "as", "sc", "afc", "rc", "og", "us", "ss"]);
  const expTokens = exp.split(" ").filter((t) => t.length >= 3 && !stopWords.has(t));
  const candTokens = new Set(cand.split(" ").filter((t) => t.length >= 3 && !stopWords.has(t)));
  return expTokens.some((t) => candTokens.has(t));
}

function resolveEspnLeagueSlug(leagueExternalId: string, leagueName: string): string | null {
  const cleaned = leagueExternalId.replace(/^espn-/, "");
  if (ESPN_LEAGUE_SLUG_MAP[cleaned]) return ESPN_LEAGUE_SLUG_MAP[cleaned];
  if (/^[a-z]{3}\.[0-9]+$/i.test(cleaned) || cleaned.startsWith("uefa.")) return cleaned;

  const lower = leagueName.toLowerCase();
  if (lower.includes("ligue 1")) return "fra.1";
  if (lower.includes("premier league")) return "eng.1";
  if (lower.includes("la liga") || lower.includes("laliga")) return "esp.1";
  if (lower.includes("serie a")) return "ita.1";
  if (lower.includes("bundesliga")) return "ger.1";
  if (lower.includes("champions league")) return "uefa.champions";
  if (lower.includes("europa league")) return "uefa.europa";
  return null;
}

async function fetchEspnTeamRosterPhotos(
  leagueSlug: string,
  teamExternalId: string,
): Promise<Map<string, string>> {
  const cleanTeamId = teamExternalId.replace(/^espn-/, "").trim();
  if (!cleanTeamId || !/^\d+$/.test(cleanTeamId)) return new Map();

  const cacheKey = `${leagueSlug}:${cleanTeamId}`;
  const cached = rosterCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.photos;
  }

  const photos = new Map<string, string>();
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(
      leagueSlug,
    )}/teams/${encodeURIComponent(cleanTeamId)}/roster`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 21600 },
    });
    if (!res.ok) return photos;

    const json = (await res.json()) as {
      athletes?: Array<{
        displayName?: string;
        fullName?: string;
        headshot?: { href?: string };
      }>;
    };

    for (const athlete of json.athletes ?? []) {
      const href = athlete.headshot?.href?.trim();
      if (!href) continue;

      if (athlete.displayName) {
        photos.set(normalizePlayerName(athlete.displayName), href);
      }
      if (athlete.fullName) {
        photos.set(normalizePlayerName(athlete.fullName), href);
      }
    }

    rosterCache.set(cacheKey, {
      expiresAt: Date.now() + ROSTER_CACHE_TTL_MS,
      photos,
    });
  } catch {
    // Fail silently and fall back to secondary verified source / monogram
  }

  return photos;
}

async function fetchTheSportsDbPlayerPhoto(
  playerName: string,
  teamName: string,
): Promise<string | null> {
  const normPlayer = normalizePlayerName(playerName);
  const normTeam = normalizePlayerName(teamName);
  if (!normPlayer || !normTeam) return null;

  const cacheKey = `${normTeam}:${normPlayer}`;
  const cached = playerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.photoUrl;
  }

  let resolvedUrl: string | null = null;
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(
      playerName,
    )}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 43200 },
    });
    if (res.ok) {
      const json = (await res.json()) as {
        player?: Array<{
          strPlayer?: string;
          strSport?: string;
          strTeam?: string;
          strCutout?: string | null;
          strThumb?: string | null;
        }> | null;
      };
      const match = (json.player ?? []).find(
        (candidate) =>
          candidate.strSport === "Soccer" &&
          normalizePlayerName(candidate.strPlayer ?? "") === normPlayer &&
          doesTeamNameMatch(candidate.strTeam, teamName),
      );
      const rawUrl = match?.strCutout?.trim() || match?.strThumb?.trim() || null;
      if (rawUrl && rawUrl.startsWith("https://")) {
        resolvedUrl = rawUrl;
      }
    }
  } catch {
    // Ignore transient errors and allow clean monogram fallback
  }

  playerCache.set(cacheKey, {
    expiresAt: Date.now() + PLAYER_CACHE_TTL_MS,
    photoUrl: resolvedUrl,
  });
  return resolvedUrl;
}

/**
 * Dynamically enriches key player stats with official verified player photos for the selected match
 * (ESPN headshot first, then team-verified TheSportsDB portrait; never uses mismatched homonyms).
 */
export async function enrichKeyPlayersWithOfficialPhotos(params: {
  players: TeamKeyPlayerStat[];
  leagueExternalId: string;
  leagueName: string;
  teamExternalId: string;
  teamName?: string;
}): Promise<TeamKeyPlayerStat[]> {
  if (params.players.length === 0) return params.players;
  if (!params.players.some((p) => !p.photoUrl)) return params.players;

  const leagueSlug = resolveEspnLeagueSlug(params.leagueExternalId, params.leagueName);
  const rosterPhotos = leagueSlug
    ? await fetchEspnTeamRosterPhotos(leagueSlug, params.teamExternalId)
    : new Map<string, string>();

  return Promise.all(
    params.players.map(async (player) => {
      if (player.photoUrl) return player;

      const normalized = normalizePlayerName(player.name);
      const espnMatch = rosterPhotos.get(normalized);
      if (espnMatch) {
        return { ...player, photoUrl: espnMatch };
      }

      if (params.teamName) {
        const tsdbMatch = await fetchTheSportsDbPlayerPhoto(player.name, params.teamName);
        if (tsdbMatch) {
          return { ...player, photoUrl: tsdbMatch };
        }
      }

      return player;
    }),
  );
}
