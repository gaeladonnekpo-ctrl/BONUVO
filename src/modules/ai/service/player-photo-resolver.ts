import { ESPN_LEAGUE_SLUG_MAP } from "@/modules/ai/providers/espn-soccer-schemas";
import type { TeamKeyPlayerStat } from "@/modules/ai/providers/types";

const ROSTER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const rosterCache = new Map<string, { expiresAt: number; photos: Map<string, string> }>();

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
        id?: string | number;
        displayName?: string;
        fullName?: string;
        headshot?: { href?: string };
      }>;
    };

    for (const athlete of json.athletes ?? []) {
      const id = athlete.id !== undefined ? String(athlete.id) : "";
      const href =
        athlete.headshot?.href?.trim() ||
        (id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png` : "");
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
    // Fail silently and keep monogram fallback if provider is unreachable
  }

  return photos;
}

/**
 * Dynamically enriches key player stats with official ESPN headshots for the selected match,
 * only matching exact player names on the team's official roster.
 */
export async function enrichKeyPlayersWithOfficialPhotos(params: {
  players: TeamKeyPlayerStat[];
  leagueExternalId: string;
  leagueName: string;
  teamExternalId: string;
}): Promise<TeamKeyPlayerStat[]> {
  if (params.players.length === 0) return params.players;
  const needsLookup = params.players.some((p) => !p.photoUrl);
  if (!needsLookup) return params.players;

  const leagueSlug = resolveEspnLeagueSlug(params.leagueExternalId, params.leagueName);
  if (!leagueSlug) return params.players;

  const rosterPhotos = await fetchEspnTeamRosterPhotos(leagueSlug, params.teamExternalId);
  if (rosterPhotos.size === 0) return params.players;

  return params.players.map((player) => {
    if (player.photoUrl) return player;
    const normalized = normalizePlayerName(player.name);
    const matched = rosterPhotos.get(normalized);
    if (matched) {
      return { ...player, photoUrl: matched };
    }
    // Partial surname + initial fallback only within the same team's official roster
    const tokens = normalized.split(" ").filter(Boolean);
    const lastToken = tokens[tokens.length - 1] ?? "";
    if (lastToken.length >= 4) {
      for (const [rosterName, url] of rosterPhotos.entries()) {
        if (rosterName.endsWith(lastToken) || rosterName.includes(` ${lastToken}`)) {
          return { ...player, photoUrl: url };
        }
      }
    }
    return player;
  });
}
