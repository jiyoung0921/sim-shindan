import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/db";

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventName = typeof body.event_name === "string" ? body.event_name : "";

    if (!EVENT_NAME_PATTERN.test(eventName)) {
      return NextResponse.json({ error: "Invalid event_name" }, { status: 400 });
    }

    await recordAnalyticsEvent({
      event_name: eventName,
      session_token: typeof body.session_token === "string" ? body.session_token : undefined,
      step_index: Number.isFinite(body.step_index) ? Number(body.step_index) : undefined,
      verdict: typeof body.verdict === "string" ? body.verdict : undefined,
      plan_id: typeof body.plan_id === "string" ? body.plan_id : undefined,
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : undefined,
      user_agent_hint: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[events POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
