import { getAllPlansAdmin, getPendingDiffs, getRecentAuditLog } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-600 text-slate-200",
  review: "bg-amber-700 text-amber-100",
  published: "bg-emerald-700 text-emerald-100",
  archived: "bg-slate-700 text-slate-400",
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
    getRecentAuditLog(10),
  ]);

  const byStatus = {
    published: plans.filter((p) => p.status === "published").length,
    review: plans.filter((p) => p.status === "review").length,
    draft: plans.filter((p) => p.status === "draft").length,
    archived: plans.filter((p) => p.status === "archived").length,
  };

  const pendingCount = diffs.filter((d) => d.status === "pending").length;
  const blockedCount = diffs.filter((d) => d.status === "auto_blocked").length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>

      {/* KPIカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">公開プラン数</p>
          <p className="text-3xl font-bold text-emerald-400">{byStatus.published}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">承認待ち差分</p>
          <p className={`text-3xl font-bold ${pendingCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
            {pendingCount}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">異常ブロック</p>
          <p className={`text-3xl font-bold ${blockedCount > 0 ? "text-red-400" : "text-slate-400"}`}>
            {blockedCount}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">レビュー中</p>
          <p className="text-3xl font-bold text-blue-400">{byStatus.review}</p>
        </div>
      </div>

      {/* 差分キューアラート */}
      {(pendingCount > 0 || blockedCount > 0) && (
        <div className="bg-amber-900/40 border border-amber-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-300">
              ⚠️ 未承認の差分が{pendingCount + blockedCount}件あります
            </p>
            <p className="text-sm text-amber-400 mt-0.5">
              {blockedCount > 0 && `うち${blockedCount}件は異常検知でブロック済み。`}
              確認後に公開してください。
            </p>
          </div>
          <Link
            href="/admin/diffs"
            className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-500 transition-colors shrink-0"
          >
            差分を確認する →
          </Link>
        </div>
      )}

      {/* プラン一覧（要約） */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">プラン一覧</h2>
          <Link href="/admin/plans" className="text-sm text-blue-400 hover:underline">
            すべて見る →
          </Link>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs">
                <th className="px-4 py-3 text-left font-medium">プラン名</th>
                <th className="px-4 py-3 text-left font-medium">キャリア</th>
                <th className="px-4 py-3 text-left font-medium">種別</th>
                <th className="px-4 py-3 text-left font-medium">ステータス</th>
                <th className="px-4 py-3 text-left font-medium">更新日</th>
              </tr>
            </thead>
            <tbody>
              {plans.slice(0, 10).map((plan) => (
                <tr key={plan.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-white">
                    <Link href={`/admin/plans/${plan.id}`} className="hover:underline">
                      {plan.plan_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{plan.carrier_id}</td>
                  <td className="px-4 py-3 text-slate-400">{PLAN_TYPE_LABEL[plan.plan_type]}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[plan.status]}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(plan.updated_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 最近の更新履歴 */}
      {auditLog.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">最近の更新</h2>
          <div className="space-y-2">
            {auditLog.map((entry) => (
              <div key={entry.id} className="bg-slate-800 rounded-lg px-4 py-3 border border-slate-700 flex items-center gap-4">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  entry.action === "created" ? "bg-emerald-800 text-emerald-200" : "bg-blue-800 text-blue-200"
                }`}>
                  {entry.action}
                </span>
                <span className="text-white text-sm font-medium">{entry.plan_name}</span>
                <span className="text-slate-400 text-sm flex-1">{entry.summary}</span>
                <span className="text-slate-500 text-xs">
                  {new Date(entry.published_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
