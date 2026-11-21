import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_HOST_SUFFIXES = ["espncdn.com", "supabase.co", "thesportsdb.com"] as const;

function isAllowedAssetUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    const allowed = ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
    return allowed ? parsed : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") ?? "";
  const target = isAllowedAssetUrl(rawUrl);
  if (!target) {
    return NextResponse.json({ error: "INVALID_ASSET_URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      signal: AbortSignal.timeout(8_000),
      cache: "force-cache",
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "UPSTREAM_ERROR" }, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "NOT_AN_IMAGE" }, { status: 415 });
    }
    const arrayBuffer = await upstream.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "PROXY_FETCH_FAILED" }, { status: 502 });
  }
}
