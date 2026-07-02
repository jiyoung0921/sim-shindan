import Link from "next/link";
import { OpenNewWindow } from "iconoir-react";
import { PlanAvailabilityControl } from "./PlanAvailabilityControl";
import { getAllPlansAdmin } from "@/lib/db";
import type { PlanAvailability } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-stone-100 text-zinc-600",
  review: "bg-amber-50 text-amber-800",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-stone-100 text-zinc-400",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  review: "レビュー中",
  published: "公開中",
  archived: "終了",
};

const PLAN_TYPE_LABEL: Record<string, string> = {
  MNO: "大手",
  sub_brand: "サブブランド",
  online_only: "オンライン専用",
  MVNO: "MVNO",
};

const AVAILABILITY_LABEL: Record<PlanAvailability, string> = {
  active: "受付中",
  ended: "受付終了",
  existing_only: "既存のみ",
  unknown: "未確認",
};

export default async function PlansAdminPage() {
  const plans = await getAllPlansAdmin();

  const byStatus = {
    published: plans.filter((p) => p.status === "published").length,
    review: plans.filter((p) => p.status === "review").length,
    draft: plans.filter((p) => p.status === "draft").length,
    archived: plans.filter((p) => p.status === "archived").length,
  };

  const byAvailability = {
    active: plans.filter((p) => p.plan_status === "active").length,
    existing_only: plans.filter((p) => p.plan_status === "existing_only").length,
    ended: plans.filter((p) => p.plan_status === "ended").length,
    unknown: plans.filter((p) => (p.plan_status ?? "unknown") === "unknown").length,
  } satisfies Record<PlanAvailability, number>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">プラン管理</h1>
        <span className="text-sm tabular-nums text-zinc-500">全 {plans.length} 件</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["published", "review", "draft", "archived"] as const).map((status) => (
          <div key={status} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500">{STATUS_LABEL[status]}</p>
            <p
              className={`mt-2 text-3xl font-semibold tabular-nums ${
                byStatus[status] > 0 && status !== "archived" ? "text-zinc-950" : "text-zinc-400"
              }`}
            >
              {byStatus[status]}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["active", "existing_only", "ended", "unknown"] as const).map((availability) => (
          <div key={availability} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500">{AVAILABILITY_LABEL[availability]}</p>
            <p
              className={`mt-2 text-3xl font-semibold tabular-nums ${
                byAvailability[availability] > 0 && availability === "active" ? "text-zinc-950" : "text-zinc-400"
              }`}
            >
              {byAvailability[availability]}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                <th className="px-5 py-3 font-medium">プラン名</th>
                <th className="px-5 py-3 font-medium">キャリア</th>
                <th className="px-5 py-3 font-medium">種別</th>
                <th className="px-5 py-3 text-right font-medium">基本料（税込）</th>
                <th className="px-5 py-3 font-medium">ステータス</th>
                <th className="px-5 py-3 font-medium">受付状態</th>
                <th className="px-5 py-3 font-medium">ソース</th>
                <th className="px-5 py-3 font-medium">確認日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="transition-colors hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-950">{plan.plan_name}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{plan.id}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{plan.carrier_id}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {PLAN_TYPE_LABEL[plan.plan_type] ?? plan.plan_type}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {plan.billing?.tiers?.[0] ? (
                      <>
                        <p className="font-semibold tabular-nums text-zinc-950">
                          ¥{(plan.billing.tiers[0].monthly_fee_yen ?? 0).toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {plan.billing.tiers[0].up_to_gb === "unlimited"
                            ? "無制限"
                            : `〜${plan.billing.tiers[0].up_to_gb}GB`}
                        </p>
                      </>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[plan.status]}`}
                    >
                      {STATUS_LABEL[plan.status] ?? plan.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <PlanAvailabilityControl key={`${plan.id}-${plan.plan_status ?? "unknown"}`} plan={plan} />
                  </td>
                  <td className="px-5 py-3">
                    {plan.evidence?.source_url ? (
                      <a
                        href={plan.evidence.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-950"
                      >
                        公式
                        <OpenNewWindow className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">
                    {new Date(plan.last_verified_at ?? plan.evidence.fetched_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-500">
        プランデータの変更は
        <Link href="/admin/diffs" className="mx-1 font-medium text-zinc-700 underline-offset-4 hover:underline">
          差分キュー
        </Link>
        から行ってください。
      </p>
    </div>
  );
}
