import type {
  AffiliateAdapterKey,
  CommissionModel,
  ConversionType,
  SignatureMode,
} from "@/server/db/schema";

export interface AffiliateNetworkConfig {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly bookmakerId: string | null;
  readonly adapterKey: AffiliateAdapterKey;
  readonly subIdParamName: string;
  readonly secretEnvRef: string;
  readonly signatureMode: SignatureMode;
  readonly signatureHeader: string;
  readonly allowedIps: readonly string[];
  readonly timestampToleranceSeconds: number;
}

export interface AdapterVerifyContext {
  readonly network: AffiliateNetworkConfig;
  readonly method: "GET" | "POST";
  readonly clientIp: string;
  readonly query: Record<string, string>;
  readonly headers: Record<string, string>;
  readonly rawBody: string;
  readonly now?: Date;
}

export interface AdapterVerifyResult {
  readonly ok: boolean;
  readonly status: 200 | 401 | 403 | 503;
  readonly reason: string;
  readonly eventTimestamp: Date | null;
}

export interface AdapterParseContext {
  readonly query: Record<string, string>;
  readonly rawBody: string;
  readonly contentType: string;
}

export interface ParsedPartnerEvent {
  readonly ok: boolean;
  readonly reason?: string;
  readonly externalEventId: string;
  readonly publicClickId: string | null;
  readonly promoCode: string | null;
  readonly externalPlayerId: string;
  readonly conversionType: ConversionType;
  readonly amount: number | null;
  readonly currencyCode: string | null;
  readonly commissionAmount: number | null;
  readonly commissionModel: CommissionModel;
  readonly occurredAt: Date;
}

export interface NormalizedConversionCandidate {
  readonly externalEventId: string;
  readonly publicClickId: string | null;
  readonly promoCode: string | null;
  readonly externalPlayerId: string;
  readonly conversionType: ConversionType;
  readonly amount: string | null;
  readonly currencyCode: string | null;
  readonly commissionAmount: string | null;
  readonly commissionModel: CommissionModel;
  readonly occurredAt: Date;
}

export interface PartnerAdapter {
  readonly key: AffiliateAdapterKey;
  verify(ctx: AdapterVerifyContext): AdapterVerifyResult;
  parse(ctx: AdapterParseContext): ParsedPartnerEvent;
  toConversion(parsed: ParsedPartnerEvent): NormalizedConversionCandidate;
}
