import { NextResponse, type NextRequest } from "next/server";
import { getPublicCouponTrackRecord } from "@/modules/ai/service/public-coupon-history";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import {
  createTestRateLimitBackend,
  createUpstashRateLimitBackend,
} from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

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

  const record = await getPublicCouponTrackRecord();
  return NextResponse.json(record, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
