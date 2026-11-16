import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/server/env";

function buildSessionCookieOptions(
  incoming: CookieOptions | undefined,
  isSecureEnv: boolean,
): CookieOptions {
  return {
    ...incoming,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureEnv,
    path: "/",
  };
}

export function isSupabaseAuthConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}

export function isSupabaseAdminConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  const cookieStore = await cookies();
  const isSecureEnv = env.APP_ENV !== "local";

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookieOptions: buildSessionCookieOptions(undefined, isSecureEnv),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, buildSessionCookieOptions(options, isSecureEnv));
          }
        } catch {
          // Called from a read-only Server Component; proxy.ts handles cookie propagation.
        }
      },
    },
  });
}

export function createSupabaseProxyClient(
  request: NextRequest,
  getResponse: () => NextResponse,
  setResponse: (nextResponse: NextResponse) => void,
): SupabaseClient | null {
  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  const isSecureEnv = env.APP_ENV !== "local";

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookieOptions: buildSessionCookieOptions(undefined, isSecureEnv),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        const current = getResponse();
        for (const { name, value, options } of cookiesToSet) {
          current.cookies.set(name, value, buildSessionCookieOptions(options, isSecureEnv));
        }
        for (const [headerName, headerValue] of Object.entries(headers)) {
          current.headers.set(headerName, headerValue);
        }
        setResponse(current);
      },
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
