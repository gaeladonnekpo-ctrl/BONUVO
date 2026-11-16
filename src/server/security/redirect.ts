import "server-only";

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F\\]/;

/**
 * Control V4: ensures `next` / `redirect` parameters stay strictly on relative
 * same-origin paths and neutralizes open-redirect payloads (`//`, `https:`, `\`, CRLF).
 */
export function sanitizeRelativeRedirect(
  candidate: string | null | undefined,
  fallback = "/fr",
): string {
  if (!candidate || typeof candidate !== "string") {
    return fallback;
  }

  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  if (CONTROL_CHARS_REGEX.test(trimmed)) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, "https://bonuvo.invalid");
    if (parsed.origin !== "https://bonuvo.invalid") {
      return fallback;
    }
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
