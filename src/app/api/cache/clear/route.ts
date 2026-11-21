import { NextResponse, type NextRequest } from "next/server";
import { invalidatePublicCatalogTags } from "@/server/cache/catalog-tags";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { checkSameOrigin } from "@/server/security/origin";
import {
  createTestRateLimitBackend,
  createUpstashRateLimitBackend,
} from "@/server/security/rate-limit";

let fallbackLimiter: ReturnType<typeof createTestRateLimitBackend> | null = null;
function getLimiter() {
  const upstash = createUpstashRateLimitBackend();
  if (upstash) return upstash;
  if (!fallbackLimiter) fallbackLimiter = createTestRateLimitBackend();
  return fallbackLimiter;
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const originCheck = checkSameOrigin(request.headers, env.NEXT_PUBLIC_SITE_URL);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN_ORIGIN", message: "Origine non autorisée." } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV)) ?? "00000000";
  const rl = await getLimiter().consume("public_events", ipHash);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "Veuillez patienter." } },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  invalidatePublicCatalogTags(["offers", "bookmakers", "promos", "predictions", "community"]);

  return NextResponse.json(
    { ok: true, clearedAt: new Date().toISOString() },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
