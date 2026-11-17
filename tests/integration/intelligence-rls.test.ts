import dotenv from "dotenv";
import path from "node:path";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { computeDailyMetricRows } from "@/modules/intelligence/metrics-math";
import { resolveSslOption, sanitizePostgresUrl } from "@/server/db/connection-config";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

class TestRollbackSignal extends Error {
  constructor() {
    super("ROLLBACK_SUCCESS");
  }
}

const hasDbEnv = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const sqlClient = hasDbEnv
  ? postgres(sanitizePostgresUrl(parseServerEnv(process.env).DATABASE_URL), {
      max: 1,
      prepare: false,
      ssl: resolveSslOption(parseServerEnv(process.env).DATABASE_SSL),
    })
  : null;

afterAll(async () => {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 });
  }
});

async function assertSqlThrows(
  tx: postgres.TransactionSql,
  savepoint: string,
  fn: () => Promise<unknown>,
  label: string,
) {
  await tx.unsafe(`SAVEPOINT ${savepoint}`);
  let err: unknown = null;
  try {
    await fn();
  } catch (caught) {
    err = caught;
    await tx.unsafe(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  }
  expect(err, label).toBeTruthy();
}

describe("Phase 6 — Intégration PostgreSQL RLS daily_metrics, idempotence et rôle analyst", () => {
  it.skipIf(!sqlClient)(
    "prouve l'égalité exacte SQL vs agrégat idempotent, la lecture seule analyst et le rejet member",
    async () => {
      const sql = sqlClient!;

      await expect(
        sql.begin(async (tx) => {
          const adminId = "aaaaaaaa-6666-4666-8666-666666666661";
          const analystId = "aaaaaaaa-6666-4666-8666-666666666662";
          const memberId = "aaaaaaaa-6666-4666-8666-666666666663";
          const clickId = "cccccccc-6666-4666-8666-666666666661";

          await tx`
            INSERT INTO public.profiles (id, email, display_name) VALUES
              (${adminId}, 'p6-admin@bonuvo.test', 'Admin P6'),
              (${analystId}, 'p6-analyst@bonuvo.test', 'Analyst P6'),
              (${memberId}, 'p6-member@bonuvo.test', 'Member P6')
          `;

          const roleRows = await tx`SELECT id, name FROM public.roles`;
          const roleId = (name: string) => roleRows.find((r) => r.name === name)!.id as string;

          await tx`
            INSERT INTO public.user_roles (user_id, role_id) VALUES
              (${adminId}, ${roleId("admin")}),
              (${analystId}, ${roleId("analyst")}),
              (${memberId}, ${roleId("member")})
          `;

          await tx`SET LOCAL ROLE bonuvo_app`;
          await tx`SELECT set_config('app.current_user_id', ${adminId}, true), set_config('app.db_scope', 'user_session', true)`;

          const [bm] = await tx`
            INSERT INTO public.bookmakers (name, slug, allowed_hosts, status)
            VALUES ('Phase6 TestBet', 'p6-testbet', ARRAY['p6.example']::text[], 'active')
            RETURNING id
          `;
          const [net] = await tx`
            INSERT INTO public.affiliate_networks (slug, name, bookmaker_id, adapter_key, tracking_mode, secret_env_ref, signature_mode)
            VALUES ('p6-net', 'P6 Network', ${bm!.id}, 'generic', 'postback', 'AFFILIATE_P6_SECRET', 'token')
            RETURNING id
          `;
          const [link] = await tx`
            INSERT INTO public.affiliate_links (slug, bookmaker_id, network_id, destination_url, allowed_host, active, status)
            VALUES ('p6-go', ${bm!.id}, ${net!.id}, 'https://p6.example/reg', 'p6.example', true, 'active')
            RETURNING id
          `;

          const targetDate = "2026-11-16";
          const ts = new Date(`${targetDate}T12:00:00.000Z`);

          await tx`SELECT set_config('app.db_scope', 'public_tracking', true)`;
          await tx`
            INSERT INTO public.visit_events (event_type, path, bookmaker_id, country_code, device_type, visitor_daily_hash, is_bot, created_at)
            VALUES
              ('page_view', '/fr/offres', NULL, 'BJ', 'desktop', 'p6-vis-1', false, ${ts}),
              ('page_view', '/fr/offres', NULL, 'BJ', 'bot', 'p6-vis-bot', true, ${ts})
          `;
          await tx`
            INSERT INTO public.clicks (id, public_click_id, affiliate_link_id, bookmaker_id, country_code, device_type, ip_hash, anon_session_hash, is_bot, is_suspect, created_at)
            VALUES
              (${clickId}, 'clk_p6_valid_1', ${link!.id}, ${bm!.id}, 'BJ', 'mobile', 'h1', 's1', false, false, ${ts}),
              ('cccccccc-6666-4666-8666-666666666662', 'clk_p6_suspect', ${link!.id}, ${bm!.id}, 'BJ', 'mobile', 'h2', 's2', false, true, ${ts})
          `;

          await tx`SELECT set_config('app.db_scope', 'postback_ingest', true)`;
          const [pb] = await tx`
            INSERT INTO public.postback_events (network_id, network_slug, source_type, external_event_id, signature_valid, processing_status, click_id)
            VALUES (${net!.id}, 'p6-net', 'postback', 'ext-p6-1', true, 'processed', ${clickId})
            RETURNING id
          `;
          const [conv] = await tx`
            INSERT INTO public.conversions (network_id, bookmaker_id, click_id, postback_event_id, external_event_id, conversion_type, attribution_mode, source, status, amount, currency_code, occurred_at)
            VALUES (${net!.id}, ${bm!.id}, ${clickId}, ${pb!.id}, 'ext-p6-1', 'first_deposit', 'click_id', 'postback', 'recorded', '25.00', 'EUR', ${ts})
            RETURNING id
          `;

          await tx`SELECT set_config('app.db_scope', 'user_session', true)`;
          const [comm] = await tx`
            INSERT INTO public.commissions (conversion_id, bookmaker_id, model, amount, currency_code, status, proof_reference, created_at)
            VALUES (${conv!.id}, ${bm!.id}, 'cpa', '30.00', 'EUR', 'confirmed', 'INV-P6-001', ${ts})
            RETURNING id
          `;

          // Portée machine stats_aggregator : agrégation + double exécution idempotente
          await tx`SELECT set_config('app.current_user_id', '', true), set_config('app.db_scope', 'stats_aggregator', true)`;

          const computed = computeDailyMetricRows({
            visits: [
              {
                metricDate: targetDate,
                countryCode: "BJ",
                bookmakerId: null,
                offerId: null,
                eventType: "page_view",
                visitorDailyHash: "p6-vis-1",
                isBot: false,
              },
              {
                metricDate: targetDate,
                countryCode: "BJ",
                bookmakerId: null,
                offerId: null,
                eventType: "page_view",
                visitorDailyHash: "p6-vis-bot",
                isBot: true,
              },
            ],
            clicks: [
              {
                metricDate: targetDate,
                countryCode: "BJ",
                bookmakerId: bm!.id,
                offerId: null,
                campaignId: null,
                isBot: false,
                isSuspect: false,
              },
              {
                metricDate: targetDate,
                countryCode: "BJ",
                bookmakerId: bm!.id,
                offerId: null,
                campaignId: null,
                isBot: false,
                isSuspect: true,
              },
            ],
            conversions: [
              {
                metricDate: targetDate,
                countryCode: "BJ",
                bookmakerId: bm!.id,
                offerId: null,
                campaignId: null,
                conversionType: "first_deposit",
                status: "recorded",
              },
            ],
            commissions: [
              {
                metricDate: targetDate,
                countryCode: "BJ",
                bookmakerId: bm!.id,
                offerId: null,
                campaignId: null,
                status: "confirmed",
                amount: 30,
                currencyCode: "EUR",
              },
            ],
          });

          for (let run = 0; run < 2; run++) {
            await tx`DELETE FROM public.daily_metrics WHERE metric_date = ${targetDate}`;
            for (const row of computed) {
              await tx`
                INSERT INTO public.daily_metrics (
                  dimension_key, grain, metric_date, country_code, bookmaker_id, offer_id, campaign_id,
                  unique_visitors, page_views, offer_views, promo_copies, raw_clicks, valid_clicks,
                  registrations, first_deposits, qualified_conversions, confirmed_commissions_count,
                  confirmed_commissions_eur, pending_commissions_eur
                ) VALUES (
                  ${row.dimensionKey}, ${row.grain}, ${row.metricDate}, ${row.countryCode}, ${row.bookmakerId}, ${row.offerId}, ${row.campaignId},
                  ${row.uniqueVisitors}, ${row.pageViews}, ${row.offerViews}, ${row.promoCopies}, ${row.rawClicks}, ${row.validClicks},
                  ${row.registrations}, ${row.firstDeposits}, ${row.qualifiedConversions}, ${row.confirmedCommissionsCount},
                  ${row.confirmedCommissionsEur}, ${row.pendingCommissionsEur}
                )
              `;
            }
          }

          const [dayTotal] = await tx`
            SELECT unique_visitors, raw_clicks, valid_clicks, first_deposits, confirmed_commissions_eur
            FROM public.daily_metrics
            WHERE grain = 'day_total' AND metric_date = ${targetDate}
          `;
          const [directClickSql] = await tx`
            SELECT count(*)::int AS cnt FROM public.clicks WHERE created_at >= ${`${targetDate}T00:00:00Z`}::timestamptz AND created_at <= ${`${targetDate}T23:59:59Z`}::timestamptz AND is_bot = false AND is_suspect = false AND bookmaker_id = ${bm!.id}
          `;
          expect(dayTotal!.unique_visitors).toBe(1);
          expect(dayTotal!.raw_clicks).toBe(2);
          expect(dayTotal!.valid_clicks).toBe(directClickSql!.cnt);
          expect(dayTotal!.first_deposits).toBe(1);
          expect(dayTotal!.confirmed_commissions_eur).toBe("30.00");

          // stats_aggregator ne peut pas lire profiles
          const aggProfiles = await tx`SELECT id FROM public.profiles`;
          expect(aggProfiles).toHaveLength(0);

          // analyst : lecture OK, écriture strictement interdite
          await tx`SELECT set_config('app.current_user_id', ${analystId}, true), set_config('app.db_scope', 'user_session', true)`;
          const analystRows =
            await tx`SELECT id FROM public.daily_metrics WHERE metric_date = ${targetDate}`;
          expect(analystRows.length).toBeGreaterThanOrEqual(3);

          await assertSqlThrows(
            tx,
            "analyst_cannot_insert_metrics",
            () =>
              tx`
                INSERT INTO public.daily_metrics (dimension_key, grain, metric_date, country_code)
                VALUES ('forged', 'day_total', '2026-11-16', 'ALL')
              `,
            "analyst doit être bloqué en écriture sur daily_metrics",
          );

          await assertSqlThrows(
            tx,
            "analyst_cannot_insert_commission",
            () =>
              tx`
                INSERT INTO public.commissions (conversion_id, bookmaker_id, model, amount, currency_code, status)
                VALUES (${conv!.id}, ${bm!.id}, 'cpa', '10.00', 'EUR', 'pending')
              `,
            "analyst doit être bloqué en création sur commissions",
          );

          await tx`UPDATE public.commissions SET status = 'paid' WHERE id = ${comm!.id}`;
          const [commCheck] =
            await tx`SELECT status FROM public.commissions WHERE id = ${comm!.id}`;
          expect(commCheck?.status).toBe("confirmed");

          // member : zéro lecture sur daily_metrics
          await tx`SELECT set_config('app.current_user_id', ${memberId}, true)`;
          const memberRows = await tx`SELECT id FROM public.daily_metrics`;
          expect(memberRows).toHaveLength(0);

          // Benchmark 12 mois de données (365 jours x day_total) < 2 000 ms
          await tx`SELECT set_config('app.current_user_id', '', true), set_config('app.db_scope', 'stats_aggregator', true)`;
          const bulkRows = Array.from({ length: 365 }, (_, idx) => {
            const dt = new Date(Date.UTC(2025, 0, 1 + idx)).toISOString().slice(0, 10);
            return {
              dimension_key: `day_total|${dt}|ALL|-|-|-`,
              grain: "day_total",
              metric_date: dt,
              country_code: "ALL",
              unique_visitors: 10 + (idx % 5),
              valid_clicks: 3 + (idx % 3),
              first_deposits: idx % 2,
              confirmed_commissions_eur: "12.50",
            };
          });
          await tx`INSERT INTO public.daily_metrics ${tx(bulkRows, "dimension_key", "grain", "metric_date", "country_code", "unique_visitors", "valid_clicks", "first_deposits", "confirmed_commissions_eur")}`;

          await tx`SELECT set_config('app.current_user_id', ${analystId}, true), set_config('app.db_scope', 'user_session', true)`;
          const t0 = performance.now();
          const yearRows = await tx`
            SELECT metric_date, unique_visitors, valid_clicks, first_deposits, confirmed_commissions_eur
            FROM public.daily_metrics
            WHERE grain = 'day_total' AND metric_date BETWEEN '2025-01-01' AND '2025-12-31'
            ORDER BY metric_date ASC
          `;
          const elapsedMs = performance.now() - t0;
          expect(yearRows).toHaveLength(365);
          expect(elapsedMs).toBeLessThan(2000);

          throw new TestRollbackSignal();
        }),
      ).rejects.toThrow("ROLLBACK_SUCCESS");
    },
    25_000,
  );
});
