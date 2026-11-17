import {
  buildCandidateFromParsed,
  extractFields,
  normalizeCommissionModel,
  normalizeConversionType,
  normalizeCurrencyCode,
  parseNonNegativeNumeric,
  parseOccurredAt,
} from "./helpers";
import { verifyPartnerRequest } from "./security";
import type { AdapterParseContext, ParsedPartnerEvent, PartnerAdapter } from "./types";

const BUNDLED_TAG_CLICK_REGEX = /(?:^|_|[0-9])c_(clk_[a-f0-9]{16,64})(?:$|_)/i;

function extractOneXClickId(fields: Record<string, string>): string | null {
  const direct =
    fields.subid || fields.sub_id || fields.clickid || fields.click_id || fields.aff_sub || "";
  if (direct.trim()) return direct.trim();

  const tag = fields.tag ?? "";
  const match = BUNDLED_TAG_CLICK_REGEX.exec(tag);
  return match?.[1] ?? null;
}

function invalidEvent(reason: string): ParsedPartnerEvent {
  return {
    ok: false,
    reason,
    externalEventId: "",
    publicClickId: null,
    promoCode: null,
    externalPlayerId: "",
    conversionType: "registration",
    amount: null,
    currencyCode: null,
    commissionAmount: null,
    commissionModel: "cpa",
    occurredAt: new Date(),
  };
}

export const oneXPartnersAdapter: PartnerAdapter = {
  key: "1xpartners",
  verify: verifyPartnerRequest,
  parse(ctx: AdapterParseContext): ParsedPartnerEvent {
    const fields = extractFields(ctx);
    const conversionType = normalizeConversionType(fields.status ?? fields.event);
    if (!conversionType) return invalidEvent("unsupported_conversion_type");

    const amountCheck = parseNonNegativeNumeric(fields.amount ?? fields.deposit ?? fields.sum);
    if (!amountCheck.ok) return invalidEvent("invalid_negative_or_nan_amount");

    const payoutCheck = parseNonNegativeNumeric(fields.payout ?? fields.commission);
    if (!payoutCheck.ok) return invalidEvent("invalid_negative_or_nan_payout");

    const needsCurrency = amountCheck.value !== null || payoutCheck.value !== null;
    const currencyCheck = normalizeCurrencyCode(fields.currency, needsCurrency);
    if (!currencyCheck.ok) return invalidEvent("invalid_or_unknown_currency");

    const rawPromo = (fields.promo_code ?? fields.promocode ?? "").trim().toUpperCase();
    return {
      ok: true,
      externalEventId: (fields.event_id ?? fields.tx_id ?? fields.transaction_id ?? "").trim(),
      publicClickId: extractOneXClickId(fields),
      promoCode: rawPromo || null,
      externalPlayerId: (fields.player_id ?? fields.user_id ?? "").trim(),
      conversionType,
      amount: amountCheck.value,
      currencyCode: currencyCheck.code,
      commissionAmount: payoutCheck.value,
      commissionModel: normalizeCommissionModel(fields.model),
      occurredAt: parseOccurredAt(fields.occurred_at ?? fields.ts ?? fields.timestamp),
    };
  },
  toConversion: buildCandidateFromParsed,
};
