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

describe("Phase 4 — Intégration RLS lecture publique, redirection /go et collecte clics/vues", () => {
  it.skipIf(!sqlClient)(
    "empêche public_catalog de lire draft/expiré/liens inactifs et borne public_tracking à l'insertion de clics actifs",
    async () => {
      const sql = sqlClient!;

      await expect(
        sql.begin(async (tx) => {
          const adminId = "9999aaaa-1111-4111-8111-111111111111";
          const memberId = "9999bbbb-2222-4222-8222-222222222222";

          await tx`
            INSERT INTO public.profiles (id, email, display_name) VALUES
              (${adminId}, 'p4-admin@bonuvo.test', 'Admin P4'),
              (${memberId}, 'p4-member@bonuvo.test', 'Member P4')
          `;

          const roleRows = await tx`SELECT id, name FROM public.roles`;
          const roleId = (name: string) => roleRows.find((r) => r.name === name)!.id as string;

          await tx`
            INSERT INTO public.user_roles (user_id, role_id) VALUES
              (${adminId}, ${roleId("admin")}),
              (${memberId}, ${roleId("member")})
          `;

          const [bjCountry] = await tx`SELECT id FROM public.countries WHERE code = 'BJ'`;
          expect(bjCountry?.id).toBeTruthy();

          await tx`SET LOCAL ROLE bonuvo_app`;
          await tx`SELECT set_config('app.current_user_id', ${adminId}, true), set_config('app.db_scope', 'user_session', true)`;

          const [bm] = await tx`
            INSERT INTO public.bookmakers (name, slug, allowed_hosts, status)
            VALUES ('Bookmaker Test A', 'bm-test-a', ARRAY['test-a.example'], 'active')
            RETURNING id
          `;
          const bmId = bm!.id as string;

          await tx`
            INSERT INTO public.bookmaker_countries (bookmaker_id, country_id, eligible, local_license)
            VALUES (${bmId}, ${bjCountry!.id}, true, 'Loterie Nationale')
          `;

          const [pubOffer] = await tx`
            INSERT INTO public.offers (bookmaker_id, slug, title_fr, title_en, bonus_amount, currency_code, status)
            VALUES (${bmId}, 'offer-pub-a', 'Bonus Test Publié', 'Published Bonus', 25000, 'XOF', 'published')
            RETURNING id
          `;
          const [draftOffer] = await tx`
            INSERT INTO public.offers (bookmaker_id, slug, title_fr, title_en, bonus_amount, currency_code, status)
            VALUES (${bmId}, 'offer-draft-a', 'Bonus Brouillon', 'Draft Bonus', 10000, 'XOF', 'draft')
            RETURNING id
          `;
          const [expiredOffer] = await tx`
            INSERT INTO public.offers (bookmaker_id, slug, title_fr, title_en, valid_until, currency_code, status)
            VALUES (${bmId}, 'offer-exp-a', 'Bonus Expiré', 'Expired Bonus', now() - interval '1 day', 'XOF', 'published')
            RETURNING id
          `;
          expect(draftOffer?.id && expiredOffer?.id).toBeTruthy();

          await tx`
            INSERT INTO public.offer_countries (offer_id, country_id)
            VALUES (${pubOffer!.id}, ${bjCountry!.id})
          `;

          const [activeLink] = await tx`
            INSERT INTO public.affiliate_links (slug, bookmaker_id, offer_id, destination_url, allowed_host, active, status)
            VALUES ('go-test-a', ${bmId}, ${pubOffer!.id}, 'https://test-a.example/welcome', 'test-a.example', true, 'active')
            RETURNING id
          `;
          const [disabledLink] = await tx`
            INSERT INTO public.affiliate_links (slug, bookmaker_id, offer_id, destination_url, allowed_host, active, status)
            VALUES ('go-test-off', ${bmId}, ${pubOffer!.id}, 'https://test-a.example/off', 'test-a.example', false, 'disabled')
            RETURNING id
          `;

          // Passe en portée anonyme public_catalog
          await tx`SELECT set_config('app.current_user_id', '', true), set_config('app.db_scope', 'public_catalog', true)`;

          const visibleOffers = await tx`
            SELECT slug FROM public.offers WHERE bookmaker_id = ${bmId}
          `;
          expect(visibleOffers.map((r) => r.slug)).toEqual(["offer-pub-a"]);

          const visibleLinks = await tx`
            SELECT slug FROM public.affiliate_links WHERE bookmaker_id = ${bmId}
          `;
          expect(visibleLinks.map((r) => r.slug)).toEqual(["go-test-a"]);

          // public_catalog ne doit pas pouvoir lire settings ni audit_log
          const visibleSettings = await tx`SELECT key FROM public.settings`;
          expect(visibleSettings).toHaveLength(0);

          // public_catalog ne doit pas pouvoir insérer dans clicks
          await tx`SAVEPOINT sp_catalog_click`;
          let catalogClickErr: unknown = null;
          try {
            await tx`
              INSERT INTO public.clicks (public_click_id, affiliate_link_id, bookmaker_id, ip_hash, anon_session_hash)
              VALUES ('clk_fail_1', ${activeLink!.id}, ${bmId}, 'h1', 's1')
            `;
          } catch (e) {
            catalogClickErr = e;
            await tx`ROLLBACK TO SAVEPOINT sp_catalog_click`;
          }
          expect(catalogClickErr, "public_catalog ne doit pas insérer de clic").toBeTruthy();

          // Passe en portée public_tracking : insertion clic actif acceptée, lien désactivé refusé
          await tx`SELECT set_config('app.db_scope', 'public_tracking', true)`;

          await tx`
            INSERT INTO public.clicks (public_click_id, affiliate_link_id, bookmaker_id, offer_id, ip_hash, anon_session_hash)
            VALUES ('clk_ok_1', ${activeLink!.id}, ${bmId}, ${pubOffer!.id}, 'h1', 's1')
          `;

          await tx`SAVEPOINT sp_disabled_click`;
          let disabledLinkErr: unknown = null;
          try {
            await tx`
              INSERT INTO public.clicks (public_click_id, affiliate_link_id, bookmaker_id, ip_hash, anon_session_hash)
              VALUES ('clk_fail_2', ${disabledLink!.id}, ${bmId}, 'h1', 's1')
            `;
          } catch (e) {
            disabledLinkErr = e;
            await tx`ROLLBACK TO SAVEPOINT sp_disabled_click`;
          }
          expect(
            disabledLinkErr,
            "clic sur lien désactivé doit être bloqué en SQL RLS",
          ).toBeTruthy();

          await tx`
            INSERT INTO public.visit_events (event_type, path, offer_id, bookmaker_id, country_code, visitor_daily_hash)
            VALUES ('promo_copy', '/fr/offres', ${pubOffer!.id}, ${bmId}, 'BJ', 'vh1')
          `;

          // Admin lit les clics créés ; member ne peut rien lire
          await tx`SELECT set_config('app.current_user_id', ${memberId}, true), set_config('app.db_scope', 'user_session', true)`;
          const memberClicks = await tx`SELECT id FROM public.clicks WHERE bookmaker_id = ${bmId}`;
          expect(memberClicks).toHaveLength(0);

          await tx`SELECT set_config('app.current_user_id', ${adminId}, true)`;
          const adminClicks =
            await tx`SELECT public_click_id FROM public.clicks WHERE bookmaker_id = ${bmId}`;
          expect(adminClicks.map((r) => r.public_click_id)).toEqual(["clk_ok_1"]);

          throw new TestRollbackSignal("ROLLBACK_SUCCESS");
        }),
      ).rejects.toThrow("ROLLBACK_SUCCESS");
    },
    25_000,
  );
});
