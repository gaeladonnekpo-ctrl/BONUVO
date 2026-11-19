import { describe, expect, it } from "vitest";
import { bookmakerInputSchema } from "@/modules/offers/schema";

describe("Point 9 - Betwinner catalog entry validation", () => {
  it("validates Betwinner bookmaker record with bwredir.com allowed host", () => {
    const parsed = bookmakerInputSchema.safeParse({
      name: "Betwinner",
      slug: "betwinner",
      allowedHosts: ["bwredir.com", "betwinner.com"],
      status: "active",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.allowedHosts).toContain("bwredir.com");
    }
  });
});
