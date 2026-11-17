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

export const oneWinPartnersAdapter: PartnerAdapter = {
  key: "1win",
  verify: verifyPartnerRequest,
  parse(ctx: AdapterParseContext): ParsedPartnerEvent {
    const fields = extractFields(ctx);
    const conversionType = normalizeConversionType(fields.event ?? fields.status);
    if (!conversionType) return invalidEvent("unsupported_conversion_type");

    const amountCheck = parseNonNegativeNumeric(fields.sum ?? fields.amount);
    if (!amountCheck.ok) return invalidEvent("invalid_negative_or_nan_amount");

    const payoutCheck = parseNonNegativeNumeric(fields.payout ?? fields.commission);
    if (!payoutCheck.ok) return invalidEvent("invalid_negative_or_nan_payout");

    const needsCurrency = amountCheck.value !== null || payoutCheck.value !== null;
    const currencyCheck = normalizeCurrencyCode(fields.currency, needsCurrency);
    if (!currencyCheck.ok) return invalidEvent("invalid_or_unknown_currency");

    const clickId = (
      fields.clickid ??
      fields.click_id ??
      fields.subid ??
      fields.sub_id ??
      fields.sub1 ??
      ""
    ).trim();
    const rawPromo = (fields.promo_code ?? fields.promocode ?? "").trim().toUpperCase();

    return {
      ok: true,
      externalEventId: (fields.event_id ?? fields.transaction_id ?? fields.tx_id ?? "").trim(),
      publicClickId: clickId || null,
      promoCode: rawPromo || null,
      externalPlayerId: (fields.player_id ?? fields.customer_id ?? "").trim(),
      conversionType,
      amount: amountCheck.value,
      currencyCode: currencyCheck.code,
      commissionAmount: payoutCheck.value,
      commissionModel: normalizeCommissionModel(
        fields.model ?? (fields.event === "revshare" ? "revshare" : "cpa"),
      ),
      occurredAt: parseOccurredAt(fields.occurred_at ?? fields.ts ?? fields.timestamp),
    };
  },
  toConversion: buildCandidateFromParsed,
};
