/**
 * DB抽象化レイヤー
 * Supabaseが設定されていれば使用し、未設定なら静的JSONにフォールバックする。
 * フロントエンドからは常にこのモジュール経由でデータにアクセスする。
 */

import { getSupabaseAdmin, getSupabase, isSupabaseConfigured } from "./supabase";
import { PlanRecord, DiagnosisAnswers, DiagnosisResult } from "./types";

// ─── Plans ───

export async function getPublishedPlans(): Promise<PlanRecord[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (!sb) return fetchStaticPlans();
    const { data, error } = await sb
      .from("plans")
      .select("*")
      .eq("status", "published")
      .order("carrier_id");
    if (error) {
      console.error("[db] getPublishedPlans error:", error.message);
      return fetchStaticPlans();
    }
    return (data ?? []).map(dbRowToPlanRecord);
  }
  return fetchStaticPlans();
}

export async function getAllPlansAdmin(): Promise<PlanRecord[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return fetchStaticPlans();
  const { data, error } = await sb
    .from("plans")
    .select("*")
    .order("carrier_id");
  if (error) {
    console.error("[db] getAllPlansAdmin error:", error.message);
    return fetchStaticPlans();
  }
  return (data ?? []).map(dbRowToPlanRecord);
}

export async function upsertPlan(plan: PlanRecord): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("plans").upsert(planRecordToDbRow(plan));
  if (error) {
    console.error("[db] upsertPlan error:", error.message);
    return false;
  }
  return true;
}

export async function updatePlanStatus(
  planId: string,
  status: "draft" | "review" | "published" | "archived",
  reviewedBy?: string
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb
    .from("plans")
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", planId);
  if (error) {
    console.error("[db] updatePlanStatus error:", error.message);
    return false;
  }
  return true;
}

// ─── Plan Diffs（差分キュー）───

export interface PlanDiff {
  id?: string;
  plan_id: string;
  diff_type: "new_plan" | "price_change" | "discount_change" | "field_change" | "removed";
  changed_fields: string[];
  before_data?: Record<string, unknown> | null;
  after_data: Record<string, unknown>;
  summary: string;
  anomaly_flags?: AnomalyFlag[];
  bill_regression?: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "auto_blocked";
}

export interface AnomalyFlag {
  type: string;
  field: string;
  before: number;
  after: number;
  pct: number;
}

export async function insertPlanDiff(diff: PlanDiff): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    console.log("[db] Supabase not configured. Diff logged to console:", diff.summary);
    return null;
  }
  const { data, error } = await sb
    .from("plan_diffs")
    .insert({
      plan_id: diff.plan_id,
      diff_type: diff.diff_type,
      changed_fields: diff.changed_fields,
      before_data: diff.before_data ?? null,
      after_data: diff.after_data,
      summary: diff.summary,
      anomaly_flags: diff.anomaly_flags ?? [],
      bill_regression: diff.bill_regression ?? {},
      status: diff.anomaly_flags && diff.anomaly_flags.length > 0 ? "auto_blocked" : "pending",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[db] insertPlanDiff error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function getPendingDiffs(): Promise<PlanDiff[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("plan_diffs")
    .select("*")
    .in("status", ["pending", "auto_blocked"])
    .order("scraped_at", { ascending: false });
  if (error) {
    console.error("[db] getPendingDiffs error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function approveDiff(
  diffId: string,
  reviewedBy: string,
  reviewNote?: string
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;

  // 差分を取得
  const { data: diff, error: diffErr } = await sb
    .from("plan_diffs")
    .select("*")
    .eq("id", diffId)
    .single();
  if (diffErr || !diff) return false;

  // plans テーブルへ反映
  const planData = diff.after_data as Record<string, unknown>;
  const { error: planErr } = await sb
    .from("plans")
    .upsert({ ...planData, status: "published" });
  if (planErr) {
    console.error("[db] approveDiff plan upsert error:", planErr.message);
    return false;
  }

  // diff ステータスを approved に
  await sb.from("plan_diffs").update({
    status: "approved",
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_note: reviewNote,
  }).eq("id", diffId);

  // audit_log へ記録
  await sb.from("audit_log").insert({
    plan_id: diff.plan_id,
    plan_name: (planData.plan_name as string) ?? "",
    carrier_id: (planData.carrier_id as string) ?? "",
    action: diff.diff_type === "new_plan" ? "created" : "updated",
    changed_fields: diff.changed_fields,
    summary: diff.summary,
    before_base_fee: (diff.before_data as Record<string, unknown> | null)?.billing
      ? ((diff.before_data as Record<string, unknown>).billing as Record<string, unknown>)?.base_fee_yen as number
      : null,
    after_base_fee: (planData.billing as Record<string, unknown>)?.base_fee_yen as number,
    diff_id: diffId,
    approved_by: reviewedBy,
    source_url: (planData.evidence as Record<string, unknown>)?.source_url as string ?? "",
  });

  return true;
}

export async function rejectDiff(
  diffId: string,
  reviewedBy: string,
  reviewNote?: string
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("plan_diffs").update({
    status: "rejected",
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_note: reviewNote,
  }).eq("id", diffId);
  return !error;
}

// ─── Fetch States（ETag管理）───

export interface FetchState {
  url: string;
  plan_id?: string;
  etag?: string | null;
  last_modified?: string | null;
  last_hash?: string | null;
  last_fetched_at?: string;
  last_status?: number;
  consecutive_errors?: number;
}

export async function getFetchState(url: string): Promise<FetchState | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data } = await sb.from("fetch_states").select("*").eq("url", url).single();
  return data ?? null;
}

export async function upsertFetchState(state: FetchState): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  await sb.from("fetch_states").upsert({
    ...state,
    last_fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ─── Sessions ───

export async function saveSession(
  token: string,
  answers: DiagnosisAnswers,
  result: DiagnosisResult,
  userAgentHint?: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return; // Supabase未設定時はスキップ

  const best = result.recommendations[0];
  await sb.from("diagnosis_sessions").upsert({
    session_token: token,
    answers,
    verdict: result.verdict,
    recommended_action: result.recommended_action,
    persona_type: result.persona_type,
    top_plan_id: best?.plan.id ?? null,
    cash_saving: best?.cash_saving_per_month ?? null,
    completed: true,
    completed_at: new Date().toISOString(),
    user_agent_hint: userAgentHint ?? null,
  });
}

// ─── Feedbacks ───

export async function saveFeedback(
  sessionToken: string,
  rating: number,
  comment?: string,
  verdict?: string,
  topPlanId?: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("feedbacks").insert({
      session_token: sessionToken,
      rating,
      comment: comment ?? null,
      verdict: verdict ?? null,
      top_plan_id: topPlanId ?? null,
    });
  } else {
    // フォールバック: コンソールログ
    console.log("[Feedback]", { sessionToken, rating, comment });
  }
}

// ─── Audit Log（公開用）───

export interface AuditLogEntry {
  id: string;
  plan_id: string;
  plan_name: string;
  carrier_id: string;
  action: string;
  changed_fields: string[];
  summary: string;
  before_base_fee?: number;
  after_base_fee?: number;
  source_url: string;
  published_at: string;
}

export async function getRecentAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("audit_log")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

// ─── New Service Signals ───

export interface NewServiceSignal {
  source: string;
  title: string;
  url?: string;
  raw_content?: string;
  signal_type?: string;
  confidence?: number;
  weight?: number;
  matched_keywords?: string[];
  negative_match?: boolean;
}

export async function insertSignal(signal: NewServiceSignal): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    console.log("[Signal]", signal.title, signal.source);
    return;
  }
  await sb.from("new_service_signals").insert(signal);
}

export interface NewServiceSignalRow extends NewServiceSignal {
  id: string;
  created_at: string;
  dismissed?: boolean;
}

export async function getSignals(limit = 50): Promise<NewServiceSignalRow[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("new_service_signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as NewServiceSignalRow[];
}

export async function dismissSignal(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb
    .from("new_service_signals")
    .update({ dismissed: true })
    .eq("id", id);
  return !error;
}

// ─── ユーティリティ ───

async function fetchStaticPlans(): Promise<PlanRecord[]> {
  // サーバーサイド: ファイルシステムから読み込み
  if (typeof window === "undefined") {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "data", "plans.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as PlanRecord[];
  }
  // クライアントサイド: fetchで取得
  const res = await fetch("/data/plans.json");
  return res.json();
}

// DBの行形式 → PlanRecord
function dbRowToPlanRecord(row: Record<string, unknown>): PlanRecord {
  return {
    id: row.id as string,
    carrier_id: row.carrier_id as string,
    brand_id: row.brand_id as string,
    plan_name: row.plan_name as string,
    plan_type: row.plan_type as PlanRecord["plan_type"],
    billing: row.billing as PlanRecord["billing"],
    discounts: (row.discounts as PlanRecord["discounts"]) ?? [],
    point_economy: row.point_economy as PlanRecord["point_economy"] ?? null,
    data: {
      monthly_gb: row.data_monthly_gb === "unlimited" ? "unlimited" : Number(row.data_monthly_gb),
      throttle_speed_kbps: row.data_throttle_kbps as number,
      tethering_gb: row.data_tethering as PlanRecord["data"]["tethering_gb"],
    },
    constraints: {
      online_only: row.online_only as boolean,
      store_support: row.store_support as PlanRecord["constraints"]["store_support"],
      esim_available: row.esim_available as boolean,
      sim_only_available: row.sim_only_available as boolean,
      payment_methods: row.payment_methods as string[],
    },
    device: {
      bundled_sales: row.bundled_sales as boolean,
      installment_available: row.installment_available as boolean,
    },
    evidence: {
      source_url: row.source_url as string,
      fetched_at: row.fetched_at as string,
      published_at: row.published_at as string | undefined,
      reviewed_by: row.reviewed_by as string | undefined,
      reviewed_at: row.reviewed_at as string | undefined,
      snapshot_path: row.snapshot_path as string,
      notes_hash: row.notes_hash as string,
    },
    status: row.status as PlanRecord["status"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// PlanRecord → DBの行形式
function planRecordToDbRow(plan: PlanRecord): Record<string, unknown> {
  return {
    id: plan.id,
    carrier_id: plan.carrier_id,
    brand_id: plan.brand_id,
    plan_name: plan.plan_name,
    plan_type: plan.plan_type,
    billing: plan.billing,
    discounts: plan.discounts,
    point_economy: plan.point_economy,
    data_monthly_gb: String(plan.data.monthly_gb),
    data_throttle_kbps: plan.data.throttle_speed_kbps,
    data_tethering: String(plan.data.tethering_gb),
    online_only: plan.constraints.online_only,
    store_support: plan.constraints.store_support,
    esim_available: plan.constraints.esim_available,
    sim_only_available: plan.constraints.sim_only_available,
    payment_methods: plan.constraints.payment_methods,
    bundled_sales: plan.device.bundled_sales,
    installment_available: plan.device.installment_available,
    source_url: plan.evidence.source_url,
    fetched_at: plan.evidence.fetched_at,
    published_at: plan.evidence.published_at ?? null,
    reviewed_by: plan.evidence.reviewed_by ?? null,
    reviewed_at: plan.evidence.reviewed_at ?? null,
    snapshot_path: plan.evidence.snapshot_path,
    notes_hash: plan.evidence.notes_hash,
    status: plan.status,
  };
}
