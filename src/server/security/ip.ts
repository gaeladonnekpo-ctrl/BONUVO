import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getServerEnv } from "@/server/env";

function extractValidIp(raw: string | null): string | null {
  if (!raw) return null;
  const candidate = raw.split(",")[0]?.trim() ?? "";
  if (!candidate) return null;
  return isIP(candidate) > 0 ? candidate : null;
}

/**
 * Extracts client IP strictly from platform-controlled headers (Vercel / Cloudflare)
 * so forged client `X-Forwarded-For` headers cannot bypass rate limiting (control R3).
 */
export function extractTrustedClientIp(
  headers: Pick<Headers, "get">,
  appEnv: "local" | "preview" | "production" = "local",
): string {
  const vercelIp = extractValidIp(headers.get("x-vercel-forwarded-for"));
  if (vercelIp) return vercelIp;

  const cfIp = extractValidIp(headers.get("cf-connecting-ip"));
  if (cfIp) return cfIp;

  const realIp = extractValidIp(headers.get("x-real-ip"));
  if (realIp) return realIp;

  if (appEnv === "local") {
    const localForwarded = extractValidIp(headers.get("x-forwarded-for"));
    if (localForwarded) return localForwarded;
    return "127.0.0.1";
  }

  return "untrusted-unknown-ip";
}

export function resolveIpHashSecret(): string | null {
  const env = getServerEnv();
  return env.IP_HASH_SECRET ?? null;
}

export function hmacSha256Hex(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashIp(ip: string, secretOverride?: string): string | null {
  const secret = secretOverride ?? resolveIpHashSecret();
  if (!secret) return null;
  return hmacSha256Hex(`ip:${ip.trim().toLowerCase()}`, secret);
}

export function hashIdentifier(identifier: string, secretOverride?: string): string | null {
  const secret = secretOverride ?? resolveIpHashSecret();
  if (!secret) return null;
  return hmacSha256Hex(`id:${identifier.trim().toLowerCase()}`, secret);
}
