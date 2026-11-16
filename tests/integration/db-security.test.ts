import dotenv from "dotenv";
import path from "node:path";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { resolveSslOption, sanitizePostgresUrl } from "@/server/db/connection-config";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

class TestRollbackSignal extends Error {}

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

describe("Phase 2 — Intégration DB moindre privilège, RLS & immuabilité", () => {
  it.skipIf(!sqlClient)(
    "prouve D2 (DROP refusé), D3 (RLS refus par défaut), D8 (audit immuable) et B7 (SQL RLS)",
    async () => {
      const sql = sqlClient!;

      await expect(
        sql.begin(async (tx) => {
          const profileA = "aaaa1111-1111-4111-8111-111111111111";
          const adminId = "bbbb2222-2222-4222-8222-222222222222";
          const targetId = "cccc3333-3333-4333-8333-333333333333";

          await tx`
            INSERT INTO public.profiles (id, email, display_name) VALUES
              (${profileA}, 'int-a@bonuvo.test', 'Test A'),
              (${adminId}, 'int-admin@bonuvo.test', 'Test Admin'),
              (${targetId}, 'int-super@bonuvo.test', 'Test Super')
          `;

          const [adminRole] = await tx`SELECT id FROM public.roles WHERE name = 'admin'`;
          const [superRole] = await tx`SELECT id FROM public.roles WHERE name = 'super_admin'`;
          expect(adminRole?.id).toBeTruthy();
          expect(superRole?.id).toBeTruthy();

          await tx`INSERT INTO public.user_roles (user_id, role_id) VALUES (${adminId}, ${adminRole!.id})`;
          await tx`INSERT INTO public.user_roles (user_id, role_id) VALUES (${targetId}, ${superRole!.id})`;
          await tx`
            INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id)
            VALUES (${adminId}, 'test.created', 'profiles', ${profileA})
          `;
          await tx`
            INSERT INTO public.consents (user_id, consent_type, granted, policy_version, ip_hash)
            VALUES (${profileA}, 'analytics', true, '2026-11', '0123456789abcdef')
          `;

          // Passer au rôle applicatif moindre privilège bonuvo_app
          await tx`SET LOCAL ROLE bonuvo_app`;
          await tx`SELECT set_config('app.current_user_id', '', true), set_config('app.db_scope', '', true)`;

          // D3 : sans contexte utilisateur ni scope, zéro ligne retournée (refus par défaut)
          const defaultProfiles = await tx`SELECT id FROM public.profiles`;
          const defaultAudit = await tx`SELECT id FROM public.audit_log`;
          expect(defaultProfiles).toHaveLength(0);
          expect(defaultAudit).toHaveLength(0);

          // D2 : DROP TABLE refusé au rôle bonuvo_app
          await tx`SAVEPOINT sp_drop`;
          let dropErr: unknown = null;
          try {
            await tx.unsafe(`DROP TABLE public.audit_log`);
          } catch (error) {
            dropErr = error;
            await tx`ROLLBACK TO SAVEPOINT sp_drop`;
          }
          expect(dropErr).toBeTruthy();

          // D8 : UPDATE et DELETE sur audit_log et consents refusés
          await tx`SAVEPOINT sp_audit_update`;
          let auditUpdateErr: unknown = null;
          try {
            await tx.unsafe(`UPDATE public.audit_log SET action = 'tampered'`);
          } catch (error) {
            auditUpdateErr = error;
            await tx`ROLLBACK TO SAVEPOINT sp_audit_update`;
          }
          expect(auditUpdateErr).toBeTruthy();

          await tx`SAVEPOINT sp_consents_delete`;
          let consentsDeleteErr: unknown = null;
          try {
            await tx.unsafe(`DELETE FROM public.consents`);
          } catch (error) {
            consentsDeleteErr = error;
            await tx`ROLLBACK TO SAVEPOINT sp_consents_delete`;
          }
          expect(consentsDeleteErr).toBeTruthy();

          // B7 au niveau SQL RLS : un admin ne peut pas promouvoir quelqu'un en super_admin
          await tx`SELECT set_config('app.current_user_id', ${adminId}, true), set_config('app.db_scope', 'user_session', true)`;
          await tx`SAVEPOINT sp_b7_escalate`;
          let b7Err: unknown = null;
          try {
            await tx`
              INSERT INTO public.user_roles (user_id, role_id)
              VALUES (${profileA}, ${superRole!.id})
            `;
          } catch (error) {
            b7Err = error;
            await tx`ROLLBACK TO SAVEPOINT sp_b7_escalate`;
          }
          expect(b7Err).toBeTruthy();

          // Vérifie zéro droit pour anon / authenticated sur public
          const anonPrivs = await tx`
            SELECT privilege_type
            FROM information_schema.role_table_grants
            WHERE grantee IN ('anon', 'authenticated')
              AND table_schema = 'public'
              AND table_name IN ('profiles', 'roles', 'permissions', 'role_permissions', 'user_roles', 'consents', 'audit_log', 'security_events')
          `;
          expect(anonPrivs).toHaveLength(0);

          throw new TestRollbackSignal("Rollback transactionnelle de test");
        }),
      ).rejects.toThrow(TestRollbackSignal);
    },
    15000,
  );
});
