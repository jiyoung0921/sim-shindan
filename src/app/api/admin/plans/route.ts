import { NextRequest, NextResponse } from "next/server";
import { getAllPlansAdmin, updatePlanAvailability, upsertPlan } from "@/lib/db";
import { PlanAvailability, PlanRecord } from "@/lib/types";
import { verifyAdminRequest } from "@/lib/admin-auth";

const PLAN_AVAILABILITIES: PlanAvailability[] = ["active", "ended", "existing_only", "unknown"];

// GET /api/admin/plans - 全プラン取得
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plans = await getAllPlansAdmin();
  return NextResponse.json({ plans });
}

// POST /api/admin/plans - プラン新規作成または更新（スクレイパーからの投入）
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const plan = body as PlanRecord;
    if (!plan.id || !plan.carrier_id || !plan.plan_name) {
      return NextResponse.json({ error: "Missing required plan fields" }, { status: 400 });
    }
    const ok = await upsertPlan(plan);
    if (!ok) {
      return NextResponse.json({ error: "Failed to upsert plan. Supabase may not be configured." }, { status: 500 });
    }
    return NextResponse.json({ success: true, plan_id: plan.id });
  } catch (e) {
    console.error("[admin/plans POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/plans - 受付状態のみ更新
export async function PATCH(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const planId = typeof body.id === "string" ? body.id : "";
    const planStatus = body.plan_status as PlanAvailability | undefined;

    if (!planId || !planStatus || !PLAN_AVAILABILITIES.includes(planStatus)) {
      return NextResponse.json({ error: "Invalid plan availability payload" }, { status: 400 });
    }

    const ok = await updatePlanAvailability(planId, planStatus);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to update plan availability. Supabase may not be configured." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, plan_id: planId, plan_status: planStatus });
  } catch (e) {
    console.error("[admin/plans PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
