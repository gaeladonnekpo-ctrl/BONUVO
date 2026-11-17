import dotenv from "dotenv";
import path from "node:path";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
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

describe("Phase 5 — Intégration RLS postbacks, source obligatoire, déduplication et commissions", () => {
  it.skipIf(!sqlClient)(
    "prouve moindre privilège postback_ingest, contrainte source, déduplication et historique immuable",
    async () => {
      const sql = sqlClient!;

      await expect(
        sql.begin(async (tx) => {
          const adminId = "aaaaaaaa-5555-4555-8555-555555555551";
          const analystId = "aaaaaaaa-5555-4555-8555-555555555552";
          const memberId = "aaaaaaaa-5555-4555-8555-555555555553";
          const clickId = "cccccccc-5555-4555-8555-555555555551";

          await tx`
            INSERT INTO public.profiles (id, email, display_name) VALUES
              (${adminId}, 'p5-admin@bonuvo.test', 'Admin P5'),
              (${analystId}, 'p5-analyst@bonuvo.test', 'Analyst P5'),
              (${memberId}, 'p5-member@bonuvo.test', 'Member P5')
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
            VALUES ('Phase5 TestBet', 'p5-testbet', ARRAY['p5.example']::text[], 'active')
            RETURNING id
          `;
          const [net] = await tx`
            INSERT INTO public.affiliate_networks (slug, name, bookmaker_id, adapter_key, tracking_mode, secret_env_ref, signature_mode)
            VALUES ('p5-1xpartners', 'P5 1xPartners', ${bm!.id}, '1xpartners', 'postback', 'AFFILIATE_P5_SECRET', 'token')
            RETURNING id
          `;
          const [link] = await tx`
            INSERT INTO public.affiliate_links (slug, bookmaker_id, network_id, destination_url, allowed_host, active, status)
            VALUES ('p5-link', ${bm!.id}, ${net!.id}, 'https://p5.example/offer', 'p5.example', true, 'active')
            RETURNING id
          `;

          await tx`SELECT set_config('app.current_user_id', '', true), set_config('app.db_scope', 'public_tracking', true)`;
          await tx`
            INSERT INTO public.clicks (id, public_click_id, affiliate_link_id, bookmaker_id, ip_hash, anon_session_hash)
            VALUES (${clickId}, 'clk_p5_rls_001', ${link!.id}, ${bm!.id}, 'iphash', 'sesshash')
          `;

          await assertSqlThrows(
            tx,
            "sp_public_conv",
            () =>
              tx`
                INSERT INTO public.conversions (bookmaker_id, conversion_type, attribution_mode, source)
                VALUES (${bm!.id}, 'registration', 'unattributed', 'postback')
              `,
            "public_tracking ne doit jamais insérer dans conversions",
          );

          await tx`SELECT set_config('app.current_user_id', '', true), set_config('app.db_scope', 'postback_ingest', true)`;

          const [pb] = await tx`
            INSERT INTO public.postback_events (network_id, network_slug, source_type, external_event_id, signature_valid, processing_status)
            VALUES (${net!.id}, 'p5-1xpartners', 'postback', 'ext_p5_001', true, 'received')
            RETURNING id
          `;

          await assertSqlThrows(
            tx,
            "sp_no_source_conv",
            () =>
              tx`
                INSERT INTO public.conversions (network_id, bookmaker_id, conversion_type, attribution_mode, source)
                VALUES (${net!.id}, ${bm!.id}, 'first_deposit', 'click_id', 'postback')
              `,
            "aucune conversion sans postback_event_id ni import_id",
          );

          const [conv] = await tx`
            INSERT INTO public.conversions (network_id, bookmaker_id, click_id, postback_event_id, external_event_id, conversion_type, attribution_mode, source, status, amount, currency_code)
            VALUES (${net!.id}, ${bm!.id}, ${clickId}, ${pb!.id}, 'ext_p5_001', 'first_deposit', 'click_id', 'postback', 'recorded', '5000.00', 'XOF')
            RETURNING id
          `;

          const [pbDup] = await tx`
            INSERT INTO public.postback_events (network_id, network_slug, source_type, external_event_id, signature_valid, processing_status)
            VALUES (${net!.id}, 'p5-1xpartners', 'postback', 'ext_p5_001', true, 'received')
            RETURNING id
          `;
          await assertSqlThrows(
            tx,
            "sp_dup_conv",
            () =>
              tx`
                INSERT INTO public.conversions (network_id, bookmaker_id, postback_event_id, external_event_id, conversion_type, attribution_mode, source)
                VALUES (${net!.id}, ${bm!.id}, ${pbDup!.id}, 'ext_p5_001', 'first_deposit', 'unattributed', 'postback')
              `,
            "déduplication unique sur (network_id, external_event_id)",
          );

          await assertSqlThrows(
            tx,
            "sp_postback_confirmed_comm",
            () =>
              tx`
                INSERT INTO public.commissions (conversion_id, bookmaker_id, model, amount, currency_code, status)
                VALUES (${conv!.id}, ${bm!.id}, 'cpa', '1500.00', 'XOF', 'confirmed')
              `,
            "postback_ingest ne peut pas créer une commission déjà confirmed",
          );

          const commId = "dddddddd-5555-4555-8555-555555555551";
          await tx`
            INSERT INTO public.commissions (id, conversion_id, bookmaker_id, model, amount, currency_code, status)
            VALUES (${commId}, ${conv!.id}, ${bm!.id}, 'cpa', '1500.00', 'XOF', 'pending')
          `;

          await tx`SELECT set_config('app.current_user_id', ${memberId}, true), set_config('app.db_scope', 'user_session', true)`;
          const memberConvs = await tx`SELECT id FROM public.conversions WHERE id = ${conv!.id}`;
          expect(memberConvs).toHaveLength(0);

          await tx`SELECT set_config('app.current_user_id', ${analystId}, true)`;
          const analystConvs = await tx`SELECT id FROM public.conversions WHERE id = ${conv!.id}`;
          expect(analystConvs).toHaveLength(1);
          const analystUpdated = await tx`
            UPDATE public.commissions SET status = 'confirmed', proof_reference = 'BYPASS'
            WHERE id = ${commId}
            RETURNING id
          `;
          expect(analystUpdated).toHaveLength(0);

          await tx`SELECT set_config('app.current_user_id', ${adminId}, true)`;
          await assertSqlThrows(
            tx,
            "sp_confirm_no_proof",
            () =>
              tx`
                UPDATE public.commissions SET status = 'confirmed', proof_reference = ''
                WHERE id = ${commId}
              `,
            "passage à confirmed interdit sans proof_reference",
          );

          const adminUpdated = await tx`
            UPDATE public.commissions SET status = 'confirmed', proof_reference = 'INV-P5-2026-01', updated_by = ${adminId}
            WHERE id = ${commId}
            RETURNING id, status
          `;
          expect(adminUpdated).toHaveLength(1);
          expect(adminUpdated[0]!.status).toBe("confirmed");

          const [hist] = await tx`
            INSERT INTO public.commission_history (commission_id, previous_status, next_status, proof_reference, changed_by)
            VALUES (${commId}, 'pending', 'confirmed', 'INV-P5-2026-01', ${adminId})
            RETURNING id
          `;
          expect(hist?.id).toBeTruthy();

          await assertSqlThrows(
            tx,
            "sp_delete_history",
            () => tx`DELETE FROM public.commission_history WHERE id = ${hist!.id}`,
            "commission_history est strictement immuable",
          );

          throw new TestRollbackSignal();
        }),
      ).rejects.toThrow("ROLLBACK_SUCCESS");
    },
    25_000,
  );
});
