import "server-only";

import { and, asc, eq, gte, isNull, lte, max, sql } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  affiliateNetworks,
  bookmakers,
  campaigns,
  countries,
  dailyMetrics,
  offers,
  postbackEvents,
  visitEvents,
} from "@/server/db/schema";
import { can } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import {
  buildReferenceDailyRows,
  mergeRealAndReferenceRows,
  REFERENCE_DEMO_TOTALS,
  sumMetricTotals,
} from "@/modules/intelligence/reference-demo";
import { intelligenceFilterSchema } from "@/modules/intelligence/schema";
import { queryDrilldownRowsTx } from "@/modules/intelligence/stats-drilldown";
import {
  accumulateBreakdown,
  buildKpisAndFunnel,
  buildTimeSeries,
  computeDailyEvolution,
} from "@/modules/intelligence/stats-transform";
import type { IntelligenceDashboardData } from "@/modules/intelligence/stats-types";

function defaultFilterRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  return {
    fromDate: past.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  };
}

export async function queryIntelligenceDashboard(
  actor: AuthenticatedUser,
  rawSearchParams: Record<string, string | undefined>,
): Promise<IntelligenceDashboardData> {
  const defaults = defaultFilterRange();
  const parsed = intelligenceFilterSchema.safeParse({
    from: rawSearchParams.from || undefined,
    to: rawSearchParams.to || undefined,
    country: rawSearchParams.country || undefined,
    bookmakerId: rawSearchParams.bookmakerId || undefined,
    campaignId: rawSearchParams.campaignId || undefined,
    groupBy: rawSearchParams.groupBy || undefined,
    drillDimension: rawSearchParams.drillDimension || undefined,
    drillId: rawSearchParams.drillId || undefined,
    drillStep: rawSearchParams.drillStep || undefined,
    demo: rawSearchParams.demo || undefined,
  });

  const filter = parsed.success ? parsed.data : { groupBy: "day" as const };
  const fromDate = filter.from ?? defaults.fromDate;
  const toDate = filter.to ?? defaults.toDate;
  const country = filter.country && filter.country !== "ALL" ? filter.country : "ALL";
  const bookmakerId = filter.bookmakerId ?? "";
  const campaignId = filter.campaignId ?? "";
  const groupBy = filter.groupBy;
  const includeReference = (parsed.success ? parsed.data.demo : undefined) !== "0";
  const canExport = can(actor, "stats.export");
  const canAggregate = can(actor, "conversions.manage");
  const hideFinancials = !canExport && !canAggregate;

  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [
      countryRefs,
      bmRefs,
      offerRefs,
      campaignRefs,
      networkRefs,
      postbackLatest,
      lastAggRow,
      breakdownRows,
    ] = await Promise.all([
      tx
        .select({ code: countries.code, nameFr: countries.nameFr })
        .from(countries)
        .where(eq(countries.active, true))
        .orderBy(asc(countries.code)),
      tx
        .select({ id: bookmakers.id, name: bookmakers.name })
        .from(bookmakers)
        .where(isNull(bookmakers.deletedAt))
        .orderBy(asc(bookmakers.name)),
      tx
        .select({ id: offers.id, titleFr: offers.titleFr, bookmakerId: offers.bookmakerId })
        .from(offers)
        .where(isNull(offers.deletedAt)),
      tx
        .select({ id: campaigns.id, code: campaigns.code, name: campaigns.name })
        .from(campaigns)
        .where(isNull(campaigns.deletedAt))
        .orderBy(asc(campaigns.name)),
      tx
        .select({
          id: affiliateNetworks.id,
          name: affiliateNetworks.name,
          bookmakerId: affiliateNetworks.bookmakerId,
          trackingMode: affiliateNetworks.trackingMode,
        })
        .from(affiliateNetworks)
        .where(isNull(affiliateNetworks.deletedAt)),
      tx
        .select({
          networkId: postbackEvents.networkId,
          lastAt: max(postbackEvents.createdAt),
        })
        .from(postbackEvents)
        .groupBy(postbackEvents.networkId),
      tx.select({ lastAgg: max(dailyMetrics.aggregatedAt) }).from(dailyMetrics),
      tx
        .select()
        .from(dailyMetrics)
        .where(
          and(
            eq(dailyMetrics.grain, "breakdown"),
            gte(dailyMetrics.metricDate, fromDate),
            lte(dailyMetrics.metricDate, toDate),
            ...(country !== "ALL" ? [eq(dailyMetrics.countryCode, country)] : []),
            ...(bookmakerId ? [eq(dailyMetrics.bookmakerId, bookmakerId)] : []),
            ...(campaignId ? [eq(dailyMetrics.campaignId, campaignId)] : []),
          ),
        ),
    ]);

    const useDetailGrain = Boolean(bookmakerId || campaignId);
    const kpiSourceRows = useDetailGrain
      ? breakdownRows
      : await tx
          .select()
          .from(dailyMetrics)
          .where(
            and(
              eq(dailyMetrics.grain, country !== "ALL" ? "day_country" : "day_total"),
              gte(dailyMetrics.metricDate, fromDate),
              lte(dailyMetrics.metricDate, toDate),
              eq(dailyMetrics.countryCode, country),
            ),
          );

    const realHasAnyMetrics = kpiSourceRows.length > 0 || breakdownRows.length > 0;
    let realUniqueVisitors: number | null = useDetailGrain ? null : 0;
    if (!useDetailGrain && realHasAnyMetrics) {
      realUniqueVisitors = kpiSourceRows.reduce((s, r) => s + r.uniqueVisitors, 0);
    } else if (bookmakerId && !campaignId && realHasAnyMetrics) {
      const [visRow] = await tx
        .select({
          cnt: sql<number>`count(distinct (date_trunc('day', ${visitEvents.createdAt} AT TIME ZONE 'UTC'), ${visitEvents.visitorDailyHash}))::int`,
        })
        .from(visitEvents)
        .where(
          and(
            eq(visitEvents.isBot, false),
            eq(visitEvents.bookmakerId, bookmakerId),
            gte(visitEvents.createdAt, new Date(`${fromDate}T00:00:00.000Z`)),
            lte(visitEvents.createdAt, new Date(`${toDate}T23:59:59.999Z`)),
            ...(country !== "ALL" ? [eq(visitEvents.countryCode, country)] : []),
          ),
        );
      realUniqueVisitors = visRow?.cnt ?? 0;
    } else if (!realHasAnyMetrics) {
      realUniqueVisitors = null;
    }

    const realTotalsBase = sumMetricTotals(kpiSourceRows);
    const realTotals = {
      ...realTotalsBase,
      uniqueVisitors: realUniqueVisitors ?? realTotalsBase.uniqueVisitors,
    };

    const refRows = includeReference ? buildReferenceDailyRows(fromDate, toDate, country) : [];
    const effectiveRows = includeReference
      ? mergeRealAndReferenceRows(kpiSourceRows, refRows)
      : kpiSourceRows;
    const hasAnyMetrics = includeReference ? effectiveRows.length > 0 : realHasAnyMetrics;
    const uniqueVisitors = includeReference
      ? (realUniqueVisitors ?? 0) + REFERENCE_DEMO_TOTALS.uniqueVisitors
      : realUniqueVisitors;

    const { kpis, funnel } = buildKpisAndFunnel({
      rows: effectiveRows,
      uniqueVisitors,
      hasAnyMetrics,
      hideFinancials,
    });
    const timeSeries = buildTimeSeries(effectiveRows, groupBy, hideFinancials);
    const dailyEvolution = computeDailyEvolution(timeSeries);

    const bmMap = new Map(bmRefs.map((b) => [b.id, b.name]));
    const countryMap = new Map(countryRefs.map((c) => [c.code, c.nameFr]));
    const offerMap = new Map(offerRefs.map((o) => [o.id, o]));
    const campMap = new Map(campaignRefs.map((c) => [c.id, c]));

    const bmTrackingNone = new Set<string>();
    for (const bm of bmRefs) {
      const bmNets = networkRefs.filter((n) => n.bookmakerId === bm.id);
      if (bmNets.length === 0 || bmNets.every((n) => n.trackingMode === "none")) {
        bmTrackingNone.add(bm.id);
      }
    }

    const byBookmaker = accumulateBreakdown(
      breakdownRows,
      "bookmaker",
      (id) => ({
        label: bmMap.get(id) ?? "Bookmaker",
        trackingNone: bmTrackingNone.has(id),
      }),
      hideFinancials,
    );
    const byCountry = accumulateBreakdown(
      breakdownRows,
      "country",
      (code) => ({ label: countryMap.get(code) ?? code, secondary: code }),
      hideFinancials,
    );
    const byCampaign = accumulateBreakdown(
      breakdownRows,
      "campaign",
      (id) => ({
        label: campMap.get(id)?.name ?? id,
        secondary: campMap.get(id)?.code,
      }),
      hideFinancials,
    );
    const byOffer = accumulateBreakdown(
      breakdownRows,
      "offer",
      (id) => {
        const offer = offerMap.get(id);
        return {
          label: offer?.titleFr ?? id,
          secondary: offer ? bmMap.get(offer.bookmakerId) : undefined,
          trackingNone: offer ? bmTrackingNone.has(offer.bookmakerId) : false,
        };
      },
      hideFinancials,
    );

    const topOffers = [...byOffer]
      .sort(
        (a, b) =>
          (b.confirmedCommissionsEur ?? -1) - (a.confirmedCommissionsEur ?? -1) ||
          (b.firstDeposits ?? -1) - (a.firstDeposits ?? -1) ||
          b.validClicks - a.validClicks,
      )
      .slice(0, 10);

    const latestByNet = new Map(postbackLatest.map((p) => [p.networkId, p.lastAt]));
    const networksFreshness = networkRefs.map((n) => ({
      networkId: n.id,
      name: n.name,
      trackingMode: n.trackingMode,
      lastPostbackAtIso: latestByNet.get(n.id)?.toISOString() ?? null,
      hasMissingTracking: n.trackingMode === "none",
    }));

    const drilldown =
      filter.drillDimension && filter.drillId && filter.drillStep
        ? {
            dimension: filter.drillDimension,
            id: filter.drillId,
            step: filter.drillStep,
            rows: await queryDrilldownRowsTx(tx, {
              fromDate,
              toDate,
              dimension: filter.drillDimension,
              id: filter.drillId,
              step: filter.drillStep,
              allowFinancials: !hideFinancials,
            }),
          }
        : null;

    return {
      filters: { fromDate, toDate, country, bookmakerId, campaignId, groupBy, includeReference },
      canExport,
      canAggregate,
      hasAnyMetrics,
      lastAggregatedAtIso: lastAggRow[0]?.lastAgg?.toISOString() ?? null,
      kpis,
      funnel,
      timeSeries,
      dailyEvolution,
      referenceMeta: {
        active: includeReference,
        realTotals,
        referenceTotals: includeReference
          ? {
              uniqueVisitors: REFERENCE_DEMO_TOTALS.uniqueVisitors,
              validClicks: REFERENCE_DEMO_TOTALS.validClicks,
              registrations: REFERENCE_DEMO_TOTALS.registrations,
              firstDeposits: REFERENCE_DEMO_TOTALS.firstDeposits,
              promoCopies: REFERENCE_DEMO_TOTALS.promoCopies,
            }
          : {
              uniqueVisitors: 0,
              validClicks: 0,
              registrations: 0,
              firstDeposits: 0,
              promoCopies: 0,
            },
      },
      byBookmaker,
      byCountry,
      byCampaign,
      byOffer,
      topOffers,
      networksFreshness,
      filterOptions: {
        countries: countryRefs.map((c) => ({ code: c.code, name: c.nameFr })),
        bookmakers: bmRefs,
        campaigns: campaignRefs,
      },
      drilldown,
    };
  });
}
