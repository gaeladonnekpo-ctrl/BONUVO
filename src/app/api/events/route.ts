import { NextResponse, type NextRequest } from "next/server";
import { recordPublicEvent } from "@/modules/offers/events-service";
import { getServerEnv } from "@/server/env";
import {
  detectVisitorCountryCode,
  extractCookieCountry,
  extractGeoHeaderCountry,
} from "@/server/geo/country-resolve";
import { checkSameOrigin } from "@/server/security/origin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const originCheck = checkSameOrigin(request.headers, env.NEXT_PUBLIC_SITE_URL);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN_ORIGIN", message: "Origine de requête non autorisée." } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Corps JSON invalide." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { code: fallbackCountryCode } = detectVisitorCountryCode({
    cookieCountry: extractCookieCountry(request.cookies),
    headerCountry: extractGeoHeaderCountry(request.headers),
  });

  const result = await recordPublicEvent({
    rawBody: body,
    fallbackCountryCode,
    headers: request.headers,
  });

  if (!result.ok) {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (result.retryAfterSeconds && result.status === 429) {
      headers["Retry-After"] = String(result.retryAfterSeconds);
    }
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.status, headers },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
