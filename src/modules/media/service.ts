import "server-only";

import { eq } from "drizzle-orm";
import { logAudit, logSecurityEvent } from "@/server/audit/log";
import { withAppDb } from "@/server/db/context";
import { mediaAssets } from "@/server/db/schema";
import {
  buildRandomStoragePath,
  createSupabaseMediaUploader,
  MEDIA_BUCKET,
  validateAndReencodeImage,
  type StorageUploader,
} from "@/server/media/upload";
import { createUpstashRateLimitBackend, type RateLimitBackend } from "@/server/security/rate-limit";

export interface UploadMediaInput {
  actorId: string;
  ipHash: string | null;
  bytes: Uint8Array;
  altText?: string;
}

export interface UploadMediaDeps {
  uploader: StorageUploader | null;
  rateLimiter: RateLimitBackend | null;
}

export interface MediaAssetDto {
  id: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  altText: string;
}

export type MediaUploadResult =
  | { ok: true; status: 200; asset: MediaAssetDto }
  | {
      ok: false;
      status: 400 | 413 | 429 | 503;
      code: string;
      message: string;
      retryAfterSeconds?: number;
    };

export function createDefaultMediaDeps(): UploadMediaDeps {
  return {
    uploader: createSupabaseMediaUploader(),
    rateLimiter: createUpstashRateLimitBackend(),
  };
}

/**
 * Orchestrates F1–F3 upload checks: rate limit (20/h), magic-byte validation,
 * Sharp re-encoding, object storage upload, DB registration, and audit logging.
 */
export async function uploadMediaAsset(
  input: UploadMediaInput,
  deps: UploadMediaDeps,
): Promise<MediaUploadResult> {
  if (!deps.uploader || !deps.rateLimiter) {
    return {
      ok: false,
      status: 503,
      code: "MEDIA_SERVICE_NOT_CONFIGURED",
      message: "Le stockage média ou le service de limitation n'est pas configuré.",
    };
  }

  const rateDecision = await deps.rateLimiter.consume("media_upload", input.actorId);
  if (!rateDecision.allowed) {
    await logSecurityEvent({
      userId: input.actorId,
      eventType: "media_upload_rate_limited",
      severity: "warning",
      ipHash: input.ipHash,
      route: "/api/admin/media",
      details: { retryAfterSeconds: rateDecision.retryAfterSeconds },
    });
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMITED",
      retryAfterSeconds: rateDecision.retryAfterSeconds,
      message: "Quota de téléversement atteint (20 par heure). Veuillez patienter.",
    };
  }

  let processed;
  try {
    processed = await validateAndReencodeImage(input.bytes);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_IMAGE_TYPE";
    await logSecurityEvent({
      userId: input.actorId,
      eventType: "media_upload_rejected",
      severity: "warning",
      ipHash: input.ipHash,
      route: "/api/admin/media",
      details: { reason: code, byteLength: input.bytes.byteLength },
    });
    if (code === "FILE_TOO_LARGE") {
      return {
        ok: false,
        status: 413,
        code,
        message: "Fichier trop volumineux : la taille maximale autorisée est de 2 Mo.",
      };
    }
    return {
      ok: false,
      status: 400,
      code,
      message:
        "Format refusé : seuls les fichiers PNG, JPEG et WebP authentiques (<= 2 Mo) sont acceptés.",
    };
  }

  const storagePath = buildRandomStoragePath(processed.extension);
  const { publicUrl } = await deps.uploader.uploadObject({
    bucket: MEDIA_BUCKET,
    path: storagePath,
    buffer: processed.buffer,
    contentType: processed.mimeType,
  });

  const cleanAlt = (input.altText ?? "").trim().slice(0, 160);
  const [inserted] = await withAppDb(
    { scope: "user_session", actorId: input.actorId },
    async (tx) =>
      tx
        .insert(mediaAssets)
        .values({
          storageBucket: MEDIA_BUCKET,
          storagePath,
          publicUrl,
          mimeType: processed.mimeType,
          sizeBytes: processed.sizeBytes,
          width: processed.width,
          height: processed.height,
          sha256: processed.sha256,
          altText: cleanAlt,
          uploadedBy: input.actorId,
        })
        .returning(),
  );

  if (!inserted) {
    throw new Error("MEDIA_INSERT_FAILED");
  }

  await logAudit({
    actorId: input.actorId,
    action: "media.uploaded",
    entityType: "media_assets",
    entityId: inserted.id,
    beforeState: null,
    afterState: {
      storagePath,
      mimeType: processed.mimeType,
      sizeBytes: processed.sizeBytes,
      width: processed.width,
      height: processed.height,
      sha256: processed.sha256,
    },
    ipHash: input.ipHash,
  });

  return {
    ok: true,
    status: 200,
    asset: {
      id: inserted.id,
      publicUrl: inserted.publicUrl,
      mimeType: inserted.mimeType,
      width: inserted.width,
      height: inserted.height,
      sizeBytes: inserted.sizeBytes,
      altText: inserted.altText,
    },
  };
}

export async function listActiveMediaAssets(actorId: string): Promise<MediaAssetDto[]> {
  const rows = await withAppDb({ scope: "user_session", actorId }, async (tx) =>
    tx.select().from(mediaAssets).where(eq(mediaAssets.status, "active")),
  );
  return rows.map((r) => ({
    id: r.id,
    publicUrl: r.publicUrl,
    mimeType: r.mimeType,
    width: r.width,
    height: r.height,
    sizeBytes: r.sizeBytes,
    altText: r.altText,
  }));
}
