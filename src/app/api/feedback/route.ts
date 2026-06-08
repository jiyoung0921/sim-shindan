import { NextRequest, NextResponse } from "next/server";
import { saveFeedback } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, rating, comment, verdict, top_plan_id } = body;

    if (!session_id || !rating) {
      return NextResponse.json({ error: "session_id and rating are required" }, { status: 400 });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
    }

    await saveFeedback(session_id, rating, comment, verdict, top_plan_id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[feedback]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
