import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as cspReportPost } from "@/app/api/csp-report/route";
import { buildNonceReportOnlyCsp, generateCspNonce } from "@/server/security/csp";

describe("Point 6 - Nonce-based CSP Report-Only & V2 replay", () => {
  it("generates distinct base64 nonces on each call", () => {
    const n1 = generateCspNonce();
    const n2 = generateCspNonce();
    expect(n1.length).toBeGreaterThanOrEqual(16);
    expect(n2.length).toBeGreaterThanOrEqual(16);
    expect(n1).not.toBe(n2);
  });

  it("builds script-src with 'self' 'nonce-...' 'strict-dynamic' without 'unsafe-inline'", () => {
    const nonce = "testNonce123";
    const header = buildNonceReportOnlyCsp(nonce, true);
    const scriptDirective = header
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("script-src "));

    expect(scriptDirective).toBe(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(header).toContain("report-uri /api/csp-report");
    expect(header).toContain("upgrade-insecure-requests");
  });

  it("accepts CSP violation reports (204) and rejects oversized payloads (413)", async () => {
    const validReq = new NextRequest("http://localhost:3000/api/csp-report", {
      method: "POST",
      body: JSON.stringify({
        "csp-report": {
          "violated-directive": "script-src-elem",
          "blocked-uri": "inline",
          "document-uri": "https://www.bonuvofr.com/fr",
        },
      }),
      headers: { "content-type": "application/csp-report" },
    });
    const okRes = await cspReportPost(validReq);
    expect(okRes.status).toBe(204);

    const bigReq = new NextRequest("http://localhost:3000/api/csp-report", {
      method: "POST",
      body: "x".repeat(9000),
      headers: { "content-type": "application/json" },
    });
    const bigRes = await cspReportPost(bigReq);
    expect(bigRes.status).toBe(413);
  });
});
