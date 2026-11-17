import { getServerEnv } from "@/server/env";

const FORBIDDEN_PROMO_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "garanti", regex: /\bgaranti(e|s|es|r)?\b/i },
  { label: "sûr", regex: /\b(sûr|sûrs|sûre|sûres|coup\s+sûr)\b/i },
  { label: "gain assuré", regex: /\bgain\s+assur[ée]/i },
  { label: "100%", regex: /\b100\s*%/i },
  { label: "sans risque", regex: /\bsans\s+risque\b/i },
  { label: "infaillible", regex: /\binfaillible\b/i },
  { label: "guaranteed", regex: /\bguaranteed?\b/i },
  { label: "risk-free", regex: /\brisk[-\s]?free\b/i },
  { label: "safe bet", regex: /\bsafe\s+bet\b/i },
  { label: "sure win", regex: /\bsure\s+win\b/i },
];

export function findForbiddenTerms(text: string): string[] {
  const normalized = text.normalize("NFKC");
  const hits: string[] = [];
  for (const entry of FORBIDDEN_PROMO_PATTERNS) {
    if (entry.regex.test(normalized)) {
      hits.push(entry.label);
    }
  }
  return hits;
}

export function assertNoForbiddenTerms(text: string): void {
  const hits = findForbiddenTerms(text);
  if (hits.length > 0) {
    throw new Error(`FORBIDDEN_LANGUAGE:${hits.join(",")}`);
  }
}

function collectAllowedNumericTokens(facts: unknown, out: Set<string>): void {
  if (typeof facts === "number" && Number.isFinite(facts)) {
    const fixed2 = facts.toFixed(2);
    const fixed1 = facts.toFixed(1);
    const fixed0 = Math.round(facts).toString();
    out.add(String(facts));
    out.add(fixed2);
    out.add(fixed1);
    out.add(fixed0);
    out.add(String(Math.round(facts * 100)));
    out.add((facts * 100).toFixed(1));
    return;
  }
  if (typeof facts === "string") {
    const matches = facts.match(/\d+(?:[.,]\d+)?/g) ?? [];
    for (const m of matches) out.add(m.replace(",", "."));
    return;
  }
  if (Array.isArray(facts)) {
    for (const item of facts) collectAllowedNumericTokens(item, out);
    return;
  }
  if (facts && typeof facts === "object") {
    for (const value of Object.values(facts)) {
      collectAllowedNumericTokens(value, out);
    }
  }
}

/**
 * Verifies every numeric literal present in an LLM-generated analysis appears
 * in the deterministic input fact object (tolerating comma/dot decimals and integer percentages).
 */
export function verifyNarrativeNumbersInFacts(
  text: string,
  facts: Record<string, unknown>,
): { valid: boolean; unknownNumbers: string[] } {
  const allowed = new Set<string>(["2.5"]); // Standard 2.5 market threshold
  collectAllowedNumericTokens(facts, allowed);

  const found = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const unknownNumbers: string[] = [];
  for (const raw of found) {
    const normalized = raw.replace(",", ".");
    if (!allowed.has(normalized)) {
      unknownNumbers.push(raw);
    }
  }

  return {
    valid: unknownNumbers.length === 0,
    unknownNumbers,
  };
}

let dailyLlmCalls = { dateKey: "", count: 0 };
const MAX_DAILY_LLM_CALLS = 50;

export async function generateVerifiedAnalysisText(params: {
  fallbackText: string;
  facts: Record<string, unknown>;
  locale?: "fr" | "en";
}): Promise<{ text: string; source: "deterministic" | "llm" }> {
  assertNoForbiddenTerms(params.fallbackText);

  const env = getServerEnv();
  if (!env.AI_LLM_ENABLED || !env.GEMINI_API_KEY) {
    return { text: params.fallbackText, source: "deterministic" };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dailyLlmCalls.dateKey !== today) {
    dailyLlmCalls = { dateKey: today, count: 0 };
  }
  if (dailyLlmCalls.count >= MAX_DAILY_LLM_CALLS) {
    return { text: params.fallbackText, source: "deterministic" };
  }

  try {
    dailyLlmCalls.count += 1;
    const prompt =
      params.locale === "en"
        ? `Write a concise, neutral 2-sentence statistical football match note using ONLY numbers present in these facts: ${JSON.stringify(params.facts)}. Never promise winnings.`
        : `Rédige une note statistique football neutre et concise de 2 phrases utilisant UNIQUEMENT les nombres présents dans ces faits : ${JSON.stringify(params.facts)}. Ne promets jamais de gain.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 180 },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      return { text: params.fallbackText, source: "deterministic" };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const candidate = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!candidate) {
      return { text: params.fallbackText, source: "deterministic" };
    }

    if (findForbiddenTerms(candidate).length > 0) {
      return { text: params.fallbackText, source: "deterministic" };
    }

    const numCheck = verifyNarrativeNumbersInFacts(candidate, params.facts);
    if (!numCheck.valid) {
      return { text: params.fallbackText, source: "deterministic" };
    }

    return { text: candidate, source: "llm" };
  } catch {
    return { text: params.fallbackText, source: "deterministic" };
  }
}
