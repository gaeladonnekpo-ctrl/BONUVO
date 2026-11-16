import { describe, expect, it } from "vitest";
import { computeBookmakerFinalScore } from "@/modules/offers/bookmaker-service";
import {
  affiliateLinkSchema,
  bookmakerInputSchema,
  offerInputSchema,
  promoCodeSchema,
} from "@/modules/offers/schema";
import { validateAffiliateUrl } from "@/modules/offers/url-guard";
import { assertCanManageTargetRole, can } from "@/server/auth/permissions";
import { ROLE_CATALOG } from "@/server/auth/rbac-catalog";

describe("Phase 3 — Validation catalogue, B1 URLs d'affiliation et matrice RBAC", () => {
  it("valide B1 : accepte HTTPS sur allowed_hosts ou sous-domaine et rejette HTTP/hôte tiers/IP privée", () => {
    const allowed = ["betclic.ci", "partner.example.com"];

    const exact = validateAffiliateUrl("https://betclic.ci/bonus?ref=1", allowed);
    expect(exact.valid).toBe(true);
    expect(exact.matchedHost).toBe("betclic.ci");

    const sub = validateAffiliateUrl("https://promo.betclic.ci/offre", allowed);
    expect(sub.valid).toBe(true);
    expect(sub.matchedHost).toBe("promo.betclic.ci");

    expect(validateAffiliateUrl("http://betclic.ci/offre", allowed)).toMatchObject({
      valid: false,
      reason: "HTTPS_REQUIRED",
    });
    expect(validateAffiliateUrl("https://evil.example.com/phish", allowed)).toMatchObject({
      valid: false,
      reason: "HOST_NOT_ALLOWED",
    });
    expect(validateAffiliateUrl("https://user:pass@betclic.ci/", allowed)).toMatchObject({
      valid: false,
      reason: "CREDENTIALS_FORBIDDEN",
    });
    expect(validateAffiliateUrl("https://127.0.0.1/admin", ["127.0.0.1"])).toMatchObject({
      valid: false,
      reason: "PRIVATE_HOST_FORBIDDEN",
    });
  });

  it("rejette les dates invalides (validUntil <= validFrom) et les montants négatifs", () => {
    const countryUuid = "00000000-0000-4000-8000-000000000001";
    const bmUuid = "00000000-0000-4000-8000-000000000002";

    expect(() =>
      offerInputSchema.parse({
        bookmakerId: bmUuid,
        slug: "offre-test",
        titleFr: "Bonus test",
        titleEn: "Test bonus",
        bonusAmount: "-500",
        currencyCode: "XOF",
        countryIds: [countryUuid],
      }),
    ).toThrow();

    expect(() =>
      offerInputSchema.parse({
        bookmakerId: bmUuid,
        slug: "offre-test",
        titleFr: "Bonus test",
        titleEn: "Test bonus",
        validFrom: "2026-12-10T00:00:00Z",
        validUntil: "2026-12-01T00:00:00Z",
        countryIds: [countryUuid],
      }),
    ).toThrow();

    expect(() =>
      promoCodeSchema.parse({
        bookmakerId: bmUuid,
        code: "BON10",
        validFrom: "2026-12-10T00:00:00Z",
        validUntil: "2026-12-09T00:00:00Z",
      }),
    ).toThrow();

    const parsedBm = bookmakerInputSchema.parse({
      name: "Opérateur Test",
      slug: "operateur-test",
      allowedHosts: "Operateur.BJ, https-ignored-no; promo.operateur.bj",
    });
    expect(parsedBm.allowedHosts).toEqual(["operateur.bj", "promo.operateur.bj"]);

    const parsedLink = affiliateLinkSchema.parse({
      slug: "lien-test",
      bookmakerId: bmUuid,
      destinationUrl: "https://operateur.bj/join",
    });
    expect(parsedLink.status).toBe("active");
  });

  it("calcule exactement la moyenne pondérée /10 des critères de notation", () => {
    expect(
      computeBookmakerFinalScore({
        bonusScore: 9,
        paymentsScore: 8,
        oddsScore: 7.5,
        appScore: 8.5,
        supportScore: 7,
      }),
    ).toBe("8.00");
  });

  it("vérifie les permissions Phase 3 pour chaque rôle (editor, analyst, admin, super_admin, member)", () => {
    const byRole = (roleName: string) => {
      const def = ROLE_CATALOG.find((r) => r.name === roleName)!;
      return {
        id: `actor-${roleName}`,
        roles: [def.name],
        permissions: [...def.permissions],
      };
    };

    const editor = byRole("editor");
    expect(can(editor, "offers.read")).toBe(true);
    expect(can(editor, "offers.write")).toBe(true);
    expect(can(editor, "offers.publish")).toBe(false);
    expect(can(editor, "links.manage")).toBe(false);
    expect(can(editor, "settings.manage")).toBe(false);

    const analyst = byRole("analyst");
    expect(can(analyst, "offers.read")).toBe(true);
    expect(can(analyst, "offers.write")).toBe(false);
    expect(can(analyst, "stats.export")).toBe(true);

    const admin = byRole("admin");
    expect(can(admin, "offers.publish")).toBe(true);
    expect(can(admin, "links.manage")).toBe(true);
    expect(can(admin, "settings.manage")).toBe(false);
    expect(() =>
      assertCanManageTargetRole({
        actor: admin,
        targetRole: "super_admin",
        targetCurrentRoles: ["member"],
      }),
    ).toThrow();

    const member = byRole("member");
    expect(can(member, "admin.access")).toBe(false);
    expect(can(member, "offers.write")).toBe(false);
  });
});
