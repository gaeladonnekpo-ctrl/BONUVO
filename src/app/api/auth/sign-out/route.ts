import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleValidatedAuthPost } from "@/modules/auth/http";
import { signOutCurrentUser } from "@/modules/auth/mfa-service";
import { authLocaleSchema } from "@/modules/auth/schema";

const signOutSchema = z.object({ locale: authLocaleSchema });

export async function POST(request: NextRequest) {
  return handleValidatedAuthPost(
    request,
    signOutSchema,
    "/api/auth/sign-out",
    (payload, clientIp, deps) => signOutCurrentUser(payload.locale, clientIp, deps),
  );
}
