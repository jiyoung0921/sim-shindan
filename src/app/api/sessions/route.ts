import { NextRequest, NextResponse } from "next/server";
import { saveSession } from "@/lib/db";
import { DiagnosisAnswers, DiagnosisResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_token, answers, result } = body as {
      session_token: string;
      answers: DiagnosisAnswers;
      result: DiagnosisResult;
    };

    if (!session_token || !answers || !result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent")?.slice(0, 100) ?? undefined;
    await saveSession(session_token, answers, result, ua);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[sessions]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
