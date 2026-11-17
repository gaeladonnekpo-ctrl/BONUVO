import { NextResponse, type NextRequest } from "next/server";
import { handleIncomingPartnerEvent } from "@/modules/affiliation/postback-service";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function extractQueryRecord(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function processPostback(
  request: NextRequest,
  context: { params: Promise<{ network: string }> },
  method: "GET" | "POST",
) {
  const { network } = await context.params;
  const rawBody = method === "POST" ? await request.text() : "";

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Charge postback trop volumineuse." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const res = await handleIncomingPartnerEvent({
    networkSlug: network,
    sourceType: "postback",
    method,
    query: extractQueryRecord(request),
    headers: request.headers,
    rawBody,
  });

  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (res.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(res.retryAfterSeconds);
  }

  return NextResponse.json(res.body, { status: res.status, headers });
}

export async function GET(request: NextRequest, context: { params: Promise<{ network: string }> }) {
  return processPostback(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ network: string }> },
) {
  return processPostback(request, context, "POST");
}
