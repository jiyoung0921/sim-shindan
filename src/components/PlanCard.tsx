"use client";

import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Database,
  ExternalLink,
  ReceiptText,
  Store,
  Wifi,
} from "lucide-react";
import { PlanRecommendation } from "@/lib/types";

interface PlanCardProps {
  recommendation: PlanRecommendation;
  showDetail?: boolean;
}

const PLAN_TYPE_LABEL: Record<string, string> = {
  MNO: "大手",
  sub_brand: "サブブランド",
  online_only: "オンライン専用",
  MVNO: "MVNO",
};

const STORE_LABEL: Record<string, string> = {
  full: "店舗あり",
  limited: "一部店舗",
  none: "オンラインのみ",
};

const CARRIER_LABEL: Record<string, string> = {
  docomo: "docomo",
  au: "au",
  softbank: "SoftBank",
  rakuten: "楽天モバイル",
  iij: "IIJmio",
  mineo: "mineo",
  nuro: "NURO",
};

function yen(value: number) {
  return `¥${value.toLocaleString()}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export default function PlanCard({ recommendation, showDetail = false }: PlanCardProps) {
  const {
    plan,
    rank,
    cash_saving_per_month,
    annual_saving,
    effective_saving_per_month,
    effective_monthly_fee,
    recommended_tier,
    applicable_discounts,
    breakeven_months,
    fit_reasons,
    caveats,
  } = recommendation;

  const hasSaving = cash_saving_per_month > 0;
  const pointGain = effective_saving_per_month - cash_saving_per_month;
  const totalDiscount = applicable_discounts.reduce((sum, discount) => sum + discount.monthly_discount_yen, 0);

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white">
                {rank}位
              </span>
              <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                {PLAN_TYPE_LABEL[plan.plan_type] ?? plan.plan_type}
              </span>
              {plan.constraints.online_only && (
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                  オンライン
                </span>
              )}
            </div>
            <h3 className="mt-3 text-xl font-semibold leading-tight text-zinc-950">{plan.plan_name}</h3>
            <p className="mt-1 text-sm text-zinc-500">{CARRIER_LABEL[plan.carrier_id] ?? plan.carrier_id}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-zinc-500">月額</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{yen(effective_monthly_fee)}</p>
            <p className="text-xs text-zinc-500">現金支出ベース</p>
          </div>
        </div>
      </div>

      <div className="grid divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <p className="text-xs text-zinc-500">現在との差額</p>
          <p className={`mt-1 text-lg font-semibold ${hasSaving ? "text-emerald-700" : "text-zinc-700"}`}>
            {hasSaving ? `月 -${yen(cash_saving_per_month)}` : "節約なし"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {hasSaving ? `年間 -${yen(annual_saving)}` : "条件次第で割高になる可能性"}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-zinc-500">データ</p>
          <p className="mt-1 text-lg font-semibold text-zinc-950">
            {recommended_tier?.label ?? (plan.data.monthly_gb === "unlimited" ? "無制限" : `${plan.data.monthly_gb}GB`)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            低速時 {plan.data.throttle_speed_kbps >= 1000
              ? `${plan.data.throttle_speed_kbps / 1000}Mbps`
              : `${plan.data.throttle_speed_kbps}kbps`}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-zinc-500">サポート</p>
          <p className="mt-1 text-lg font-semibold text-zinc-950">
            {STORE_LABEL[plan.constraints.store_support]}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{plan.constraints.esim_available ? "eSIM対応" : "eSIM要確認"}</p>
        </div>
      </div>

      {(totalDiscount > 0 || pointGain > 0 || breakeven_months > 0) && (
        <div className="border-t border-zinc-100 px-5 py-4">
          <div className="space-y-2 text-sm leading-6">
            {totalDiscount > 0 && (
              <p className="flex gap-2 text-zinc-700">
                <ReceiptText className="mt-1 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                割引適用後の月額です。割引合計は月 {yen(totalDiscount)}。
              </p>
            )}
            {pointGain > 0 && (
              <p className="flex gap-2 text-amber-800">
                <BadgeCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                ポイント込み実質は月 -{yen(effective_saving_per_month)}。条件:{" "}
                {plan.point_economy?.condition ?? "ポイント付与条件を要確認"}
              </p>
            )}
            {breakeven_months > 0 && (
              <p className="flex gap-2 text-zinc-700">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                端末残債が残り{breakeven_months}ヶ月あります。完済後の再診断も推奨です。
              </p>
            )}
          </div>
        </div>
      )}

      {showDetail && (
        <div className="border-t border-zinc-100">
          <div className="grid divide-y divide-zinc-100 md:grid-cols-2 md:divide-x md:divide-y-0">
            <section className="px-5 py-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                合う理由
              </h4>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
                {fit_reasons.slice(0, 3).map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="px-5 py-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
                注意点
              </h4>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
                {caveats.length > 0 ? (
                  caveats.slice(0, 2).map((caveat) => (
                    <li key={caveat} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                      <span>{caveat}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                    <span>大きな注意点は出ていません。申込前に公式条件だけ確認してください。</span>
                  </li>
                )}
              </ul>
            </section>
          </div>

          <div className="grid divide-y divide-zinc-100 border-t border-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-2 px-5 py-3 text-sm text-zinc-600">
              <Database className="h-4 w-4 shrink-0" aria-hidden="true" />
              {plan.data.monthly_gb === "unlimited" ? "無制限" : `${plan.data.monthly_gb}GB`}
            </div>
            <div className="flex items-center gap-2 px-5 py-3 text-sm text-zinc-600">
              <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
              {plan.data.throttle_speed_kbps >= 1000
                ? `${plan.data.throttle_speed_kbps / 1000}Mbps`
                : `${plan.data.throttle_speed_kbps}kbps`}
            </div>
            <div className="flex items-center gap-2 px-5 py-3 text-sm text-zinc-600">
              <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
              {STORE_LABEL[plan.constraints.store_support]}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-stone-50 px-5 py-3">
        <p className="text-xs text-zinc-500">データ更新日: {formatDate(plan.evidence.fetched_at)}</p>
        <a
          href={plan.evidence.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 underline-offset-4 hover:underline"
        >
          公式ページ
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
