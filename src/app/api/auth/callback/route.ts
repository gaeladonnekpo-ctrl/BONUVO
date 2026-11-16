import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { loadOrBootstrapProfileContext } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getServerEnv } from "@/server/env";
import { sanitizeRelativeRedirect } from "@/server/security/redirect";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "recovery",
  "invite",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const { searchParams } = request.nextUrl;
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";
  const typeParam = searchParams.get("type");
  const nextRaw = searchParams.get("next");

  const defaultNext =
    typeParam === "recovery" ? `/${locale}/reinitialisation` : `/${locale}/compte`;
  const safeNext = sanitizeRelativeRedirect(nextRaw, defaultNext);

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL(`/${locale}/connexion?error=service_unavailable`, env.NEXT_PUBLIC_SITE_URL),
    );
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/${locale}/verification?error=invalid_token`, env.NEXT_PUBLIC_SITE_URL),
      );
    }
  } else if (tokenHash && typeParam && ALLOWED_OTP_TYPES.has(typeParam as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/${locale}/verification?error=invalid_token`, env.NEXT_PUBLIC_SITE_URL),
      );
    }
  } else {
    return NextResponse.redirect(
      new URL(`/${locale}/verification?error=missing_token`, env.NEXT_PUBLIC_SITE_URL),
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user?.email) {
    await loadOrBootstrapProfileContext({
      userId: userData.user.id,
      email: userData.user.email,
      emailVerifiedAt: userData.user.email_confirmed_at
        ? new Date(userData.user.email_confirmed_at)
        : new Date(),
    });
  }

  return NextResponse.redirect(new URL(safeNext, env.NEXT_PUBLIC_SITE_URL));
}
