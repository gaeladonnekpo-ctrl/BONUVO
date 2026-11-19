import { describe, expect, it } from "vitest";
import {
  formatLocalCountryLicense,
  resolveBookmakerLicenseSummary,
} from "@/modules/offers/public-mappers";

describe("Point 1 - License presentation rules", () => {
  it("returns null for per-country license unless both number and authority are present", () => {
    expect(formatLocalCountryLicense("", "")).toBeNull();
    expect(formatLocalCountryLicense("Licence Curaçao", "")).toBeNull();
    expect(formatLocalCountryLicense("", "LNB Bénin")).toBeNull();
    expect(formatLocalCountryLicense("   ", "   ")).toBeNull();
  });

  it("formats local country authorization when both number and authority exist", () => {
    expect(formatLocalCountryLicense("AGR-2026-01", "LNB Bénin")).toBe("AGR-2026-01 · LNB Bénin");
  });

  it("falls back to single operator license when no local country authorization exists", () => {
    expect(
      resolveBookmakerLicenseSummary({
        localLicense: "",
        authorityName: "",
        operatorLicenseNumber: "Licence Curaçao GCB OGL/2024/1262/0493",
        operatorLicenseAuthority: "Curaçao Gaming Control Board",
      }),
    ).toBe("Licence Curaçao GCB OGL/2024/1262/0493");
  });

  it("prefers verified local authorization over offshore operator license", () => {
    expect(
      resolveBookmakerLicenseSummary({
        localLicense: "LONACI-2026-88",
        authorityName: "LONACI Côte d'Ivoire",
        operatorLicenseNumber: "Licence Curaçao GCB OGL/2024/1262/0493",
        operatorLicenseAuthority: "Curaçao Gaming Control Board",
      }),
    ).toBe("LONACI-2026-88 · LONACI Côte d'Ivoire");
  });
});
