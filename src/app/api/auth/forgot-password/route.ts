import type { NextRequest } from "next/server";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { forgotPasswordSchema } from "@/modules/auth/schema";
import { requestPasswordResetNeutral } from "@/modules/auth/recovery-service";

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(
    request,
    forgotPasswordSchema,
    "/api/auth/forgot-password",
    requestPasswordResetNeutral,
  );
}
