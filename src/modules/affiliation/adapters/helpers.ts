import { ALLOWED_AFFILIATE_CURRENCIES } from "@/modules/affiliation/phase5-schema";
import type { CommissionModel, ConversionType } from "@/server/db/schema";
import type {
  AdapterParseContext,
  NormalizedConversionCandidate,
  ParsedPartnerEvent,
} from "./types";

export function extractFields(ctx: AdapterParseContext): Record<string, string> {
  const out: Record<string, string> = { ...ctx.query };
  const raw = ctx.rawBody.trim();
  if (!raw) return out;

  if (ctx.contentType.includes("application/json") || raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [key, val] of Object.entries(parsed)) {
          if (val !== null && val !== undefined && typeof val !== "object") {
            out[key] = String(val);
          }
        }
      }
    } catch {
      // Ignored: malformed JSON fails field validation downstream
    }
    return out;
  }

  if (ctx.contentType.includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(raw);
    for (const [key, val] of form.entries()) {
      out[key] = val;
    }
  }
  return out;
}

export function normalizeConversionType(raw: string | undefined): ConversionType | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (["registration", "reg", "lead", "signup"].includes(v)) return "registration";
  if (["ftd", "sale", "first_deposit", "first_time_deposit", "dep1"].includes(v)) {
    return "first_deposit";
  }
  if (["qualified", "cpa", "dep", "deposit", "confirmed", "revshare"].includes(v)) {
    return "qualified";
  }
  return null;
}

export function normalizeCommissionModel(raw: string | undefined): CommissionModel {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "revshare" || v === "hybrid") return v;
  return "cpa";
}

export function parseNonNegativeNumeric(raw: string | undefined): {
  ok: boolean;
  value: number | null;
} {
  if (raw === undefined || raw.trim() === "") return { ok: true, value: null };
  const num = Number(raw.trim());
  if (!Number.isFinite(num) || num < 0) return { ok: false, value: null };
  return { ok: true, value: Math.round(num * 100) / 100 };
}

export function normalizeCurrencyCode(
  raw: string | undefined,
  required: boolean,
): { ok: boolean; code: string | null } {
  const v = (raw ?? "").trim().toUpperCase();
  if (!v) {
    return required ? { ok: false, code: null } : { ok: true, code: null };
  }
  if (!ALLOWED_AFFILIATE_CURRENCIES.has(v)) {
    return { ok: false, code: null };
  }
  return { ok: true, code: v };
}

export function parseOccurredAt(raw: string | undefined): Date {
  if (!raw || !raw.trim()) return new Date();
  const trimmed = raw.trim();
  if (/^\d{10}$/.test(trimmed)) return new Date(Number(trimmed) * 1000);
  if (/^\d{13}$/.test(trimmed)) return new Date(Number(trimmed));
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function buildCandidateFromParsed(
  parsed: ParsedPartnerEvent,
): NormalizedConversionCandidate {
  return {
    externalEventId: parsed.externalEventId,
    publicClickId: parsed.publicClickId,
    promoCode: parsed.promoCode,
    externalPlayerId: parsed.externalPlayerId,
    conversionType: parsed.conversionType,
    amount: parsed.amount !== null ? parsed.amount.toFixed(2) : null,
    currencyCode: parsed.currencyCode,
    commissionAmount: parsed.commissionAmount !== null ? parsed.commissionAmount.toFixed(2) : null,
    commissionModel: parsed.commissionModel,
    occurredAt: parsed.occurredAt,
  };
}
