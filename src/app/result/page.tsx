"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { DiagnosisAnswers, DiagnosisResult, PlanRecord } from "@/lib/types";
import { runDiagnosis } from "@/lib/scoring";
import PlanCard from "@/components/PlanCard";
import FeedbackWidget from "@/components/FeedbackWidget";
import ShareButton from "@/components/ShareButton";

const VERDICT_CONFIG = {
  switch_now: {
    label: "今すぐ変えるべき",
    title: "節約余地が大きく、乗り換え摩擦も低めです。",
    badge: "bg-emerald-100 text-emerald-800",
    border: "border-emerald-200",
    accent: "text-emerald-700",
    icon: CheckCircle2,
  },
  switch_next_cycle: {
    label: "次のタイミングで変えるべき",
    title: "節約余地はありますが、待つ理由があります。",
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-200",
    accent: "text-amber-800",
    icon: Clock3,
  },
  keep_current: {
    label: "今は変えない方がよい",
    title: "節約額より、失う条件や手続き負担が大きい可能性があります。",
    badge: "bg-zinc-100 text-zinc-800",
    border: "border-zinc-200",
    accent: "text-zinc-800",
    icon: ShieldCheck,
  },
};

const ACTION_LABEL: Record<number, string> = {
  1: "現状維持",
  2: "同一キャリア内でのプラン変更",
  3: "オンライン専用・サブブランドへ移行",
  4: "MVNOへ移行",
};

function generateSessionId(): string {
  return "xxxx-xxxx-xxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function yen(value: number) {
  return `¥${value.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function ScoreBar({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const display = inverted ? 1 - value : value;
  const pct = Math.round(display * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs text-zinc-500">
        <span>{label}</span>
        <span>{pct}点</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-950" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ResultPage() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [answers, setAnswers] = useState<DiagnosisAnswers | null>(null);
  const [sessionId] = useState(generateSessionId);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const raw = localStorage.getItem("sim_shindan_answers");
        if (!raw) {
          setError("診断データが見つかりません。もう一度診断してください。");
          return;
        }

        const savedAnswers: DiagnosisAnswers = JSON.parse(raw);
        setAnswers(savedAnswers);

        const res = await fetch("/data/plans.json");
        const plans: PlanRecord[] = await res.json();
        const diagnosisResult = runDiagnosis(plans, savedAnswers);
        setResult(diagnosisResult);

        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_token: sessionId,
            answers: savedAnswers,
            result: diagnosisResult,
          }),
        }).catch(() => {
          // Supabase 未設定時でも診断体験は継続する。
        });
      } catch (e) {
        console.error(e);
        setError("診断中にエラーが発生しました。");
      }
    };
    run();
  }, [sessionId]);

  if (!result && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-zinc-950">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <Activity className="mx-auto h-6 w-6 animate-pulse text-zinc-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-zinc-700">診断しています</p>
        </div>
      </main>
    );
  }

  if (error || !result || !answers) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-zinc-950">
        <div className="max-w-sm rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-zinc-950">{error}</p>
          <Link
            href="/diagnosis"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            診断をやり直す
          </Link>
        </div>
      </main>
    );
  }

  const verdictCfg = VERDICT_CONFIG[result.verdict];
  const VerdictIcon = verdictCfg.icon;
  const best = result.recommendations[0];
  const hasSaving = best?.cash_saving_per_month > 0;

  return (
    <main className="min-h-screen bg-stone-50 pb-12 text-zinc-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          トップ
        </Link>
        <span className="text-sm font-semibold text-zinc-950">診断結果</span>
        <Link
          href="/diagnosis"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          再診断
        </Link>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <section className={`rounded-lg border ${verdictCfg.border} bg-white p-5 shadow-sm sm:p-6`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold ${verdictCfg.badge}`}>
                  <VerdictIcon className="h-4 w-4" aria-hidden="true" />
                  {verdictCfg.label}
                </span>
                <h1 className="mt-4 text-2xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
                  {verdictCfg.title}
                </h1>
                <p className="mt-3 text-sm leading-7 text-zinc-700">{result.verdict_reason}</p>
              </div>

              {best && (
                <div className="shrink-0 border-t border-zinc-200 pt-4 sm:w-56 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <p className="text-xs text-zinc-500">現金支出ベース</p>
                  <p className={`mt-1 text-2xl font-semibold ${hasSaving ? "text-emerald-700" : "text-zinc-950"}`}>
                    {hasSaving ? `月 -${yen(best.cash_saving_per_month)}` : "節約なし"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {hasSaving ? `年間 -${yen(best.annual_saving)}` : "条件によって割高になる可能性"}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-medium text-zinc-500">あなたのタイプ</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950">{result.persona_label}</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-700">{result.persona_description}</p>
          </section>

          {best && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-950">最有力プラン</h2>
                <span className="text-xs text-zinc-500">編集スコア順。PRとは分離。</span>
              </div>
              <PlanCard recommendation={best} showDetail />
            </section>
          )}

          {result.recommendations.length > 1 && (
            <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setShowAlternatives((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-50"
              >
                2・3位の候補
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform ${showAlternatives ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {showAlternatives && (
                <div className="space-y-4 border-t border-zinc-100 p-4">
                  {result.recommendations.slice(1).map((recommendation) => (
                    <PlanCard key={recommendation.plan.id} recommendation={recommendation} />
                  ))}
                </div>
              )}
            </section>
          )}

          <details className="group rounded-lg border border-zinc-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-50">
              <span className="inline-flex items-center gap-2">
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                判定の根拠
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-zinc-100 px-5 py-4">
              {best && (
                <>
                  <p className="text-sm leading-6 text-zinc-600">
                    1位プラン「{best.plan.plan_name}」のスコア内訳です。金額、適合、摩擦を分けて判定しています。
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ScoreBar label="節約余地" value={best.axis_scores.savings} />
                    <ScoreBar label="使い方の適合" value={best.axis_scores.fit} />
                    <ScoreBar label="乗り換えやすさ" value={best.axis_scores.friction} inverted />
                    <ScoreBar label="継続安定性" value={best.axis_scores.stability} />
                    <ScoreBar label="ポイント相性" value={best.axis_scores.ecosystem} />
                    <ScoreBar label="手続き/心理面" value={best.axis_scores.psychology} />
                  </div>
                  <dl className="mt-5 grid gap-3 rounded-lg bg-stone-50 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-zinc-500">現在の月額</dt>
                      <dd className="mt-1 font-medium text-zinc-950">{yen(answers.current_monthly_fee_yen)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">データ使用量</dt>
                      <dd className="mt-1 font-medium text-zinc-950">
                        {answers.data_usage_gb === "unknown" ? "不明（10GB前後で仮定）" : `${answers.data_usage_gb}GB`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">家族回線</dt>
                      <dd className="mt-1 font-medium text-zinc-950">
                        {answers.family_lines_count === 0
                          ? "なし"
                          : `${answers.family_lines_count + 1}回線 / ${
                              answers.family_all_switching ? "家族も変更予定" : "自分のみ変更"
                            }`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">端末残債</dt>
                      <dd className="mt-1 font-medium text-zinc-950">
                        {answers.device_installment_remaining_months === 0
                          ? "完済"
                          : `残${answers.device_installment_remaining_months}ヶ月`}
                      </dd>
                    </div>
                  </dl>
                </>
              )}
            </div>
          </details>

          {result.verdict !== "keep_current" && (
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                乗り換え前に確認
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-700">
                <li>MNPワンストップ対応なら、予約番号なしで申し込める場合があります。</li>
                <li>eSIM対応端末か、SIMカード交換が必要かを確認してください。</li>
                {answers.family_lines_count > 0 && !answers.family_all_switching && (
                  <li>自分だけ変える場合、家族割解除で家族側の請求が上がる可能性があります。</li>
                )}
                {answers.device_installment_remaining_months > 0 && (
                  <li>端末残債は乗り換え後も現在のキャリアへ支払い続けます。</li>
                )}
                <li>キャリアメールを使っている場合は、Gmailなどへの移行を先に済ませてください。</li>
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:h-fit">
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-zinc-950">次にすること</p>
            <p className={`mt-3 text-lg font-semibold leading-7 ${verdictCfg.accent}`}>
              {ACTION_LABEL[result.recommended_action]}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {best
                ? `${best.plan.plan_name}を基準に、公式ページで料金条件を確認してください。`
                : "条件を変えて再診断してください。"}
            </p>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-zinc-950">共有</p>
            <div className="mt-4">
              <ShareButton result={result} />
            </div>
          </section>

          <FeedbackWidget sessionId={sessionId} />

          <section className="rounded-lg border border-zinc-200 bg-white p-5 text-xs leading-6 text-zinc-500 shadow-sm">
            <p>料金データ取得日: {formatDate(result.plan_data_freshness)}</p>
            <p>診断生成: {new Date(result.generated_at).toLocaleString("ja-JP")}</p>
            <p className="mt-2">本診断は情報提供目的です。最終的な料金は各社公式ページで確認してください。</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
