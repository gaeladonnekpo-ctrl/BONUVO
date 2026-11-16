import { NextResponse, type NextRequest } from "next/server";
import { createDefaultMediaDeps, uploadMediaAsset } from "@/modules/media/service";
import { logSecurityEvent } from "@/server/audit/log";
import { requireActionPermission } from "@/server/auth/guards";
import { ForbiddenError, UnauthorizedError } from "@/server/auth/permissions";
import { getServerEnv } from "@/server/env";
import { MEDIA_MAX_BYTES } from "@/server/media/upload";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { checkSameOrigin } from "@/server/security/origin";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const clientIp = extractTrustedClientIp(request.headers, env.APP_ENV);
  const ipHash = hashIp(clientIp, env.IP_HASH_SECRET);

  const originCheck = checkSameOrigin(request.headers, env.NEXT_PUBLIC_SITE_URL);
  if (!originCheck.allowed) {
    await logSecurityEvent({
      eventType: "csrf_rejected",
      severity: "high",
      ipHash,
      route: "/api/admin/media",
      details: { reason: originCheck.reason ?? "origin_mismatch" },
    });
    return NextResponse.json(
      { error: { code: "CSRF_REJECTED", message: "Origine de requête refusée." } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let actorId: string;
  try {
    const actor = await requireActionPermission("offers.write");
    actorId = actor.id;
  } catch (error) {
    const status =
      error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 403;
    return NextResponse.json(
      {
        error: {
          code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error instanceof Error ? error.message : "Accès refusé.",
        },
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MEDIA_MAX_BYTES + 128 * 1024) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Fichier supérieur à 2 Mo." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_MULTIPART", message: "Corps multipart invalide." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "MISSING_FILE", message: "Aucun fichier fourni." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (file.size > MEDIA_MAX_BYTES) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Taille maximale autorisée : 2 Mo." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const altTextRaw = formData.get("altText");
  const result = await uploadMediaAsset(
    {
      actorId,
      ipHash,
      bytes,
      altText: typeof altTextRaw === "string" ? altTextRaw : "",
    },
    createDefaultMediaDeps(),
  );

  if (!result.ok) {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (result.retryAfterSeconds && result.status === 429) {
      headers["Retry-After"] = String(result.retryAfterSeconds);
    }
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.status, headers },
    );
  }

  return NextResponse.json(
    { ok: true, asset: result.asset },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
