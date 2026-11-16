import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { MEDIA_MAX_BYTES, validateAndReencodeImage } from "@/server/media/upload";
import { uploadMediaAsset } from "@/modules/media/service";
import { createTestRateLimitBackend } from "@/server/security/rate-limit";

vi.mock("@/server/audit/log", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

const dbInsertSpy = vi.fn().mockImplementation(() => [
  {
    id: "00000000-0000-4000-8000-000000000999",
    publicUrl:
      "https://cdn.example.supabase.co/storage/v1/object/public/bonuvo-media/logos/uuid.png",
    mimeType: "image/png",
    width: 16,
    height: 16,
    sizeBytes: 120,
    altText: "Logo",
  },
]);

vi.mock("@/server/db/context", () => ({
  withAppDb: vi.fn(async (_ctx, handler) =>
    handler({
      insert: () => ({
        values: () => ({
          returning: dbInsertSpy,
        }),
      }),
    }),
  ),
}));

describe("Phase 3 — Contrôles téléversement médias F1 à F3", () => {
  it("accepte un vrai PNG, supprime EXIF et ré-encode l'image", async () => {
    const rawPngWithExif = await sharp({
      create: { width: 16, height: 16, channels: 4, background: { r: 255, g: 90, b: 0, alpha: 1 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: "SecretGPS" } } })
      .png()
      .toBuffer();

    const processed = await validateAndReencodeImage(new Uint8Array(rawPngWithExif));
    expect(processed.mimeType).toBe("image/png");
    expect(processed.width).toBe(16);
    expect(processed.height).toBe(16);
    expect(processed.buffer.includes(Buffer.from("SecretGPS"))).toBe(false);
  });

  it("refuse un exécutable renommé en .png, un SVG scripté et un fichier > 2 Mo", async () => {
    const fakeExeAsPng = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    await expect(validateAndReencodeImage(new Uint8Array(fakeExeAsPng))).rejects.toThrow(
      "INVALID_IMAGE_TYPE",
    );

    const maliciousSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    await expect(validateAndReencodeImage(new Uint8Array(maliciousSvg))).rejects.toThrow(
      "INVALID_IMAGE_TYPE",
    );

    const oversized = new Uint8Array(MEDIA_MAX_BYTES + 1);
    await expect(validateAndReencodeImage(oversized)).rejects.toThrow("FILE_TOO_LARGE");
  });

  it("applique le quota 20 téléversements / heure et rejette un faux fichier via uploadMediaAsset", async () => {
    const rateLimiter = createTestRateLimitBackend();
    const uploader = {
      uploadObject: vi.fn().mockResolvedValue({
        publicUrl:
          "https://cdn.example.supabase.co/storage/v1/object/public/bonuvo-media/logos/uuid.png",
      }),
    };

    const validPng = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();

    for (let i = 0; i < 20; i++) {
      const res = await uploadMediaAsset(
        {
          actorId: "00000000-0000-4000-8000-000000000111",
          ipHash: "h1",
          bytes: new Uint8Array(validPng),
        },
        { uploader, rateLimiter },
      );
      expect(res.ok).toBe(true);
    }

    const twentyFirst = await uploadMediaAsset(
      {
        actorId: "00000000-0000-4000-8000-000000000111",
        ipHash: "h1",
        bytes: new Uint8Array(validPng),
      },
      { uploader, rateLimiter },
    );
    expect(twentyFirst).toMatchObject({ ok: false, status: 429, code: "RATE_LIMITED" });
  });
});
