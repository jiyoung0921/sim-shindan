import { NextRequest, NextResponse } from "next/server";
import { getSignals, dismissSignal } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/admin-auth";

// GET /api/admin/signals
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const signals = await getSignals(100);
  return NextResponse.json({ signals });
}

// POST /api/admin/signals  { id, action: "dismiss" }
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, action } = body as { id: string; action: string };
    if (!id || action !== "dismiss") {
      return NextResponse.json({ error: "id and action=dismiss required" }, { status: 400 });
    }
    const ok = await dismissSignal(id);
    return NextResponse.json({ success: ok });
  } catch (e) {
    console.error("[admin/signals]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
