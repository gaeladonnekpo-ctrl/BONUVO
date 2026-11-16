import type { NextRequest } from "next/server";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { resendVerificationEmail } from "@/modules/auth/mfa-service";
import { resendVerificationSchema } from "@/modules/auth/schema";

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(
    request,
    resendVerificationSchema,
    "/api/auth/resend-verification",
    resendVerificationEmail,
  );
}
