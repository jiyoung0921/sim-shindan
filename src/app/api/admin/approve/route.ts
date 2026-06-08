import { NextRequest, NextResponse } from "next/server";
import { approveDiff, rejectDiff, getPendingDiffs } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/admin-auth";

// GET /api/admin/approve - 未承認差分一覧
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const diffs = await getPendingDiffs();
  return NextResponse.json({ diffs });
}

// POST /api/admin/approve - 承認または却下
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { diff_id, action, reviewed_by, review_note } = body as {
      diff_id: string;
      action: "approve" | "reject";
      reviewed_by?: string;
      review_note?: string;
    };

    if (!diff_id || !action) {
      return NextResponse.json({ error: "diff_id and action are required" }, { status: 400 });
    }

    let ok: boolean;
    if (action === "approve") {
      ok = await approveDiff(diff_id, reviewed_by ?? "admin", review_note);
    } else {
      ok = await rejectDiff(diff_id, reviewed_by ?? "admin", review_note);
    }

    return NextResponse.json({ success: ok });
  } catch (e) {
    console.error("[admin/approve]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
