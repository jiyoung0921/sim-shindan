"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DiagnosisAnswers, DiagnosisResult, PlanRecord } from "@/lib/types";
import { runDiagnosis } from "@/lib/scoring";
import PlanCard from "@/components/PlanCard";
import FeedbackWidget from "@/components/FeedbackWidget";
import ShareButton from "@/components/ShareButton";

// ─── 判定ごとのビジュアル設定 ───

const VERDICT_CONFIG = {
  switch_now: {
    label: "今すぐ変えるべき",
    emoji: "🚀",
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    description: "乗り換えの障壁が低く、節約効果が大きいです。今すぐ動くのがおすすめです。",
  },
  switch_next_cycle: {
    label: "次のタイミングで変えよう",
    emoji: "📅",
    color: "bg-amber-500",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    description: "節約余地はありますが、端末残債や家族割の兼ね合いで、少し待った方がよいタイミングです。",
  },
  keep_current: {
    label: "今は変えない方がよい",
    emoji: "🛡️",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    description: "現状の条件を考えると、乗り換えのコスト・リスクが節約額を上回る可能性があります。",
  },
};

const ACTION_LABEL: Record<number, string> = {
  1: "現状維持",
  2: "同一キャリア内でのプラン変更",
  3: "オンライン専用・サブブランドへの移行",
  4: "格安SIM（MVNO）への移行",
};

function generateSessionId(): string {
  return "xxxx-xxxx-xxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── スコアバー ───

function ScoreBar({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const display = inverted ? 1 - value : value;
  const pct = Math.round(display * 100);
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span>{pct}点</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── メインコンポーネント ───

export default function ResultPage() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [answers, setAnswers] = useState<DiagnosisAnswers | null>(null);
  const [sessionId] = useState(generateSessionId);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const raw = localStorage.getItem("sim_shindan_answers");
        if (!raw) {
          setError("診断データが見つかりません。最初から診断してください。");
          return;
        }
        const savedAnswers: DiagnosisAnswers = JSON.parse(raw);
        setAnswers(savedAnswers);

        const res = await fetch("/data/plans.json");
        const plans: PlanRecord[] = await res.json();

        const diagnosisResult = runDiagnosis(plans, savedAnswers);
        setResult(diagnosisResult);

        // セッションを非同期で保存（失敗してもUIに影響しない）
        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_token: sessionId,
            answers: savedAnswers,
            result: diagnosisResult,
          }),
        }).catch(() => {/* Supabase 未設定時はサイレントに無視 */});

      } catch (e) {
        console.error(e);
        setError("診断中にエラーが発生しました。");
      }
    };
    run();
  }, [sessionId]);

  // ─── ローディング ───
  if (!result && !error) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-slate-600 font-medium">診断中…</p>
        </div>
      </main>
    );
  }

  // ─── エラー ───
  if (error || !result || !answers) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-5">
          <p className="text-2xl mb-4">😥</p>
          <p className="text-slate-700 font-medium mb-6">{error}</p>
          <Link
            href="/diagnosis"
            className="inline-block px-8 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            診断をやり直す
          </Link>
        </div>
      </main>
    );
  }

  const verdictCfg = VERDICT_CONFIG[result.verdict];
  const best = result.recommendations[0];
  const hasSaving = best?.cash_saving_per_month > 0;

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {/* ナビ */}
      <nav className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="text-blue-600 text-sm hover:underline">
          ← トップへ
        </Link>
        <span className="font-bold text-slate-700 text-sm">診断結果</span>
        <Link href="/diagnosis" className="text-xs text-slate-400 hover:text-slate-600">
          再診断
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-5 space-y-6">

        {/* ─── 1. タイプ名 ─── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
          <p className="text-xs text-slate-400 mb-2">あなたのタイプ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            {result.persona_label}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            {result.persona_description}
          </p>
        </div>

        {/* ─── 2. 判定バナー ─── */}
        <div className={`rounded-3xl border-2 ${verdictCfg.borderColor} ${verdictCfg.bgColor} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{verdictCfg.emoji}</span>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">判定結果</p>
              <h3 className={`text-2xl font-extrabold ${verdictCfg.textColor}`}>
                {verdictCfg.label}
              </h3>
            </div>
          </div>

          {/* 推奨アクション */}
          <div className="mb-4">
            <span className="text-xs font-semibold text-slate-500 mr-2">推奨アクション：</span>
            <span className={`text-sm font-bold ${verdictCfg.textColor}`}>
              {ACTION_LABEL[result.recommended_action]}
            </span>
          </div>

          {/* 判定理由 */}
          <div className="bg-white bg-opacity-70 rounded-2xl p-4 border border-white">
            <p className="text-sm text-slate-700 leading-relaxed">{result.verdict_reason}</p>
          </div>

          {/* 節約サマリー（節約がある場合） */}
          {hasSaving && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white bg-opacity-70 rounded-2xl p-3 text-center border border-white">
                <p className="text-xs text-slate-500 mb-0.5">月間節約（現金）</p>
                <p className={`text-xl font-extrabold ${verdictCfg.textColor}`}>
                  −¥{best.cash_saving_per_month.toLocaleString()}
                </p>
              </div>
              <div className="bg-white bg-opacity-70 rounded-2xl p-3 text-center border border-white">
                <p className="text-xs text-slate-500 mb-0.5">年間節約</p>
                <p className={`text-xl font-extrabold ${verdictCfg.textColor}`}>
                  −¥{best.annual_saving.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. 推奨プランカード ─── */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">あなたへのおすすめプラン</h3>

          {/* 1位は全詳細表示 */}
          {result.recommendations[0] && (
            <div className="mb-4">
              <PlanCard recommendation={result.recommendations[0]} showDetail={true} />
            </div>
          )}

          {/* 2・3位 */}
          {result.recommendations.length > 1 && (
            <div>
              <button
                onClick={() => setShowAllDetails(!showAllDetails)}
                className="w-full text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center justify-center gap-1"
              >
                {showAllDetails ? "▲ 2・3位を折りたたむ" : "▼ 2・3位も見る"}
              </button>

              {showAllDetails && (
                <div className="space-y-4">
                  {result.recommendations.slice(1).map((rec) => (
                    <PlanCard key={rec.plan.id} recommendation={rec} showDetail={false} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── 4. 判定根拠の詳細（アコーディオン） ─── */}
        <details className="bg-white rounded-2xl border border-slate-200 shadow-sm group">
          <summary className="px-5 py-4 text-sm font-semibold text-slate-700 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-2xl">
            <span>📊 判定の根拠・スコア内訳を見る</span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
            {result.recommendations[0] && (
              <>
                <p className="text-xs text-slate-500 mb-3">
                  1位プラン「{result.recommendations[0].plan.plan_name}」のスコア内訳（0〜100点）
                </p>
                <div className="space-y-3">
                  <ScoreBar label="節約余地" value={result.recommendations[0].axis_scores.savings} />
                  <ScoreBar label="使い方の適合度" value={result.recommendations[0].axis_scores.fit} />
                  <ScoreBar label="乗り換えのしやすさ" value={result.recommendations[0].axis_scores.friction} inverted />
                  <ScoreBar label="プランの安定性" value={result.recommendations[0].axis_scores.stability} />
                  <ScoreBar label="ポイント経済圏の相性" value={result.recommendations[0].axis_scores.ecosystem} />
                  <ScoreBar label="あなたの好みとの一致" value={result.recommendations[0].axis_scores.psychology} />
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed">
                  <p className="font-semibold mb-1">計算の前提条件</p>
                  <ul className="space-y-0.5">
                    <li>現在の月額：¥{answers.current_monthly_fee_yen.toLocaleString()}</li>
                    <li>データ使用量：{answers.data_usage_gb === "unknown" ? "不明（10GBと仮定）" : `${answers.data_usage_gb}GB`}</li>
                    <li>通話頻度：{{"none": "なし", "few_monthly": "月数回", "few_weekly": "週数回", "daily": "毎日"}[answers.call_frequency]}</li>
                    <li>家族回線：{answers.family_lines_count === 0 ? "なし" : `${answers.family_lines_count}回線（${answers.family_all_switching ? "全員で変える予定" : "自分のみ変更"}）`}</li>
                    <li>端末残債：{answers.device_installment_remaining_months === 0 ? "完済" : `残${answers.device_installment_remaining_months}ヶ月`}</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </details>

        {/* ─── 5. 乗り換え注意事項 ─── */}
        {result.verdict !== "keep_current" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h4 className="text-sm font-bold text-slate-800 mb-4">乗り換え前に確認すること</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 shrink-0 mt-0.5">①</span>
                <span><strong>MNP予約番号</strong>を現在のキャリアから取得する（オンライン・電話で即日発行）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 shrink-0 mt-0.5">②</span>
                <span><strong>eSIM対応</strong>か確認する。非対応端末はSIMカードの交換が必要</span>
              </li>
              {answers.family_lines_count > 0 && !answers.family_all_switching && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 shrink-0 mt-0.5">③</span>
                  <span><strong>家族割の解除影響</strong>を現キャリアに確認する。家族の請求額が変わる可能性あり</span>
                </li>
              )}
              {answers.device_installment_remaining_months > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                  <span><strong>端末の残債（残{answers.device_installment_remaining_months}ヶ月）</strong>は乗り換え後も現キャリアへの支払いが続く</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-blue-500 shrink-0 mt-0.5">④</span>
                <span><strong>キャリアメール</strong>（@docomo.ne.jpなど）が使えなくなる場合あり。Gmailなどへの移行を先に済ませる</span>
              </li>
            </ul>
          </div>
        )}

        {/* ─── 6. シェアボタン ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
          <h4 className="text-sm font-bold text-slate-800 mb-4">診断結果をシェア</h4>
          <ShareButton result={result} />
        </div>

        {/* ─── 7. フィードバック ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <FeedbackWidget sessionId={sessionId} />
        </div>

        {/* ─── データの透明性 ─── */}
        <div className="text-center text-xs text-slate-400 space-y-1 pb-4">
          <p>
            料金データ取得日：{formatDate(result.plan_data_freshness)}
          </p>
          <p>
            診断生成日時：{new Date(result.generated_at).toLocaleString("ja-JP")}
          </p>
          <p>
            ※本診断は情報提供目的です。最終確認は各社公式ページでお願いします。
          </p>
        </div>

        {/* 再診断CTA */}
        <div className="text-center">
          <Link
            href="/diagnosis"
            className="inline-block px-8 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold hover:border-slate-300 hover:bg-white transition-colors text-sm"
          >
            条件を変えて再診断する
          </Link>
        </div>
      </div>
    </main>
  );
}
