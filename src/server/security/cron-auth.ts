import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { logSecurityEvent } from "@/server/audit/log";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function extractCronToken(request: NextRequest): string {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return (request.headers.get("x-cron-secret") ?? "").trim();
}

function constantTimeMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function verifyCronRequest(
  request: NextRequest,
  route: string,
): Promise<{ ok: true; ipHash: string | null } | { ok: false; response: NextResponse }> {
  const env = getServerEnv();
  const ipHash = hashIp(extractTrustedClientIp(request.headers, env.APP_ENV), env.IP_HASH_SECRET);
  const expected = env.CRON_SECRET ?? "";
  const provided = extractCronToken(request);

  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "CRON_NOT_CONFIGURED",
            message: "Secret de planification absent.",
          },
        },
        { status: 503, headers: NO_STORE },
      ),
    };
  }

  if (!constantTimeMatch(provided, expected)) {
    await logSecurityEvent({
      eventType: "cron_unauthorized",
      severity: "high",
      ipHash,
      route,
      details: { reason: "invalid_or_missing_secret" },
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Jeton de planification invalide.",
          },
        },
        { status: 401, headers: NO_STORE },
      ),
    };
  }

  return { ok: true, ipHash };
}

export async function parseCronJsonBody<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): Promise<{ ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse }> {
  try {
    const text = await request.text();
    if (text.length > 4096) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Corps supérieur à 4 Ko.",
            },
          },
          { status: 413, headers: NO_STORE },
        ),
      };
    }

    const raw = text.trim() ? (JSON.parse(text) as unknown) : {};
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: {
              code: "INVALID_PAYLOAD",
              message: "Paramètres de tâche planifiée invalides.",
            },
          },
          { status: 400, headers: NO_STORE },
        ),
      };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Corps JSON invalide.",
          },
        },
        { status: 400, headers: NO_STORE },
      ),
    };
  }
}
