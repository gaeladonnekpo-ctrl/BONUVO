import { describe, expect, it } from "vitest";
import { resolveFixturePresentation } from "@/modules/ai/model/fixture-status-label";
import {
  espnScoreboardSchema,
  mapEspnFixtureStatus,
  mapEspnLivePhase,
} from "@/modules/ai/providers/espn-soccer-schemas";
import { isFixtureInActiveWindow } from "@/modules/ai/service/live-fixture-sync";

describe("Live Scores, Match Statuses, Clock/Periods & Active Refresh Window", () => {
  it("parses ESPN scoreboard live clock, period, and shortDetail accurately", () => {
    const raw = {
      events: [
        {
          id: "401882804",
          date: "2026-11-22T13:00Z",
          competitions: [
            {
              status: {
                clock: 2160,
                displayClock: "36'",
                period: 1,
                type: {
                  state: "in",
                  name: "STATUS_FIRST_HALF",
                  completed: false,
                  shortDetail: "36'",
                },
              },
              competitors: [
                { homeAway: "home", score: "0", team: { id: "83", displayName: "Barcelona" } },
                { homeAway: "away", score: "2", team: { id: "102", displayName: "Villarreal" } },
              ],
            },
          ],
        },
      ],
    };

    const parsed = espnScoreboardSchema.parse(raw);
    const comp = parsed.events[0]!.competitions[0]!;
    expect(comp.status?.displayClock).toBe("36'");
    expect(comp.status?.period).toBe(1);
    expect(
      mapEspnFixtureStatus(
        comp.status?.type?.state,
        comp.status?.type?.name,
        comp.status?.type?.completed,
      ),
    ).toBe("live");
    expect(
      mapEspnLivePhase({
        state: comp.status?.type?.state,
        name: comp.status?.type?.name,
        completed: comp.status?.type?.completed,
        period: comp.status?.period,
      }),
    ).toBe("first_half");
  });

  it("formats live first-half, halftime, extra-time, penalties, finished, scheduled, postponed, and unavailable-score states", () => {
    const nowMs = Date.parse("2026-11-22T13:40:00.000Z");

    const live1H = resolveFixturePresentation(
      {
        fixtureStatus: "live",
        homeGoals: 0,
        awayGoals: 2,
        kickoffAt: "2026-11-22T13:00:00.000Z",
        livePhase: "first_half",
        displayClock: "36'",
        statusDetail: "36'",
      },
      false,
      nowMs,
    );
    expect(live1H.scoreLine).toBe("0 - 2");
    expect(live1H.statusLabel).toBe("En direct · 36'");
    expect(live1H.isLive).toBe(true);

    const halftime = resolveFixturePresentation(
      {
        fixtureStatus: "live",
        homeGoals: 1,
        awayGoals: 1,
        kickoffAt: "2026-11-22T12:45:00.000Z",
        livePhase: "halftime",
        displayClock: "HT",
      },
      false,
      nowMs,
    );
    expect(halftime.scoreLine).toBe("1 - 1");
    expect(halftime.statusLabel).toBe("Mi-temps");

    const extraTime = resolveFixturePresentation(
      {
        fixtureStatus: "live",
        homeGoals: 2,
        awayGoals: 2,
        kickoffAt: "2026-11-22T11:30:00.000Z",
        livePhase: "extra_time",
        displayClock: "105'",
      },
      false,
      nowMs,
    );
    expect(extraTime.statusLabel).toBe("Prolongations · 105'");

    const penalties = resolveFixturePresentation(
      {
        fixtureStatus: "live",
        homeGoals: 2,
        awayGoals: 2,
        kickoffAt: "2026-11-22T11:00:00.000Z",
        livePhase: "penalties",
      },
      true,
      nowMs,
    );
    expect(penalties.statusLabel).toBe("Penalties");

    const finishedAet = resolveFixturePresentation(
      {
        fixtureStatus: "finished",
        homeGoals: 3,
        awayGoals: 2,
        kickoffAt: "2026-11-22T10:00:00.000Z",
        statusDetail: "AET",
      },
      false,
      nowMs,
    );
    expect(finishedAet.scoreLine).toBe("3 - 2");
    expect(finishedAet.statusLabel).toBe("Terminé · AET");

    const scheduledFuture = resolveFixturePresentation(
      {
        fixtureStatus: "scheduled",
        homeGoals: null,
        awayGoals: null,
        kickoffAt: "2026-11-22T20:00:00.000Z",
      },
      false,
      nowMs,
    );
    expect(scheduledFuture.scoreLine).toBeNull();
    expect(scheduledFuture.statusLabel).toBe("À venir");
    expect(scheduledFuture.scoreUnavailable).toBe(false);

    const postponed = resolveFixturePresentation(
      {
        fixtureStatus: "postponed",
        homeGoals: null,
        awayGoals: null,
        kickoffAt: "2026-11-22T13:00:00.000Z",
      },
      false,
      nowMs,
    );
    expect(postponed.statusLabel).toBe("Reporté");

    const startedNoScore = resolveFixturePresentation(
      {
        fixtureStatus: "scheduled",
        homeGoals: null,
        awayGoals: null,
        kickoffAt: "2026-11-22T13:00:00.000Z",
      },
      false,
      nowMs,
    );
    expect(startedNoScore.scoreUnavailable).toBe(true);
    expect(startedNoScore.statusLabel).toBe("Score momentanément indisponible");
  });

  it("identifies active-window matches needing live refresh without refreshing distant/finished ones", () => {
    const nowMs = Date.parse("2026-11-22T13:40:00.000Z");

    expect(
      isFixtureInActiveWindow({
        fixtureStatus: "live",
        kickoffAt: "2026-11-22T13:00:00.000Z",
        nowMs,
      }),
    ).toBe(true);

    expect(
      isFixtureInActiveWindow({
        fixtureStatus: "scheduled",
        kickoffAt: "2026-11-22T13:00:00.000Z",
        nowMs,
      }),
    ).toBe(true);

    expect(
      isFixtureInActiveWindow({
        fixtureStatus: "scheduled",
        kickoffAt: "2026-11-22T20:00:00.000Z",
        nowMs,
      }),
    ).toBe(false);

    expect(
      isFixtureInActiveWindow({
        fixtureStatus: "finished",
        kickoffAt: "2026-11-22T11:00:00.000Z",
        nowMs,
      }),
    ).toBe(false);
  });
});
