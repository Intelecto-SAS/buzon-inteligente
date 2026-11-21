import { integrationStatus } from "@/lib/env";
import { NextResponse } from "next/server";

export function GET() {
  const status = integrationStatus();
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    integrations: status,
  });
}
