"use client";

import { PlanRecommendation } from "@/lib/types";

interface PlanCardProps {
  recommendation: PlanRecommendation;
  showDetail?: boolean;
}

const RANK_BADGE: Record<number, string> = {
  1: "bg-amber-400 text-white",
  2: "bg-slate-400 text-white",
  3: "bg-orange-700 text-white",
};

const RANK_LABEL: Record<number, string> = {
  1: "1位",
  2: "2位",
  3: "3位",
};

const PLAN_TYPE_LABEL: Record<string, string> = {
  MNO: "大手キャリア",
  sub_brand: "サブブランド",
  online_only: "オンライン専用",
  MVNO: "格安SIM",
};

const STORE_LABEL: Record<string, string> = {
  full: "店舗あり",
  limited: "店舗限定",
  none: "オンラインのみ",
};

export default function PlanCard({ recommendation, showDetail = false }: PlanCardProps) {
  const { plan, rank, cash_saving_per_month, annual_saving, effective_saving_per_month, effective_monthly_fee, recommended_tier, applicable_discounts, breakeven_months, fit_reasons, caveats } = recommendation;

  const hasSaving = cash_saving_per_month > 0;
  const pointGain = effective_saving_per_month - cash_saving_per_month;
  const updatedAt = new Date(plan.evidence.fetched_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-start gap-3 p-5 border-b border-slate-100">
        <span className={`text-sm font-bold px-2.5 py-1 rounded-full shrink-0 ${RANK_BADGE[rank]}`}>
          {RANK_LABEL[rank]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {PLAN_TYPE_LABEL[plan.plan_type]}
            </span>
            {plan.constraints.online_only && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                オンライン専用
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 mt-1">{plan.plan_name}</h3>
          <p className="text-sm text-slate-500">{plan.brand_id.replace(/_/g, " ")}</p>
        </div>
      </div>

      {/* 料金情報 */}
      <div className="p-5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          {/* 現金支出ベース（優先表示・大きく） */}
          <div>
            <p className="text-xs text-slate-500 mb-0.5">月額（現金支出ベース）</p>
            <p className="text-3xl font-extrabold text-slate-900">
              ¥{effective_monthly_fee.toLocaleString()}
              <span className="text-base font-normal text-slate-400">/月</span>
            </p>
            {recommended_tier && (
              <p className="text-xs text-slate-400 mt-0.5">{recommended_tier.label}プラン</p>
            )}
            {applicable_discounts.length > 0 && (
              <p className="text-xs text-green-600 mt-0.5">
                割引 −¥{applicable_discounts.reduce((s, d) => s + d.monthly_discount_yen, 0).toLocaleString()}適用後
              </p>
            )}
          </div>

          {/* 節約額 */}
          {hasSaving && (
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">現在より節約</p>
              <p className="text-xl font-bold text-emerald-600">
                月 −¥{cash_saving_per_month.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">年間 −¥{annual_saving.toLocaleString()}</p>
            </div>
          )}
          {!hasSaving && (
            <div className="text-right">
              <span className="text-sm text-slate-400">現在より割高の可能性</span>
            </div>
          )}
        </div>

        {/* ポイント込み実質（補助・小さく表示） */}
        {pointGain > 0 && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              <span className="font-medium">ポイント込み実質</span>：月 −¥{effective_saving_per_month.toLocaleString()}
              <span className="ml-1 text-amber-500">
                （{plan.point_economy?.condition ?? "ポイント付与条件を要確認"}）
              </span>
            </p>
          </div>
        )}

        {/* 端末残債の回収期間 */}
        {breakeven_months > 0 && (
          <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              端末残債（残{breakeven_months}ヶ月）完済後から節約効果が最大化されます
            </p>
          </div>
        )}
      </div>

      {/* 詳細情報 */}
      {showDetail && (
        <>
          {/* データ・通話条件 */}
          <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-1">データ</p>
              <p className="font-semibold text-slate-700">
                {plan.data.monthly_gb === "unlimited" ? "無制限" : `${plan.data.monthly_gb}GB`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">速度制限後</p>
              <p className="font-semibold text-slate-700">
                {plan.data.throttle_speed_kbps >= 1000
                  ? `${plan.data.throttle_speed_kbps / 1000}Mbps`
                  : `${plan.data.throttle_speed_kbps}kbps`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">店舗</p>
              <p className="font-semibold text-slate-700">{STORE_LABEL[plan.constraints.store_support]}</p>
            </div>
          </div>

          {/* 適用割引 */}
          {applicable_discounts.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">適用可能な割引</p>
              <ul className="space-y-1.5">
                {applicable_discounts.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                    <span className="text-slate-700">
                      {d.name}
                      <span className="text-emerald-600 font-medium ml-1">−¥{d.monthly_discount_yen.toLocaleString()}/月</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* この人に合う理由 */}
          {fit_reasons.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">あなたに合う理由</p>
              <ul className="space-y-1.5">
                {fit_reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-blue-500 shrink-0 mt-0.5">●</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 注意点 */}
          {caveats.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">注意点</p>
              <ul className="space-y-1.5">
                {caveats.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                    <span className="text-amber-500 shrink-0 mt-0.5">!</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* フッター（根拠URL・更新日） */}
      <div className="px-5 py-3 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-400">
          データ更新日：{updatedAt}
        </p>
        <a
          href={plan.evidence.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          公式ページを確認
          <span>↗</span>
        </a>
      </div>
    </div>
  );
}
