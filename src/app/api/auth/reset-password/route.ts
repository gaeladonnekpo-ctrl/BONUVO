import type { NextRequest } from "next/server";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { resetPasswordSchema } from "@/modules/auth/schema";
import { completePasswordReset } from "@/modules/auth/recovery-service";

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(
    request,
    resetPasswordSchema,
    "/api/auth/reset-password",
    completePasswordReset,
  );
}
