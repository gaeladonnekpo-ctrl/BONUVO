import "server-only";

import crypto from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { createSupabaseAdminClient } from "@/server/auth/supabase";

export const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
export const MEDIA_BUCKET = "bonuvo-media";

export const ALLOWED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
export type AllowedImageMime = "image/png" | "image/jpeg" | "image/webp";

const MIME_TO_EXT: Record<AllowedImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export interface ProcessedImageResult {
  buffer: Buffer;
  mimeType: AllowedImageMime;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
}

export interface StorageUploader {
  uploadObject(input: {
    bucket: string;
    path: string;
    buffer: Buffer;
    contentType: AllowedImageMime;
  }): Promise<{ publicUrl: string }>;
}

/**
 * Controls F1 & F3: verifies magic bytes via `file-type`, rejects files > 2 MB or unsupported MIME,
 * and re-encodes the image with `sharp` so EXIF metadata, scripts, and trailing payloads are stripped.
 */
export async function validateAndReencodeImage(
  rawBytes: Uint8Array,
): Promise<ProcessedImageResult> {
  if (rawBytes.byteLength === 0) {
    throw new Error("EMPTY_FILE");
  }
  if (rawBytes.byteLength > MEDIA_MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const detected = await fileTypeFromBuffer(rawBytes);
  if (!detected || !ALLOWED_IMAGE_MIMES.has(detected.mime)) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  const targetMime = detected.mime as AllowedImageMime;
  let pipeline = sharp(rawBytes, { failOn: "error", limitInputPixels: 16_000_000 }).rotate();

  if (targetMime === "image/png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (targetMime === "image/jpeg") {
    pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  } else {
    pipeline = pipeline.webp({ quality: 88 });
  }

  const { data: cleanBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height || cleanBuffer.byteLength > MEDIA_MAX_BYTES) {
    throw new Error("REENCODE_INVALID");
  }

  const sha256 = crypto.createHash("sha256").update(cleanBuffer).digest("hex");
  return {
    buffer: cleanBuffer,
    mimeType: targetMime,
    extension: MIME_TO_EXT[targetMime],
    width: info.width,
    height: info.height,
    sizeBytes: cleanBuffer.byteLength,
    sha256,
  };
}

export function createSupabaseMediaUploader(): StorageUploader | null {
  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return null;
  }

  return {
    async uploadObject(input) {
      const { error } = await adminClient.storage
        .from(input.bucket)
        .upload(input.path, input.buffer, {
          contentType: input.contentType,
          upsert: false,
          cacheControl: "31536000",
        });

      if (error) {
        throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message}`);
      }

      const { data } = adminClient.storage.from(input.bucket).getPublicUrl(input.path);
      return { publicUrl: data.publicUrl };
    },
  };
}

export function buildRandomStoragePath(extension: string): string {
  return `logos/${crypto.randomUUID()}.${extension}`;
}
