import { NextResponse, type NextRequest } from "next/server";

const MAX_CSP_REPORT_BYTES = 8 * 1024;

/**
 * Receives browser Content-Security-Policy-Report-Only violation reports.
 */
export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_CSP_REPORT_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (Buffer.byteLength(raw, "utf8") > MAX_CSP_REPORT_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const report = (parsed["csp-report"] as Record<string, unknown> | undefined) ?? parsed;
    console.warn("[csp-report]", {
      violatedDirective: report["violated-directive"] ?? report["effectiveDirective"] ?? null,
      blockedUri: report["blocked-uri"] ?? report["blockedURL"] ?? null,
      documentUri: report["document-uri"] ?? report["documentURL"] ?? null,
    });
  } catch {
    // Ignore malformed browser payloads silently
  }

  return new NextResponse(null, { status: 204 });
}
