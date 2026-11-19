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

describe("Phase 3 — Intégration DB catalogue, publication, B1 et RLS par rôle", () => {
  it.skipIf(!sqlClient)(
    "prouve ISO 3166 seed, cycle de vie offre, refus publication editor, refus B1 et RBAC settings",
    async () => {
      const sql = sqlClient!;

      await expect(
        sql.begin(async (tx) => {
          const [countRow] =
            await tx`SELECT count(*)::int AS "totalCountries" FROM public.countries`;
          expect(Number(countRow?.totalCountries ?? 0)).toBeGreaterThanOrEqual(200);

          const editorId = "1111aaaa-1111-4111-8111-111111111111";
          const adminId = "2222bbbb-2222-4222-8222-222222222222";
          const superId = "3333cccc-3333-4333-8333-333333333333";
          const memberId = "4444dddd-4444-4444-8444-444444444444";

          await tx`
            INSERT INTO public.profiles (id, email, display_name) VALUES
              (${editorId}, 'p3-editor@bonuvo.test', 'Editor'),
              (${adminId}, 'p3-admin@bonuvo.test', 'Admin'),
              (${superId}, 'p3-super@bonuvo.test', 'Super'),
              (${memberId}, 'p3-member@bonuvo.test', 'Member')
          `;

          const roleRows = await tx`SELECT id, name FROM public.roles`;
          const roleId = (name: string) => roleRows.find((r) => r.name === name)!.id as string;

          await tx`
            INSERT INTO public.user_roles (user_id, role_id) VALUES
              (${editorId}, ${roleId("editor")}),
              (${adminId}, ${roleId("admin")}),
              (${superId}, ${roleId("super_admin")}),
              (${memberId}, ${roleId("member")})
          `;

          const [bjCountry] = await tx`SELECT id FROM public.countries WHERE code = 'BJ'`;
          expect(bjCountry?.id).toBeTruthy();

          await tx`SET LOCAL ROLE bonuvo_app`;

          // 1. Member sans droit catalogue est bloqué
          await tx`SELECT set_config('app.current_user_id', ${memberId}, true), set_config('app.db_scope', 'user_session', true)`;
          await tx`SAVEPOINT sp_member_bm`;
          let memberErr: unknown = null;
          try {
            await tx`
              INSERT INTO public.bookmakers (name, slug, allowed_hosts)
              VALUES ('Fake', 'fake-bm', ARRAY['fake.bj'])
            `;
          } catch (e) {
            memberErr = e;
            await tx`ROLLBACK TO SAVEPOINT sp_member_bm`;
          }
          expect(memberErr, "member ne doit pas pouvoir créer un bookmaker").toBeTruthy();

          // 2. Editor crée un bookmaker + une offre en draft
          await tx`SELECT set_config('app.current_user_id', ${editorId}, true)`;
          const [bm] = await tx`
            INSERT INTO public.bookmakers (name, slug, allowed_hosts)
            VALUES ('TestBet BJ', 'testbet-bj', ARRAY['testbet.bj'])
            RETURNING id
          `;
          const bmId = bm!.id as string;
          const [offer] = await tx`
            INSERT INTO public.offers (bookmaker_id, slug, title_fr, title_en, bonus_amount, currency_code, status)
            VALUES (${bmId}, 'testbet-welcome', '100% Test', '100% Test EN', 50000.00, 'XOF', 'draft')
            RETURNING id
          `;
          const offerId = offer!.id as string;
          await tx`
            INSERT INTO public.offer_countries (offer_id, country_id)
            VALUES (${offerId}, ${bjCountry!.id})
          `;

          // Editor tente de publier -> refusé par RLS PostgreSQL
          await tx`SAVEPOINT sp_editor_publish`;
          let editorPubErr: unknown = null;
          try {
            await tx`UPDATE public.offers SET status = 'published' WHERE id = ${offerId}`;
          } catch (e) {
            editorPubErr = e;
            await tx`ROLLBACK TO SAVEPOINT sp_editor_publish`;
          }
          expect(editorPubErr, "editor ne doit pas pouvoir publier une offre").toBeTruthy();

          // Editor tente de créer un lien d'affiliation -> refusé par RLS (links.manage absent)
          await tx`SAVEPOINT sp_editor_link`;
          let editorLinkErr: unknown = null;
          try {
            await tx`
              INSERT INTO public.affiliate_links (slug, bookmaker_id, destination_url, allowed_host)
              VALUES ('go-test', ${bmId}, 'https://testbet.bj/join', 'testbet.bj')
            `;
          } catch (e) {
            editorLinkErr = e;
            await tx`ROLLBACK TO SAVEPOINT sp_editor_link`;
          }
          expect(
            editorLinkErr,
            "editor ne doit pas pouvoir créer un lien d'affiliation",
          ).toBeTruthy();

          // 3. Admin publie l'offre, tente un lien hors allowed_hosts (B1 refus), puis lien valide
          await tx`SELECT set_config('app.current_user_id', ${adminId}, true)`;
          const [pubOffer] = await tx`
            UPDATE public.offers SET status = 'published', last_verified_at = now(), verified_by = ${adminId}
            WHERE id = ${offerId}
            RETURNING status
          `;
          expect(pubOffer?.status).toBe("published");

          await tx`SAVEPOINT sp_b1_evil`;
          let b1Err: unknown = null;
          try {
            await tx`
              INSERT INTO public.affiliate_links (slug, bookmaker_id, destination_url, allowed_host)
              VALUES ('bad-link', ${bmId}, 'https://evil.example/phish', 'evil.example')
            `;
          } catch (e) {
            b1Err = e;
            await tx`ROLLBACK TO SAVEPOINT sp_b1_evil`;
          }
          expect(b1Err, "B1 doit rejeter un hôte hors allowed_hosts").toBeTruthy();

          const [okLink] = await tx`
            INSERT INTO public.affiliate_links (slug, bookmaker_id, offer_id, destination_url, allowed_host)
            VALUES ('good-link', ${bmId}, ${offerId}, 'https://promo.testbet.bj/offer', 'promo.testbet.bj')
            RETURNING id
          `;
          expect(okLink?.id).toBeTruthy();

          // Admin ne peut ni insérer ni modifier settings (réservé super_admin)
          const adminUpdatedRows =
            await tx`UPDATE public.settings SET value = '{"days":15}'::jsonb WHERE key = 'catalog.freshness_warning_days' RETURNING key`;
          expect(
            adminUpdatedRows,
            "admin ne doit mettre à jour 0 ligne dans settings",
          ).toHaveLength(0);

          await tx`SAVEPOINT sp_admin_settings`;
          let adminSetErr: unknown = null;
          try {
            await tx`INSERT INTO public.settings (key, value) VALUES ('unauthorized.key', '{"x":1}'::jsonb)`;
          } catch (e) {
            adminSetErr = e;
            await tx`ROLLBACK TO SAVEPOINT sp_admin_settings`;
          }
          expect(adminSetErr, "admin ne doit pas pouvoir insérer dans settings").toBeTruthy();

          // 4. Super Admin peut modifier settings et supprimer définitivement l'offre
          await tx`SELECT set_config('app.current_user_id', ${superId}, true)`;
          await tx`UPDATE public.settings SET value = '{"days":21}'::jsonb WHERE key = 'catalog.freshness_warning_days'`;
          const deletedOffer =
            await tx`DELETE FROM public.offers WHERE id = ${offerId} RETURNING id`;
          expect(deletedOffer).toHaveLength(1);

          throw new TestRollbackSignal();
        }),
      ).rejects.toThrow(TestRollbackSignal);
    },
    20_000,
  );
});
