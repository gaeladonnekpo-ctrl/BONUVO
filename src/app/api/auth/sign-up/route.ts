import type { NextRequest } from "next/server";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { signUpSchema } from "@/modules/auth/schema";
import { signUpWithRateLimit } from "@/modules/auth/service";

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(request, signUpSchema, "/api/auth/sign-up", signUpWithRateLimit);
}
