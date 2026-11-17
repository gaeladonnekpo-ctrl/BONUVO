const DANGEROUS_BLOCK_TAGS =
  /<\s*(script|iframe|object|embed|style|form|meta|link|base|applet)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;

const DANGEROUS_SELF_CLOSING_TAGS =
  /<\s*\/?\s*(script|iframe|object|embed|style|form|meta|link|base|applet)\b[^>]*\/?>/gi;

const EVENT_HANDLER_ATTRS = /\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const DANGEROUS_URI_ATTRS =
  /\b(href|src|xlink:href|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data):[^"]*"|'\s*(?:javascript|vbscript|data):[^']*'|(?:\s*(?:javascript|vbscript|data):[^\s>]+))/gi;

const RAW_HTML_TAGS = /<\/?[a-z][^>]*>/gi;

/**
 * Neutralise les balises dangereuses (<script>, <iframe>, etc.), les gestionnaires
 * d'événements inline (onerror, onclick...) et les schémas javascript:/data:.
 */
export function sanitizeEditorialContent(input: string): string {
  if (!input) {
    return "";
  }

  let cleaned = input
    .replace(/\0/g, "")
    .replace(DANGEROUS_BLOCK_TAGS, "")
    .replace(DANGEROUS_SELF_CLOSING_TAGS, "")
    .replace(EVENT_HANDLER_ATTRS, "")
    .replace(DANGEROUS_URI_ATTRS, '$1="#"');

  // Neutralise toute balise HTML résiduelle pour garantir un texte/Markdown sûr
  cleaned = cleaned
    .replace(RAW_HTML_TAGS, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "");

  return cleaned.trim();
}

/**
 * Génère un slug URL-safe à partir d'un titre ou d'un slug fourni.
 */
export function normalizePostSlug(raw: string): string {
  const base = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return base || `article-${Date.now()}`;
}
