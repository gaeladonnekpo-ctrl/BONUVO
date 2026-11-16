import "server-only";

import { isbot } from "isbot";
import type { DeviceType } from "@/server/db/schema/public-events";
import { hmacSha256Hex } from "@/server/security/ip";

export interface VisitorFingerprint {
  deviceType: DeviceType;
  isBot: boolean;
  botReason: string;
  userAgentTruncated: string;
  referrerHost: string;
  visitorDailyHash: string;
  anonSessionHash: string;
}

export function classifyDeviceType(userAgent: string, botDetected: boolean): DeviceType {
  if (botDetected) return "bot";
  const lower = userAgent.toLowerCase();
  if (!lower) return "unknown";
  if (/(ipad|tablet|playbook|silk|android(?!.*mobile))/i.test(lower)) {
    return "tablet";
  }
  if (/(mobi|iphone|ipod|android.*mobile|windows phone)/i.test(lower)) {
    return "mobile";
  }
  return "desktop";
}

export function extractReferrerHost(rawReferrer: string | null): string {
  if (!rawReferrer) return "";
  try {
    const parsed = new URL(rawReferrer.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.hostname.toLowerCase().slice(0, 120);
  } catch {
    return "";
  }
}

export function computeVisitorDailyHash(ip: string, userAgent: string, secret: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return hmacSha256Hex(`visit:${day}:${ip.trim()}:${userAgent.slice(0, 160)}`, secret);
}

export function computeAnonSessionHash(ip: string, userAgent: string, secret: string): string {
  const hourBucket = new Date().toISOString().slice(0, 13);
  return hmacSha256Hex(`session:${hourBucket}:${ip.trim()}:${userAgent.slice(0, 160)}`, secret);
}

export function inspectVisitorRequest(params: {
  headers: Pick<Headers, "get">;
  ip: string;
  secret: string;
}): VisitorFingerprint {
  const rawUa = (params.headers.get("user-agent") ?? "").trim();
  const botDetected = rawUa.length === 0 ? true : isbot(rawUa);
  const botReason = rawUa.length === 0 ? "missing_user_agent" : botDetected ? "known_bot_ua" : "";

  return {
    deviceType: classifyDeviceType(rawUa, botDetected),
    isBot: botDetected,
    botReason,
    userAgentTruncated: rawUa.slice(0, 240),
    referrerHost: extractReferrerHost(params.headers.get("referer")),
    visitorDailyHash: computeVisitorDailyHash(params.ip, rawUa, params.secret),
    anonSessionHash: computeAnonSessionHash(params.ip, rawUa, params.secret),
  };
}
