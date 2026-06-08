import { getAllPlansAdmin } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  draft:     "bg-slate-600 text-slate-200",
  review:    "bg-amber-700 text-amber-100",
  published: "bg-emerald-700 text-emerald-100",
  archived:  "bg-slate-700 text-slate-400",
};

const STATUS_LABEL: Record<string, string> = {
  draft:     "下書き",
  review:    "レビュー中",
  published: "公開中",
  archived:  "終了",
};

const PLAN_TYPE_LABEL: Record<string, string> = {
  MNO:         "大手",
  sub_brand:   "サブブランド",
  online_only: "オンライン専用",
  MVNO:        "MVNO",
};

const CARRIER_BADGE: Record<string, string> = {
  docomo:   "bg-red-900/60 text-red-300",
  au:       "bg-orange-900/60 text-orange-300",
  softbank: "bg-yellow-900/60 text-yellow-300",
  rakuten:  "bg-pink-900/60 text-pink-300",
  iij:      "bg-blue-900/60 text-blue-300",
  mineo:    "bg-green-900/60 text-green-300",
  nuro:     "bg-purple-900/60 text-purple-300",
};

export default async function PlansAdminPage() {
  const plans = await getAllPlansAdmin();

  const byStatus = {
    published: plans.filter((p) => p.status === "published").length,
    review:    plans.filter((p) => p.status === "review").length,
    draft:     plans.filter((p) => p.status === "draft").length,
    archived:  plans.filter((p) => p.status === "archived").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">プラン管理</h1>
        <div className="flex gap-3">
          <span className="text-xs text-slate-400 self-center">
            全 {plans.length} 件
          </span>
        </div>
      </div>

      {/* 集計バー */}
      <div className="grid grid-cols-4 gap-3">
        {(["published", "review", "draft", "archived"] as const).map((s) => (
          <div key={s} className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
            <p className="text-2xl font-bold text-white">{byStatus[s]}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${STATUS_BADGE[s]}`}>
              {STATUS_LABEL[s]}
            </span>
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs">
              <th className="px-4 py-3 text-left font-medium">プラン名</th>
              <th className="px-4 py-3 text-left font-medium">キャリア</th>
              <th className="px-4 py-3 text-left font-medium">種別</th>
              <th className="px-4 py-3 text-right font-medium">基本料 (税込)</th>
              <th className="px-4 py-3 text-left font-medium">ステータス</th>
              <th className="px-4 py-3 text-left font-medium">データソース</th>
              <th className="px-4 py-3 text-left font-medium">最終更新</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 group">
                <td className="px-4 py-3 font-medium text-white">
                  <div className="flex flex-col">
                    <span>{plan.plan_name}</span>
                    <span className="text-xs text-slate-500 mt-0.5 font-normal">{plan.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    CARRIER_BADGE[plan.carrier_id] ?? "bg-slate-700 text-slate-300"
                  }`}>
                    {plan.carrier_id}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {PLAN_TYPE_LABEL[plan.plan_type] ?? plan.plan_type}
                </td>
                <td className="px-4 py-3 text-right">
                  {plan.billing?.tiers?.[0] ? (
                    <div className="flex flex-col items-end">
                      <span className="text-white font-semibold">
                        ¥{(plan.billing.tiers[0].monthly_fee_yen ?? 0).toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {plan.billing.tiers[0].up_to_gb === "unlimited"
                          ? "無制限"
                          : `〜${plan.billing.tiers[0].up_to_gb}GB`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[plan.status]}`}>
                    {STATUS_LABEL[plan.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {plan.evidence?.source_url ? (
                    <a
                      href={plan.evidence.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      公式 ↗
                    </a>
                  ) : (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(plan.updated_at).toLocaleDateString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500 text-center">
        プランデータの変更は差分キューから行ってください。
        <Link href="/admin/diffs" className="text-blue-400 hover:underline ml-1">
          差分キューへ →
        </Link>
      </div>
    </div>
  );
}
