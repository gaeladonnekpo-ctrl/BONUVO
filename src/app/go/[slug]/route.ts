import { NextResponse, type NextRequest } from "next/server";
import { resolveAndTrackGoRedirect } from "@/modules/affiliation/redirect-service";
import {
  detectVisitorCountryCode,
  extractCookieCountry,
  extractGeoHeaderCountry,
} from "@/server/geo/country-resolve";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const searchParams = request.nextUrl.searchParams;

  // Strictly resolve visitor country (never read destination URLs/hosts from query params).
  const { code: countryCode } = detectVisitorCountryCode({
    queryCountry: searchParams.get("pays"),
    cookieCountry: extractCookieCountry(request.cookies),
    headerCountry: extractGeoHeaderCountry(request.headers),
  });

  const rawCampaign =
    searchParams.get("utm_campaign") ?? searchParams.get("campaign") ?? searchParams.get("ref");

  const result = await resolveAndTrackGoRedirect({
    rawSlug: slug,
    countryCode,
    rawCampaignCode: rawCampaign,
    headers: request.headers,
  });

  if (result.kind === "rate_limited") {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Trop de redirections depuis cette adresse IP. Réessayez dans un instant.",
        },
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(result.retryAfterSeconds),
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  if (result.kind === "not_found") {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const response = NextResponse.redirect(result.location, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
