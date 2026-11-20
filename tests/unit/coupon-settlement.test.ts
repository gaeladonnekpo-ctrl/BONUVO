import { describe, expect, it } from "vitest";
import {
  computeCouponTrackRecordSummary,
  evaluateCouponLegFromFixture,
  evaluateCouponSettlement,
} from "@/modules/ai/model/coupon-settlement";

describe("coupon-settlement", () => {
  it("evaluates standard and double_chance legs accurately from fixture results", () => {
    expect(
      evaluateCouponLegFromFixture({
        fixtureStatus: "finished",
        homeGoals: 2,
        awayGoals: 1,
        market: "double_chance",
        pickedSelection: "1x",
      }),
    ).toBe("won");

    expect(
      evaluateCouponLegFromFixture({
        fixtureStatus: "finished",
        homeGoals: 0,
        awayGoals: 2,
        market: "double_chance",
        pickedSelection: "1x",
      }),
    ).toBe("lost");

    expect(
      evaluateCouponLegFromFixture({
        fixtureStatus: "finished",
        homeGoals: 2,
        awayGoals: 1,
        market: "over_under_25",
        pickedSelection: "over_2_5",
      }),
    ).toBe("won");

    expect(
      evaluateCouponLegFromFixture({
        fixtureStatus: "postponed",
        homeGoals: null,
        awayGoals: null,
        market: "1x2",
        pickedSelection: "home",
      }),
    ).toBe("void");

    expect(
      evaluateCouponLegFromFixture({
        fixtureStatus: "scheduled",
        homeGoals: null,
        awayGoals: null,
        market: "1x2",
        pickedSelection: "home",
      }),
    ).toBeNull();
  });

  it("computes combined coupon settlement status from leg verdicts", () => {
    expect(evaluateCouponSettlement(["won", "won"])).toBe("won");
    expect(evaluateCouponSettlement(["won", "void"])).toBe("won");
    expect(evaluateCouponSettlement(["won", "lost"])).toBe("lost");
    expect(evaluateCouponSettlement(["lost", null])).toBe("lost");
    expect(evaluateCouponSettlement(["won", null])).toBe("pending");
    expect(evaluateCouponSettlement(["void", "void"])).toBe("void");
  });

  it("summarizes coupon track record metrics transparently without fake inflation", () => {
    const summary = computeCouponTrackRecordSummary([
      { settlementStatus: "won", combinedOdds: 2.4 },
      { settlementStatus: "won", combinedOdds: 3.1 },
      { settlementStatus: "lost", combinedOdds: 2.8 },
      { settlementStatus: "void", combinedOdds: 2.0 },
      { settlementStatus: "pending", combinedOdds: 2.5 },
    ]);

    expect(summary.totalCoupons).toBe(5);
    expect(summary.settledCount).toBe(4);
    expect(summary.wonCount).toBe(2);
    expect(summary.lostCount).toBe(1);
    expect(summary.voidCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.winRatePct).toBe(66.7);
    expect(summary.avgWinningOdds).toBe(2.75);
  });
});
