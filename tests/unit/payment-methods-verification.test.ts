import { describe, expect, it } from "vitest";
import { bookmakerPaymentMethodSchema } from "@/modules/offers/schema";

describe("Point 8 - Per-operator & per-country payment method confirmation", () => {
  it("defaults confirmed to false when adding a new payment method association", () => {
    const parsed = bookmakerPaymentMethodSchema.safeParse({
      bookmakerId: "11111111-1111-4111-8111-111111111111",
      paymentMethodId: "22222222-2222-4222-8222-222222222222",
      countryId: "33333333-3333-4333-8333-333333333333",
      minDepositAmount: "500",
      currencyCode: "XOF",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.confirmed).toBe(false);
    }
  });

  it("allows explicit admin confirmation per operator and country", () => {
    const parsed = bookmakerPaymentMethodSchema.safeParse({
      bookmakerId: "11111111-1111-4111-8111-111111111111",
      paymentMethodId: "22222222-2222-4222-8222-222222222222",
      countryId: "33333333-3333-4333-8333-333333333333",
      minDepositAmount: "500",
      currencyCode: "XOF",
      confirmed: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.confirmed).toBe(true);
    }
  });
});
