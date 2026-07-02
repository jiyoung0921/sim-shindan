import Link from "next/link";
import { ArrowRight, WarningTriangle } from "iconoir-react";
import { getAllPlansAdmin, getPendingDiffs, getRecentAuditLog } from "@/lib/db";

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

export default async function AdminDashboard() {
  const [plans, diffs, auditLog] = await Promise.all([
    getAllPlansAdmin(),
    getPendingDiffs(),
    getRecentAuditLog(8),
  ]);

  const publishedCount = plans.filter((p) => p.status === "published").length;
  const reviewCount = plans.filter((p) => p.status === "review").length;
  const pendingCount = diffs.filter((d) => d.status === "pending").length;
  const blockedCount = diffs.filter((d) => d.status === "auto_blocked").length;

  const kpis = [
    { label: "公開プラン", value: publishedCount, tone: "text-zinc-950" },
    {
      label: "承認待ち差分",
      value: pendingCount,
      tone: pendingCount > 0 ? "text-amber-700" : "text-zinc-400",
    },
    {
      label: "異常ブロック",
      value: blockedCount,
      tone: blockedCount > 0 ? "text-red-600" : "text-zinc-400",
    },
    {
      label: "レビュー中",
      value: reviewCount,
      tone: reviewCount > 0 ? "text-zinc-950" : "text-zinc-400",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">ダッシュボード</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500">{kpi.label}</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {(pendingCount > 0 || blockedCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <WarningTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                未承認の差分が{pendingCount + blockedCount}件あります
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {blockedCount > 0 && `うち${blockedCount}件は異常検知でブロック済み。`}
                内容を確認してから公開してください。
              </p>
            </div>
          </div>
          <Link
            href="/admin/diffs"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            差分を確認
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-950">プラン一覧</h2>
          <Link
            href="/admin/plans"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
          >
            すべて見る
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                <th className="px-5 py-3 font-medium">プラン名</th>
                <th className="px-5 py-3 font-medium">キャリア</th>
                <th className="px-5 py-3 font-medium">種別</th>
                <th className="px-5 py-3 font-medium">ステータス</th>
                <th className="px-5 py-3 font-medium">更新日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {plans.slice(0, 10).map((plan) => (
                <tr key={plan.id} className="transition-colors hover:bg-stone-50">
                  <td className="px-5 py-3 font-medium text-zinc-950">{plan.plan_name}</td>
                  <td className="px-5 py-3 text-zinc-600">{plan.carrier_id}</td>
                  <td className="px-5 py-3 text-zinc-600">{PLAN_TYPE_LABEL[plan.plan_type]}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[plan.status]}`}
                    >
                      {STATUS_LABEL[plan.status] ?? plan.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">
                    {new Date(plan.updated_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {auditLog.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-950">最近の更新</h2>
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                    entry.action === "created"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-stone-100 text-zinc-600"
                  }`}
                >
                  {entry.action === "created" ? "新規" : "更新"}
                </span>
                <span className="shrink-0 text-sm font-medium text-zinc-950">{entry.plan_name}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">{entry.summary}</span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {new Date(entry.published_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
