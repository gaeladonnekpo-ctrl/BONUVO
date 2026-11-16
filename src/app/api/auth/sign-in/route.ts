import type { NextRequest } from "next/server";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { signInSchema } from "@/modules/auth/schema";
import { signInWithRateLimit } from "@/modules/auth/service";

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(request, signInSchema, "/api/auth/sign-in", signInWithRateLimit);
}
