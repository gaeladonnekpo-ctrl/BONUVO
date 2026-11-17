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

describe("Phase 8 — Intégration PostgreSQL RLS : BONUVO COMMUNITY, isolation MEMBERS, consentements append-only & purge 14j", () => {
  it.skipIf(!sqlClient)(
    "isole strictement les membres, protège l'historique append-only des consentements et anonymise à +14j sans altérer les stats anonymes",
    { timeout: 25_000 },
    async () => {
      const sql = sqlClient!;

      await expect(
        sql.begin(async (tx) => {
          const adminId = "bbbbbbbb-8888-4888-8888-888888888881";
          const memberA = "bbbbbbbb-8888-4888-8888-888888888882";
          const memberB = "bbbbbbbb-8888-4888-8888-888888888883";

          await tx`
            INSERT INTO public.profiles (id, email, display_name, country_code, status) VALUES
              (${adminId}, 'p8-admin@bonuvo.test', 'Admin P8', 'FR', 'active'),
              (${memberA}, 'p8-member-a@bonuvo.test', 'Member A', 'CM', 'active'),
              (${memberB}, 'p8-member-b@bonuvo.test', 'Member B', 'CI', 'active')
          `;

          const roleRows = await tx`SELECT id, name FROM public.roles`;
          const roleId = (name: string) => roleRows.find((r) => r.name === name)!.id as string;

          await tx`
            INSERT INTO public.user_roles (user_id, role_id) VALUES
              (${adminId}, ${roleId("admin")}),
              (${memberA}, ${roleId("member")}),
              (${memberB}, ${roleId("member")})
          `;

          // Insérer une métrique quotidienne anonyme pour vérifier qu'elle survit à la purge
          await tx`
            INSERT INTO public.daily_metrics (dimension_key, grain, metric_date, country_code, raw_clicks, valid_clicks)
            VALUES ('day_country:2099-12-31:CM', 'day_country', '2099-12-31', 'CM', 42, 35)
            ON CONFLICT (dimension_key) DO UPDATE SET raw_clicks = 42, valid_clicks = 35
          `;

          await tx`SET LOCAL ROLE bonuvo_app`;

          // 1. Member A configure ses préférences et son consentement
          await tx`SELECT set_config('app.db_scope', 'user_session', true)`;
          await tx`SELECT set_config('app.current_user_id', ${memberA}, true)`;

          const [consent1] = await tx`
            INSERT INTO public.consents (user_id, consent_type, granted, policy_version, ip_hash)
            VALUES (${memberA}, 'notifications', true, '2026-11-v1', 'hash-a')
            RETURNING id
          `;
          expect(consent1?.id).toBeTruthy();

          await tx`
            INSERT INTO public.communication_preferences (user_id, email_announcements, email_promos, preferred_channel)
            VALUES (${memberA}, true, true, 'email')
          `;

          await tx`
            INSERT INTO public.member_activity (user_id, activity_type)
            VALUES (${memberA}, 'consent_recorded')
          `;

          // 2. Immutabilité append-only de `public.consents` : UPDATE et DELETE interdits
          await assertSqlThrows(
            tx,
            "sp_consent_update_forbidden",
            async () => {
              await tx`
                UPDATE public.consents SET granted = false WHERE id = ${consent1!.id}
              `;
            },
            "UPDATE on consents must fail (append-only ledger)",
          );

          // 3. Isolation inter-membres : Member B ne peut ni lire ni modifier les données de Member A
          await tx`SELECT set_config('app.current_user_id', ${memberB}, true)`;

          const crossPrefs = await tx`
            SELECT id FROM public.communication_preferences WHERE user_id = ${memberA}
          `;
          expect(crossPrefs.length).toBe(0);

          const crossActivity = await tx`
            SELECT id FROM public.member_activity WHERE user_id = ${memberA}
          `;
          expect(crossActivity.length).toBe(0);

          await assertSqlThrows(
            tx,
            "sp_cross_member_insert_forbidden",
            async () => {
              await tx`
                INSERT INTO public.account_deletion_requests (user_id, status, scheduled_purge_at)
                VALUES (${memberA}, 'pending', now() + interval '14 days')
              `;
            },
            "Member B cannot request account deletion for Member A",
          );

          // 4. Désinscription 1-clic sans session (portée public_unsubscribe) :
          // ajoute une nouvelle ligne append-only dans `consents` (granted = false) et coupe les préférences
          await tx`SELECT set_config('app.current_user_id', '', true)`;
          await tx`SELECT set_config('app.db_scope', 'public_unsubscribe', true)`;

          await tx`
            INSERT INTO public.consents (user_id, consent_type, granted, policy_version, ip_hash, recorded_at)
            VALUES (${memberA}, 'notifications', false, '2026-11-v1', 'hash-unsub', now() + interval '1 second')
          `;
          await tx`
            UPDATE public.communication_preferences
            SET email_announcements = false, email_promos = false, preferred_channel = 'none'
            WHERE user_id = ${memberA}
          `;

          const consentHistory = await tx`
            SELECT granted FROM public.consents
            WHERE user_id = ${memberA} AND consent_type = 'notifications'
            ORDER BY recorded_at DESC, id DESC
          `;
          expect(consentHistory.length).toBe(2);
          expect(consentHistory[0]?.granted).toBe(false);
          expect(consentHistory[1]?.granted).toBe(true);

          // 5. Purge différée 14 jours (portée purge_worker) : anonymise le profil sans toucher aux stats anonymes
          await tx`SELECT set_config('app.db_scope', 'user_session', true)`;
          await tx`SELECT set_config('app.current_user_id', ${memberA}, true)`;

          const [delReq] = await tx`
            INSERT INTO public.account_deletion_requests (user_id, status, requested_at, scheduled_purge_at)
            VALUES (${memberA}, 'pending', now() - interval '15 days', now() - interval '1 day')
            RETURNING id
          `;

          await tx`SELECT set_config('app.current_user_id', '', true)`;
          await tx`SELECT set_config('app.db_scope', 'purge_worker', true)`;

          await tx`
            UPDATE public.profiles
            SET email = ${`deleted-${memberA}@anonymized.bonuvo.local`},
                display_name = 'Compte supprimé',
                country_code = 'GLOBAL',
                status = 'suspended',
                deleted_at = now()
            WHERE id = ${memberA}
          `;
          await tx`DELETE FROM public.communication_preferences WHERE user_id = ${memberA}`;
          await tx`DELETE FROM public.member_activity WHERE user_id = ${memberA}`;
          await tx`
            UPDATE public.account_deletion_requests
            SET status = 'executed', executed_at = now()
            WHERE id = ${delReq!.id}
          `;

          const [anonymizedProfile] = await tx`
            SELECT email, display_name, country_code, status, deleted_at
            FROM public.profiles WHERE id = ${memberA}
          `;
          expect(anonymizedProfile?.email).toBe(`deleted-${memberA}@anonymized.bonuvo.local`);
          expect(anonymizedProfile?.display_name).toBe("Compte supprimé");
          expect(anonymizedProfile?.status).toBe("suspended");
          expect(anonymizedProfile?.deleted_at).toBeTruthy();

          // Les statistiques anonymes restent intactes
          await tx`RESET ROLE`;
          const [statsRow] = await tx`
            SELECT raw_clicks FROM public.daily_metrics
            WHERE dimension_key = 'day_country:2099-12-31:CM'
          `;
          expect(Number(statsRow?.raw_clicks)).toBeGreaterThanOrEqual(42);

          throw new TestRollbackSignal();
        }),
      ).rejects.toThrow("ROLLBACK_SUCCESS");
    },
  );
});
