import dotenv from "dotenv";
import path from "node:path";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { computeAccuracySummary } from "@/modules/ai/model/settle";
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

describe("Phase 7 — Intégration PostgreSQL RLS BONUVO AI & immutabilité avant coup d'envoi", () => {
  it.skipIf(!sqlClient)(
    "enforces post-kickoff refusal, lock immutability, public_catalog isolation and settlement equality",
    { timeout: 25_000 },
    async () => {
      const sql = sqlClient!;

      await expect(
        sql.begin(async (tx) => {
          const adminId = "aaaaaaaa-7777-4777-8777-777777777771";
          const memberId = "aaaaaaaa-7777-4777-8777-777777777772";
          const analystId = "aaaaaaaa-7777-4777-8777-777777777773";

          await tx`
            INSERT INTO public.profiles (id, email, display_name) VALUES
              (${adminId}, 'p7-admin@bonuvo.test', 'Admin P7'),
              (${memberId}, 'p7-member@bonuvo.test', 'Member P7'),
              (${analystId}, 'p7-analyst@bonuvo.test', 'Analyst P7')
          `;

          const roleRows = await tx`SELECT id, name FROM public.roles`;
          const roleId = (name: string) => roleRows.find((r) => r.name === name)!.id as string;

          await tx`
            INSERT INTO public.user_roles (user_id, role_id) VALUES
              (${adminId}, ${roleId("admin")}),
              (${memberId}, ${roleId("member")}),
              (${analystId}, ${roleId("analyst")})
          `;

          await tx`SET LOCAL ROLE bonuvo_app`;
          await tx`SELECT set_config('app.db_scope', 'ai_pipeline', true)`;

          const [provider] = await tx`
            INSERT INTO public.sports_providers (slug, name, base_url)
            VALUES ('p7-test-provider', 'Test Provider', 'https://example.test')
            RETURNING id
          `;
          const [league] = await tx`
            INSERT INTO public.leagues (provider_id, external_id, name, tracked)
            VALUES (${provider!.id}, '999', 'Test League', true)
            RETURNING id
          `;
          const [season] = await tx`
            INSERT INTO public.seasons (provider_id, league_id, year, is_current)
            VALUES (${provider!.id}, ${league!.id}, 2026, true)
            RETURNING id
          `;
          const [teamA] = await tx`
            INSERT INTO public.teams (provider_id, external_id, name)
            VALUES (${provider!.id}, 't1', 'Team Alpha') RETURNING id
          `;
          const [teamB] = await tx`
            INSERT INTO public.teams (provider_id, external_id, name)
            VALUES (${provider!.id}, 't2', 'Team Beta') RETURNING id
          `;

          const futureKickoff = new Date(Date.now() + 24 * 3600_000);
          const pastKickoff = new Date(Date.now() - 2 * 3600_000);

          const [futureFix] = await tx`
            INSERT INTO public.fixtures (provider_id, league_id, season_id, external_id, home_team_id, away_team_id, kickoff_at, fixture_status)
            VALUES (${provider!.id}, ${league!.id}, ${season!.id}, 'f-future', ${teamA!.id}, ${teamB!.id}, ${futureKickoff}, 'scheduled')
            RETURNING id
          `;
          const [pastFix] = await tx`
            INSERT INTO public.fixtures (provider_id, league_id, season_id, external_id, home_team_id, away_team_id, kickoff_at, fixture_status, home_goals, away_goals)
            VALUES (${provider!.id}, ${league!.id}, ${season!.id}, 'f-past', ${teamA!.id}, ${teamB!.id}, ${pastKickoff}, 'finished', 2, 0)
            RETURNING id
          `;
          const [model] = await tx`
            INSERT INTO public.model_versions (version_tag, description)
            VALUES ('poisson-v1.0-test', 'Test model')
            RETURNING id
          `;

          // 1) Refuse prediction creation after kickoff
          await assertSqlThrows(
            tx,
            "sp_post_kickoff",
            () => tx`
              INSERT INTO public.predictions (fixture_id, model_version_id, market, probabilities_json, picked_selection, confidence_level, confidence_score, expected_home_goals, expected_away_goals, input_snapshot_hash, locked_at)
              VALUES (${pastFix!.id}, ${model!.id}, '1x2', '{"home":0.6,"draw":0.2,"away":0.2}'::jsonb, 'home', 'medium', 0.55, 1.8, 0.9, 'abc', now())
            `,
            "Trigger must forbid inserting prediction after fixture kickoff",
          );

          // 2) Insert locked prediction BEFORE kickoff, then verify immutability + allowed single coupon validation
          const [pred] = await tx`
            INSERT INTO public.predictions (fixture_id, model_version_id, market, probabilities_json, picked_selection, confidence_level, confidence_score, expected_home_goals, expected_away_goals, input_snapshot_hash, status, published_at, locked_at)
            VALUES (${futureFix!.id}, ${model!.id}, '1x2', '{"home":0.6,"draw":0.25,"away":0.15}'::jsonb, 'home', 'medium', 0.62, 1.75, 0.85, 'hash123', 'published', now(), now())
            RETURNING id
          `;

          await assertSqlThrows(
            tx,
            "sp_locked_update",
            () =>
              tx`UPDATE public.predictions SET picked_selection = 'away' WHERE id = ${pred!.id}`,
            "Trigger must forbid updating locked probabilities/selection",
          );
          await assertSqlThrows(
            tx,
            "sp_locked_delete",
            () => tx`DELETE FROM public.predictions WHERE id = ${pred!.id}`,
            "Trigger must forbid deleting a locked prediction",
          );

          // Allowed: human coupon validation while fixture has not started yet
          await tx`
            UPDATE public.predictions SET coupon_validated = true, validated_by = ${adminId}, validated_at = now()
            WHERE id = ${pred!.id}
          `;
          // Disallowed: mutating again after couponValidated = true
          await assertSqlThrows(
            tx,
            "sp_locked_reupdate",
            () => tx`UPDATE public.predictions SET coupon_validated = false WHERE id = ${pred!.id}`,
            "Trigger must forbid reverting coupon_validated",
          );

          // 3) Settle and check accuracy summary alignment
          await tx`
            INSERT INTO public.prediction_results (prediction_id, fixture_id, actual_outcome, verdict, brier_score)
            VALUES (${pred!.id}, ${futureFix!.id}, 'home', 'won', 0.2450)
          `;

          // 4) public_catalog reads published prediction & result, cannot write or see ingestion_runs
          await tx`SELECT set_config('app.db_scope', 'public_catalog', true)`;
          const pubPreds = await tx`SELECT id FROM public.predictions WHERE id = ${pred!.id}`;
          expect(pubPreds).toHaveLength(1);
          const pubRuns = await tx`SELECT id FROM public.ingestion_runs`;
          expect(pubRuns).toHaveLength(0);
          await assertSqlThrows(
            tx,
            "sp_pub_write",
            () =>
              tx`INSERT INTO public.leagues (provider_id, external_id, name) VALUES (${provider!.id}, 'x', 'Hack')`,
            "public_catalog cannot insert leagues",
          );

          // 5) member denied, analyst read-only
          await tx`SELECT set_config('app.current_user_id', ${memberId}, true), set_config('app.db_scope', 'user_session', true)`;
          expect(await tx`SELECT id FROM public.predictions WHERE id = ${pred!.id}`).toHaveLength(
            0,
          );

          await tx`SELECT set_config('app.current_user_id', ${analystId}, true), set_config('app.db_scope', 'user_session', true)`;
          expect(await tx`SELECT id FROM public.predictions WHERE id = ${pred!.id}`).toHaveLength(
            1,
          );
          await assertSqlThrows(
            tx,
            "sp_analyst_insert",
            () =>
              tx`INSERT INTO public.prediction_results (prediction_id, fixture_id, actual_outcome, verdict) VALUES (${pred!.id}, ${pastFix!.id}, 'home', 'won')`,
            "analyst cannot insert prediction_results",
          );
          const deletedByAnalyst = await tx`
            DELETE FROM public.prediction_results WHERE prediction_id = ${pred!.id} RETURNING id
          `;
          expect(deletedByAnalyst).toHaveLength(0);

          const summary = computeAccuracySummary([
            { market: "1x2", verdict: "won", brierScore: 0.245 },
          ]);
          expect(summary.won).toBe(1);
          expect(summary.winRatePct).toBe(100);

          throw new TestRollbackSignal();
        }),
      ).rejects.toThrow("ROLLBACK_SUCCESS");
    },
  );
});
