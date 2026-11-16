import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { enrollTotpFactor } from "@/modules/auth/mfa-service";
import { authLocaleSchema } from "@/modules/auth/schema";

const enrollSchema = z.object({ locale: authLocaleSchema });

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(
    request,
    enrollSchema,
    "/api/auth/mfa/enroll",
    (payload, clientIp, deps) => enrollTotpFactor(payload.locale, clientIp, deps),
  );
}
