import { NextResponse, type NextRequest } from "next/server";
import { handleIncomingPartnerEvent } from "@/modules/affiliation/postback-service";

export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const rawBody = await request.text();

  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Charge webhook trop volumineuse." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const res = await handleIncomingPartnerEvent({
    networkSlug: provider,
    sourceType: "webhook",
    method: "POST",
    query,
    headers: request.headers,
    rawBody,
  });

  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (res.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(res.retryAfterSeconds);
  }

  return NextResponse.json(res.body, { status: res.status, headers });
}
