"use client";

export interface AuthJsonResult<T = undefined> {
  ok: boolean;
  message: string;
  redirectTo?: string;
  data?: T;
}

export async function postAuthJson<T = undefined>(
  endpoint: string,
  payload: Record<string, unknown>,
  fallbackError: string,
): Promise<AuthJsonResult<T>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      redirectTo?: string;
      data?: T;
      error?: { message?: string };
    } | null;

    if (!response.ok || !body?.ok) {
      return {
        ok: false,
        message: body?.error?.message ?? body?.message ?? fallbackError,
        redirectTo: body?.redirectTo,
      };
    }

    return {
      ok: true,
      message: body.message ?? "",
      redirectTo: body.redirectTo,
      data: body.data,
    };
  } catch {
    return {
      ok: false,
      message: fallbackError,
    };
  }
}
