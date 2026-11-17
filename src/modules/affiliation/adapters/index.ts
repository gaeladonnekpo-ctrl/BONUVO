import type { AffiliateAdapterKey } from "@/server/db/schema";
import {
  buildCandidateFromParsed,
  extractFields,
  normalizeCommissionModel,
  normalizeConversionType,
  normalizeCurrencyCode,
  parseNonNegativeNumeric,
  parseOccurredAt,
} from "./helpers";
import { oneWinPartnersAdapter } from "./one-win";
import { oneXPartnersAdapter } from "./one-x-partners";
import { verifyPartnerRequest } from "./security";
import type { AdapterParseContext, ParsedPartnerEvent, PartnerAdapter } from "./types";

const genericAdapter: PartnerAdapter = {
  key: "generic",
  verify: verifyPartnerRequest,
  parse(ctx: AdapterParseContext): ParsedPartnerEvent {
    const fields = extractFields(ctx);
    const conversionType = normalizeConversionType(fields.event ?? fields.status ?? fields.type);
    if (!conversionType) {
      return {
        ok: false,
        reason: "unsupported_conversion_type",
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

    const amountCheck = parseNonNegativeNumeric(fields.amount ?? fields.sum);
    if (!amountCheck.ok) {
      return {
        ok: false,
        reason: "invalid_negative_or_nan_amount",
        externalEventId: "",
        publicClickId: null,
        promoCode: null,
        externalPlayerId: "",
        conversionType,
        amount: null,
        currencyCode: null,
        commissionAmount: null,
        commissionModel: "cpa",
        occurredAt: new Date(),
      };
    }

    const payoutCheck = parseNonNegativeNumeric(fields.payout ?? fields.commission);
    if (!payoutCheck.ok) {
      return {
        ok: false,
        reason: "invalid_negative_or_nan_payout",
        externalEventId: "",
        publicClickId: null,
        promoCode: null,
        externalPlayerId: "",
        conversionType,
        amount: null,
        currencyCode: null,
        commissionAmount: null,
        commissionModel: "cpa",
        occurredAt: new Date(),
      };
    }

    const currencyCheck = normalizeCurrencyCode(
      fields.currency,
      amountCheck.value !== null || payoutCheck.value !== null,
    );
    if (!currencyCheck.ok) {
      return {
        ok: false,
        reason: "invalid_or_unknown_currency",
        externalEventId: "",
        publicClickId: null,
        promoCode: null,
        externalPlayerId: "",
        conversionType,
        amount: null,
        currencyCode: null,
        commissionAmount: null,
        commissionModel: "cpa",
        occurredAt: new Date(),
      };
    }

    const clickId = (
      fields.clickid ??
      fields.click_id ??
      fields.subid ??
      fields.sub_id ??
      ""
    ).trim();
    const rawPromo = (fields.promo_code ?? fields.promocode ?? "").trim().toUpperCase();

    return {
      ok: true,
      externalEventId: (fields.event_id ?? fields.tx_id ?? fields.transaction_id ?? "").trim(),
      publicClickId: clickId || null,
      promoCode: rawPromo || null,
      externalPlayerId: (fields.player_id ?? fields.customer_id ?? "").trim(),
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

export function getPartnerAdapter(key: AffiliateAdapterKey): PartnerAdapter {
  if (key === "1xpartners") return oneXPartnersAdapter;
  if (key === "1win") return oneWinPartnersAdapter;
  return genericAdapter;
}
