import type { NextRequest } from "next/server";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { verifyTotpChallenge } from "@/modules/auth/mfa-service";
import { totpVerifySchema } from "@/modules/auth/schema";

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(
    request,
    totpVerifySchema,
    "/api/auth/mfa/verify",
    verifyTotpChallenge,
  );
}
