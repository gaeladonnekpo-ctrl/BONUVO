import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { logSecurityEvent } from "@/server/audit/log";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { checkSameOrigin } from "@/server/security/origin";
import {
  createDefaultAuthDeps,
  type AuthActionResponse,
  type AuthServiceDeps,
} from "@/modules/auth/service";

const MAX_AUTH_BODY_BYTES = 16 * 1024;

export function toAuthHttpResponse<T>(result: AuthActionResponse<T>): NextResponse {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
  };
  if (result.retryAfterSeconds && result.status === 429) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: result.code ?? "AUTH_ERROR",
          message: result.message,
        },
        redirectTo: result.redirectTo,
      },
      { status: result.status, headers },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: result.message,
      redirectTo: result.redirectTo,
      data: result.data,
    },
    { status: result.status, headers },
  );
}

export async function handleValidatedAuthPost<TSchema extends z.ZodTypeAny, TOut = undefined>(
  request: NextRequest,
  schema: TSchema,
  routePath: string,
  handler: (
    payload: z.infer<TSchema>,
    clientIp: string,
    deps: AuthServiceDeps,
  ) => Promise<AuthActionResponse<TOut>>,
  depsOverride?: AuthServiceDeps,
): Promise<NextResponse> {
  const env = getServerEnv();
  const clientIp = extractTrustedClientIp(request.headers, env.APP_ENV);
  const ipHash = hashIp(clientIp, env.IP_HASH_SECRET);

  const originCheck = checkSameOrigin(request.headers, env.NEXT_PUBLIC_SITE_URL);
  if (!originCheck.allowed) {
    await logSecurityEvent({
      eventType: "csrf_rejected",
      severity: "high",
      ipHash,
      route: routePath,
      details: { reason: originCheck.reason ?? "origin_mismatch" },
    });
    return NextResponse.json(
      { error: { code: "CSRF_REJECTED", message: "Origine de requête refusée." } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_AUTH_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Corps de requête trop volumineux." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Corps de requête illisible." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (Buffer.byteLength(rawText, "utf8") > MAX_AUTH_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Corps de requête trop volumineux." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let jsonBody: unknown = {};
  if (rawText.trim().length > 0) {
    try {
      jsonBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Format JSON invalide." } },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const parsed = schema.safeParse(jsonBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstIssue } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const deps = depsOverride ?? (await createDefaultAuthDeps());
  const result = await handler(parsed.data, clientIp, deps);
  return toAuthHttpResponse(result);
}
