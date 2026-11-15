import { NextResponse } from "next/server";
import { pingDatabase } from "@/server/db/client";
import { evaluateHealth } from "@/server/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const { statusCode, body } = await evaluateHealth(pingDatabase);

  return NextResponse.json(body, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
