import "server-only";

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { withAppDb, type AppDbTransaction } from "@/server/db/context";
import { bookmakers, clicks, commissions, conversions, countries } from "@/server/db/schema";
import { can } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { buildCsvDocument } from "@/modules/intelligence/csv";
import { formatRatioPercent } from "@/modules/intelligence/metrics-math";
import type { DrillDimension, DrillStep, ExportReportType } from "@/modules/intelligence/schema";
import type {
  BreakdownRow,
  DrilldownRow,
  IntelligenceDashboardData,
} from "@/modules/intelligence/stats-types";

export async function queryDrilldownRowsTx(
  tx: AppDbTransaction,
  params: {
    fromDate: string;
    toDate: string;
    dimension: DrillDimension;
    id: string;
    step: DrillStep;
    allowFinancials: boolean;
  },
): Promise<DrilldownRow[]> {
  const start = new Date(`${params.fromDate}T00:00:00.000Z`);
  const end = new Date(`${params.toDate}T23:59:59.999Z`);
  const [bmRows, countryRows] = await Promise.all([
    tx.select({ id: bookmakers.id, name: bookmakers.name }).from(bookmakers),
    tx.select({ id: countries.id, code: countries.code }).from(countries),
  ]);
  const bmNameMap = new Map(bmRows.map((b) => [b.id, b.name]));
  const countryCodeMap = new Map(countryRows.map((c) => [c.id, c.code]));
  const targetCountryId =
    params.dimension === "country"
      ? (countryRows.find((c) => c.code === params.id)?.id ?? null)
      : null;

  if (params.step === "clicks") {
    const conds = [
      gte(clicks.createdAt, start),
      lte(clicks.createdAt, end),
      eq(clicks.isBot, false),
      eq(clicks.isSuspect, false),
    ];
    if (params.dimension === "bookmaker") conds.push(eq(clicks.bookmakerId, params.id));
    else if (params.dimension === "country") conds.push(eq(clicks.countryCode, params.id));
    else if (params.dimension === "campaign") conds.push(eq(clicks.campaignId, params.id));
    else if (params.dimension === "offer") conds.push(eq(clicks.offerId, params.id));

    const rows = await tx
      .select({
        id: clicks.id,
        createdAt: clicks.createdAt,
        bookmakerId: clicks.bookmakerId,
        countryCode: clicks.countryCode,
        deviceType: clicks.deviceType,
        publicClickId: clicks.publicClickId,
      })
      .from(clicks)
      .where(and(...conds))
      .orderBy(desc(clicks.createdAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      occurredAtIso: r.createdAt.toISOString(),
      bookmakerName: bmNameMap.get(r.bookmakerId) ?? "—",
      countryCode: r.countryCode,
      typeOrStatus: `click (${r.deviceType})`,
      sourceLabel: r.publicClickId,
      amountLabel: "—",
    }));
  }

  if (params.step === "commissions") {
    if (!params.allowFinancials) {
      return [];
    }
    const conds = [
      gte(commissions.createdAt, start),
      lte(commissions.createdAt, end),
      inArray(commissions.status, ["confirmed", "paid"]),
    ];
    if (params.dimension === "bookmaker") conds.push(eq(commissions.bookmakerId, params.id));

    const rows = await tx
      .select({
        id: commissions.id,
        createdAt: commissions.createdAt,
        bookmakerId: commissions.bookmakerId,
        status: commissions.status,
        model: commissions.model,
        amount: commissions.amount,
        currencyCode: commissions.currencyCode,
        periodLabel: commissions.periodLabel,
      })
      .from(commissions)
      .where(and(...conds))
      .orderBy(desc(commissions.createdAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      occurredAtIso: r.createdAt.toISOString(),
      bookmakerName: bmNameMap.get(r.bookmakerId) ?? "—",
      countryCode: "—",
      typeOrStatus: `${r.model} · ${r.status}`,
      sourceLabel: r.periodLabel || "postback/import",
      amountLabel: `${r.amount} ${r.currencyCode}`,
    }));
  }

  const targetType = params.step === "first_deposits" ? "first_deposit" : "registration";
  const convConds = [
    gte(conversions.occurredAt, start),
    lte(conversions.occurredAt, end),
    eq(conversions.conversionType, targetType),
    inArray(conversions.status, ["recorded", "unattributed"]),
  ];
  if (params.dimension === "bookmaker") convConds.push(eq(conversions.bookmakerId, params.id));
  else if (params.dimension === "offer") convConds.push(eq(conversions.offerId, params.id));
  else if (params.dimension === "country" && targetCountryId) {
    convConds.push(eq(conversions.countryId, targetCountryId));
  }

  const convRows = await tx
    .select({
      id: conversions.id,
      occurredAt: conversions.occurredAt,
      bookmakerId: conversions.bookmakerId,
      countryId: conversions.countryId,
      conversionType: conversions.conversionType,
      source: conversions.source,
      attributionMode: conversions.attributionMode,
      amount: conversions.amount,
      currencyCode: conversions.currencyCode,
    })
    .from(conversions)
    .where(and(...convConds))
    .orderBy(desc(conversions.occurredAt))
    .limit(50);

  return convRows.map((r) => ({
    id: r.id,
    occurredAtIso: r.occurredAt.toISOString(),
    bookmakerName: bmNameMap.get(r.bookmakerId) ?? "—",
    countryCode: (r.countryId ? countryCodeMap.get(r.countryId) : undefined) ?? "GLOBAL",
    typeOrStatus: `${r.conversionType} (${r.attributionMode})`,
    sourceLabel: r.source,
    amountLabel:
      params.allowFinancials && r.amount ? `${r.amount} ${r.currencyCode ?? "EUR"}` : "—",
  }));
}

export async function queryStandaloneDrilldown(
  actor: AuthenticatedUser,
  params: {
    fromDate: string;
    toDate: string;
    dimension: DrillDimension;
    id: string;
    step: DrillStep;
  },
): Promise<DrilldownRow[]> {
  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) =>
    queryDrilldownRowsTx(tx, {
      ...params,
      allowFinancials: can(actor, "stats.export") || can(actor, "conversions.manage"),
    }),
  );
}

function breakdownRowsToCsv(rows: readonly BreakdownRow[]): string {
  const headers = [
    "dimension",
    "id",
    "label",
    "tracking_unavailable",
    "valid_clicks",
    "registrations",
    "first_deposits",
    "click_to_reg_rate",
    "reg_to_ftd_rate",
    "confirmed_commissions_count",
    "confirmed_commissions_eur",
  ];
  const body = rows.map((r) => [
    r.dimension,
    r.id,
    r.label,
    r.trackingUnavailable ? "true" : "false",
    r.validClicks,
    r.registrations ?? "N/A",
    r.firstDeposits ?? "N/A",
    formatRatioPercent(r.clickToRegRate, "en"),
    formatRatioPercent(r.regToFtdRate, "en"),
    r.confirmedCommissionsCount ?? "N/A",
    r.confirmedCommissionsEur !== null ? r.confirmedCommissionsEur.toFixed(2) : "N/A",
  ]);
  return buildCsvDocument(headers, body);
}

export function serializeDashboardReportToCsv(
  report: ExportReportType,
  data: IntelligenceDashboardData,
): string {
  if (report === "daily-overview") {
    return buildCsvDocument(
      [
        "period",
        "unique_visitors",
        "valid_clicks",
        "registrations",
        "first_deposits",
        "confirmed_commissions_eur",
      ],
      data.timeSeries.map((pt) => [
        pt.period,
        pt.uniqueVisitors,
        pt.validClicks,
        pt.registrations,
        pt.firstDeposits,
        pt.confirmedCommissionsEur.toFixed(2),
      ]),
    );
  }
  if (report === "bookmakers") return breakdownRowsToCsv(data.byBookmaker);
  if (report === "countries") return breakdownRowsToCsv(data.byCountry);
  if (report === "campaigns") return breakdownRowsToCsv(data.byCampaign);
  return breakdownRowsToCsv(data.byOffer);
}
