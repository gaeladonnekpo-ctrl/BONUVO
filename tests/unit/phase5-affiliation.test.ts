import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPartnerAdapter } from "@/modules/affiliation/adapters";
import { isIpInAllowlist, resolveAffiliateSecret } from "@/modules/affiliation/adapters/security";
import { parseCsvRecords } from "@/modules/affiliation/csv-parser";
import {
  campaignUpsertSchema,
  commissionStatusUpdateSchema,
} from "@/modules/affiliation/phase5-schema";

describe("Phase 5 — Adaptateurs postbacks, sécurité signature/timestamp, CSV 1000 lignes et commissions", () => {
  afterEach(() => {
    delete process.env.AFFILIATE_TEST_ONEWIN;
    delete process.env.AFFILIATE_TEST_1X;
  });

  it("refuse toute variable d'environnement hors préfixe AFFILIATE_ et valide allowlist IP/CIDR", () => {
    expect(resolveAffiliateSecret("DATABASE_URL")).toBeNull();
    expect(resolveAffiliateSecret("SUPABASE_SERVICE_ROLE_KEY")).toBeNull();
    process.env.AFFILIATE_TEST_1X = "super-secret-token-1x";
    expect(resolveAffiliateSecret("AFFILIATE_TEST_1X")).toBe("super-secret-token-1x");

    expect(isIpInAllowlist("198.51.100.25", ["198.51.100.0/24"])).toBe(true);
    expect(isIpInAllowlist("203.0.113.9", ["198.51.100.0/24"])).toBe(false);
  });

  it("vérifie jeton/HMAC en temps constant et rejette horodatage > 5 minutes ou IP non autorisée", () => {
    process.env.AFFILIATE_TEST_ONEWIN = "onewin-hmac-secret-key";
    const adapter = getPartnerAdapter("1win");
    const rawBody = JSON.stringify({
      event_id: "evt_100",
      event: "ftd",
      clickid: "clk_0123456789abcdef0123456789abcdef",
      sum: "5000",
      payout: "25",
      currency: "USD",
    });
    const now = new Date("2026-11-17T00:00:00.000Z");
    const validTs = String(Math.floor(now.getTime() / 1000));
    const sig = createHmac("sha256", "onewin-hmac-secret-key")
      .update(`${validTs}.${rawBody}`, "utf8")
      .digest("hex");

    const network = {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "1win-partners",
      name: "1win Partners",
      bookmakerId: null,
      adapterKey: "1win" as const,
      subIdParamName: "subid",
      secretEnvRef: "AFFILIATE_TEST_ONEWIN",
      signatureMode: "hmac_sha256" as const,
      signatureHeader: "x-signature",
      allowedIps: ["198.51.100.0/24"],
      timestampToleranceSeconds: 300,
    };

    const ok = adapter.verify({
      network,
      method: "POST",
      clientIp: "198.51.100.44",
      query: {},
      headers: { "x-timestamp": validTs, "x-signature": `sha256=${sig}` },
      rawBody,
      now,
    });
    expect(ok.ok).toBe(true);
    expect(ok.status).toBe(200);

    const badSig = adapter.verify({
      network,
      method: "POST",
      clientIp: "198.51.100.44",
      query: {},
      headers: { "x-timestamp": validTs, "x-signature": "deadbeef" },
      rawBody,
      now,
    });
    expect(badSig.ok).toBe(false);
    expect(badSig.status).toBe(401);

    const staleTs = String(Math.floor(now.getTime() / 1000) - 305);
    const staleSig = createHmac("sha256", "onewin-hmac-secret-key")
      .update(`${staleTs}.${rawBody}`, "utf8")
      .digest("hex");
    const expired = adapter.verify({
      network,
      method: "POST",
      clientIp: "198.51.100.44",
      query: {},
      headers: { "x-timestamp": staleTs, "x-signature": staleSig },
      rawBody,
      now,
    });
    expect(expired.ok).toBe(false);
    expect(expired.status).toBe(401);

    const deniedIp = adapter.verify({
      network,
      method: "POST",
      clientIp: "203.0.113.5",
      query: {},
      headers: { "x-timestamp": validTs, "x-signature": sig },
      rawBody,
      now,
    });
    expect(deniedIp.ok).toBe(false);
    expect(deniedIp.status).toBe(403);
  });

  it("extrait le clickid 1xPartners depuis tag composite et rejette montant négatif ou devise inconnue", () => {
    const adapter = getPartnerAdapter("1xpartners");
    const parsedOk = adapter.parse({
      query: {
        status: "sale",
        tag: "d_2682459m_97c_clk_abcdef0123456789abcdef0123456789",
        event_id: "tx_901",
        payout: "18.50",
        currency: "USD",
      },
      rawBody: "",
      contentType: "",
    });
    expect(parsedOk.ok).toBe(true);
    expect(parsedOk.conversionType).toBe("first_deposit");
    expect(parsedOk.publicClickId).toBe("clk_abcdef0123456789abcdef0123456789");

    const badAmount = adapter.parse({
      query: { status: "sale", amount: "-100", currency: "XOF" },
      rawBody: "",
      contentType: "",
    });
    expect(badAmount.ok).toBe(false);

    const badCurrency = adapter.parse({
      query: { status: "sale", payout: "10", currency: "ZZZ" },
      rawBody: "",
      contentType: "",
    });
    expect(badCurrency.ok).toBe(false);
  });

  it("parse un CSV de 1000 lignes et impose une preuve justificative pour confirmer une commission", () => {
    const header =
      "external_event_id,bookmaker_slug,conversion_type,occurred_at,amount,currency,click_id";
    const lines = [header];
    for (let i = 1; i <= 1000; i++) {
      lines.push(
        `imp_${i},1xbet,first_deposit,2026-11-16T10:00:00Z,${i % 50 === 0 ? -10 : 5000},XOF,`,
      );
    }
    const parsed = parseCsvRecords(lines.join("\n"));
    expect(parsed.rows).toHaveLength(1000);

    expect(
      commissionStatusUpdateSchema.safeParse({
        commissionId: "00000000-0000-4000-8000-000000000001",
        nextStatus: "confirmed",
        proofReference: "",
      }).success,
    ).toBe(false);

    expect(
      commissionStatusUpdateSchema.safeParse({
        commissionId: "00000000-0000-4000-8000-000000000001",
        nextStatus: "confirmed",
        proofReference: "INV-1X-2026-11",
      }).success,
    ).toBe(true);

    expect(
      campaignUpsertSchema.safeParse({
        code: "tg-can-2026",
        name: "Campagne Telegram",
        source: "telegram",
        medium: "social",
      }).success,
    ).toBe(true);
  });
});
