import { NextRequest, NextResponse } from "next/server";
import { getPlanForRedirect, recordPlanClick } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plan_id: string }> }
) {
  const { plan_id } = await params;
  const plan = await getPlanForRedirect(plan_id);

  if (!plan) {
    return NextResponse.redirect(new URL("/diagnosis", req.url), { status: 302 });
  }

  const rankRaw = req.nextUrl.searchParams.get("rank");
  const rank = rankRaw ? Number(rankRaw) : undefined;

  await recordPlanClick({
    plan_id,
    target_url: plan.source_url,
    session_token: req.nextUrl.searchParams.get("sid") ?? undefined,
    verdict: req.nextUrl.searchParams.get("verdict") ?? undefined,
    rank: Number.isFinite(rank) ? rank : undefined,
    referrer: req.headers.get("referer") ?? undefined,
    user_agent_hint: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.redirect(plan.source_url, { status: 302 });
}
