import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";
import { createSupabaseProxyClient } from "@/server/auth/supabase";
import { sanitizeRelativeRedirect } from "@/server/security/redirect";

const handleI18nRouting = createMiddleware(routing);

function stripLocalePrefix(pathname: string): { locale: "fr" | "en"; path: string } {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return { locale: "en", path: pathname.slice(3) || "/" };
  }
  if (pathname === "/fr" || pathname.startsWith("/fr/")) {
    return { locale: "fr", path: pathname.slice(3) || "/" };
  }
  return { locale: "fr", path: pathname };
}

/**
 * Next.js 16 proxy entrypoint handling locale routing, Supabase session refresh
 * with HttpOnly cookies, and Level-1 protection of `/admin` and `/compte`.
 */
export async function proxy(request: NextRequest) {
  request.headers.delete("x-bonuvo-dev-showcase");

  const { locale, path } = stripLocalePrefix(request.nextUrl.pathname);
  const isDevShowcasePath = path === "/admin/design" || path.startsWith("/admin/design/");
  const showcaseAllowed = isDevShowcasePath && isDesignShowcaseEnabled();

  if (isDevShowcasePath && !showcaseAllowed) {
    return new NextResponse(null, { status: 404 });
  }

  if (showcaseAllowed) {
    request.headers.set("x-bonuvo-dev-showcase", "1");
  }

  if (process.env.MAINTENANCE_MODE === "1" && path !== "/maintenance") {
    return NextResponse.rewrite(new URL(`/${locale}/maintenance`, request.url), {
      status: 503,
      headers: {
        "Retry-After": "300",
        "Cache-Control": "no-store",
      },
    });
  }

  let response = handleI18nRouting(request);
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  const isMemberPath = path === "/compte" || path.startsWith("/compte/");
  const requiresAuth = (isAdminPath && !showcaseAllowed) || isMemberPath;

  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));

  if (!requiresAuth && !hasAuthCookie) {
    return response;
  }

  const supabase = createSupabaseProxyClient(
    request,
    () => response,
    (updated) => {
      response = updated;
    },
  );

  if (!supabase) {
    if (requiresAuth) {
      const target = sanitizeRelativeRedirect(request.nextUrl.pathname, `/${locale}/compte`);
      return NextResponse.redirect(
        new URL(`/${locale}/connexion?next=${encodeURIComponent(target)}`, request.url),
      );
    }
    return response;
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const isAuthenticated = !claimsError && Boolean(claimsData?.claims?.sub);

  if (requiresAuth && !isAuthenticated) {
    const safeTarget = sanitizeRelativeRedirect(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      `/${locale}/compte`,
    );
    const redirectResponse = NextResponse.redirect(
      new URL(`/${locale}/connexion?next=${encodeURIComponent(safeTarget)}`, request.url),
    );
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|go|_next|_vercel|.*\\..*).*)"],
};
