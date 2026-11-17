import { z } from "zod";
import type { ExternalFixtureDto, ProviderQuotaSnapshot } from "@/modules/ai/providers/types";

export const rawApiFixtureItemSchema = z.object({
  fixture: z.object({
    id: z.union([z.number(), z.string()]),
    date: z.string(),
    venue: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
    status: z.object({ short: z.string().nullable().optional() }),
  }),
  league: z.object({
    id: z.union([z.number(), z.string()]),
    season: z.number(),
    round: z.string().nullable().optional(),
  }),
  teams: z.object({
    home: z.object({
      id: z.union([z.number(), z.string()]),
      name: z.string(),
      logo: z.string().nullable().optional(),
    }),
    away: z.object({
      id: z.union([z.number(), z.string()]),
      name: z.string(),
      logo: z.string().nullable().optional(),
    }),
  }),
  goals: z.object({
    home: z.number().nullable().optional(),
    away: z.number().nullable().optional(),
  }),
});

export const rawApiStatsResponseSchema = z.object({
  response: z.object({
    team: z.object({ id: z.union([z.number(), z.string()]) }),
    league: z.object({
      id: z.union([z.number(), z.string()]),
      season: z.number(),
    }),
    form: z.string().nullable().optional(),
    fixtures: z.object({
      played: z.object({
        total: z.number().nullable(),
        home: z.number().nullable(),
        away: z.number().nullable(),
      }),
      wins: z.object({ total: z.number().nullable() }),
      draws: z.object({ total: z.number().nullable() }),
      loses: z.object({ total: z.number().nullable() }),
    }),
    goals: z.object({
      for: z.object({
        total: z.object({
          total: z.number().nullable(),
          home: z.number().nullable(),
          away: z.number().nullable(),
        }),
      }),
      against: z.object({
        total: z.object({
          total: z.number().nullable(),
          home: z.number().nullable(),
          away: z.number().nullable(),
        }),
      }),
    }),
    clean_sheet: z.object({ total: z.number().nullable().optional() }).optional(),
  }),
});

export const rawApiStandingsSchema = z.object({
  response: z.array(
    z.object({
      league: z.object({
        standings: z.array(
          z.array(
            z.object({
              rank: z.number(),
              points: z.number(),
              goalsDiff: z.number(),
              form: z.string().nullable().optional(),
              team: z.object({
                id: z.union([z.number(), z.string()]),
                name: z.string(),
              }),
              all: z.object({
                played: z.number(),
                win: z.number(),
                draw: z.number(),
                lose: z.number(),
              }),
            }),
          ),
        ),
      }),
    }),
  ),
});

export function mapFixtureStatus(
  shortCode: string | null | undefined,
): ExternalFixtureDto["status"] {
  const s = (shortCode ?? "").toUpperCase();
  if (["FT", "AET", "PEN"].includes(s)) return "finished";
  if (["1H", "HT", "2H", "ET", "P", "LIVE"].includes(s)) return "live";
  if (["PST"].includes(s)) return "postponed";
  if (["CANC"].includes(s)) return "cancelled";
  if (["ABD", "AWD", "WO"].includes(s)) return "abandoned";
  return "scheduled";
}

export function parseQuotaHeaders(headers: Headers): ProviderQuotaSnapshot {
  const limitRaw = headers.get("x-ratelimit-requests-limit");
  const remRaw = headers.get("x-ratelimit-requests-remaining");
  const limit = limitRaw && /^\d+$/.test(limitRaw) ? Number.parseInt(limitRaw, 10) : null;
  const remaining = remRaw && /^\d+$/.test(remRaw) ? Number.parseInt(remRaw, 10) : null;
  return { limit, remaining };
}
