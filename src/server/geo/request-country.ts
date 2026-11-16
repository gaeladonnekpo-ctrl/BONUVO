import "server-only";

import { cookies, headers } from "next/headers";
import {
  detectVisitorCountryCode,
  extractCookieCountry,
  extractGeoHeaderCountry,
} from "@/server/geo/country-resolve";

export async function resolvePublicRequestCountry(queryCountry?: string | null): Promise<string> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const { code } = detectVisitorCountryCode({
    queryCountry,
    cookieCountry: extractCookieCountry(cookieStore),
    headerCountry: extractGeoHeaderCountry(headerStore),
  });
  return code;
}
