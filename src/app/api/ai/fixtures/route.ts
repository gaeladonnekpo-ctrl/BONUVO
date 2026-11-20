import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  formatUtcDateIso,
  syncAndQueryFixturesByDate,
} from "@/modules/ai/service/date-sync-service";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import {
  createTestRateLimitBackend,
  createUpstashRateLimitBackend,
} from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tz: z.coerce.number().int().min(-720).max(840).optional().default(60),
});

let fallbackLimiter: ReturnType<typeof createTestRateLimitBackend> | null = null;
function getLimiter() {
  const upstash = createUpstashRateLimitBackend();
  if (upstash) return upstash;
  if (!fallbackLimiter) fallbackLimiter = createTestRateLimitBackend();
  return fallbackLimiter;
}

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV)) ?? "00000000";
  const rl = await getLimiter().consume("public_events", ipHash);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Trop de requêtes, veuillez patienter." } },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    date: sp.get("date") ?? undefined,
    tz: sp.get("tz") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_DATE", message: "Format de date invalide (YYYY-MM-DD)." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const dateIso = parsed.data.date ?? formatUtcDateIso(new Date(), parsed.data.tz);
  const data = await syncAndQueryFixturesByDate({
    dateIso,
    tzOffsetMinutes: parsed.data.tz,
  });

  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
