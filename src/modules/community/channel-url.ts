const ALLOWED_CHANNEL_HOSTS = new Set([
  "t.me",
  "www.t.me",
  "telegram.me",
  "www.telegram.me",
  "whatsapp.com",
  "www.whatsapp.com",
  "chat.whatsapp.com",
  "wa.me",
  "www.wa.me",
]);

export type CommunityPlatform = "telegram" | "whatsapp_channel" | "whatsapp_group";

export type ChannelUrlValidationResult =
  | { ok: true; normalizedUrl: string; detectedPlatform: CommunityPlatform }
  | { ok: false; reason: string };

/**
 * Valide strictement qu'un lien de canal communautaire utilise HTTPS et pointe
 * vers un domaine officiel Telegram ou WhatsApp autorisé par l'architecture BONUVO.
 */
export function validateCommunityChannelUrl(
  rawUrl: string,
  expectedPlatform?: CommunityPlatform,
): ChannelUrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, reason: "EMPTY_CHANNEL_URL" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "INVALID_URL_FORMAT" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "HTTPS_REQUIRED" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "CREDENTIALS_FORBIDDEN" };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_CHANNEL_HOSTS.has(host)) {
    return { ok: false, reason: "DOMAIN_NOT_ALLOWED" };
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path || path === "/") {
    return { ok: false, reason: "CHANNEL_PATH_REQUIRED" };
  }

  const isTelegramHost = host.includes("t.me") || host.includes("telegram.me");
  const detectedPlatform: CommunityPlatform = isTelegramHost
    ? "telegram"
    : path.startsWith("/channel/")
      ? "whatsapp_channel"
      : "whatsapp_group";

  if (expectedPlatform) {
    if (expectedPlatform === "telegram" && !isTelegramHost) {
      return { ok: false, reason: "PLATFORM_DOMAIN_MISMATCH" };
    }
    if (expectedPlatform !== "telegram" && isTelegramHost) {
      return { ok: false, reason: "PLATFORM_DOMAIN_MISMATCH" };
    }
  }

  return {
    ok: true,
    normalizedUrl: parsed.toString(),
    detectedPlatform,
  };
}
