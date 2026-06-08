"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DiagnosisAnswers, PointEcosystemType } from "@/lib/types";

const INITIAL_ANSWERS: DiagnosisAnswers = {
  current_carrier: "",
  current_monthly_fee_yen: 8000,
  data_usage_gb: "unknown",
  call_frequency: "few_monthly",
  family_lines_count: 0,
  family_all_switching: false,
  device_installment_remaining_months: 0,
  store_support_priority: 2,
  quality_sensitivity: 2,
  point_ecosystems: [],
  migration_tolerance: "support_needed",
};

const CARRIERS = [
  { id: "docomo", label: "ドコモ", color: "bg-red-50 border-red-200 text-red-700" },
  { id: "au", label: "au", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { id: "softbank", label: "ソフトバンク", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { id: "rakuten", label: "楽天モバイル", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { id: "ymobile", label: "Y!mobile", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "uqmobile", label: "UQ mobile", color: "bg-green-50 border-green-200 text-green-700" },
  { id: "ahamo", label: "ahamo", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "povo", label: "povo", color: "bg-teal-50 border-teal-200 text-teal-700" },
  { id: "other", label: "その他/格安SIM", color: "bg-slate-50 border-slate-200 text-slate-700" },
];

const POINT_OPTIONS: { id: PointEcosystemType; label: string; icon: string }[] = [
  { id: "d_point", label: "dポイント", icon: "🔴" },
  { id: "au_point", label: "Pontaポイント", icon: "🟠" },
  { id: "paypay", label: "PayPayポイント", icon: "🟡" },
  { id: "rakuten", label: "楽天ポイント", icon: "🔴" },
  { id: "none", label: "特になし", icon: "✖️" },
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>Q{step}/{total}</span>
        <span>{pct}%完了</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SelectButton({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 font-medium transition-all text-sm ${
        selected
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SliderInput({
  value,
  min,
  max,
  step,
  labels,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  labels: string[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-2">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export default function DiagnosisFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<DiagnosisAnswers>(INITIAL_ANSWERS);
  const [isAnimating, setIsAnimating] = useState(false);

  const totalSteps = answers.family_lines_count > 0 ? 10 : 9;

  const goNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsAnimating(false);
    }, 180);
  };

  const goPrev = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const update = <K extends keyof DiagnosisAnswers>(key: K, value: DiagnosisAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sim_shindan_answers", JSON.stringify(answers));
    }
    router.push("/result");
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return answers.current_carrier !== "";
      case 2: return answers.current_monthly_fee_yen >= 0;
      default: return true;
    }
  };

  const renderStep = () => {
    // ステップ番号を family_lines_count の有無でずらす
    const effectiveStep = step;

    switch (effectiveStep) {
      // Q1: 現在のキャリア
      case 1:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">今使っているキャリアは？</h2>
            <p className="text-sm text-slate-500 mb-6">メインで使っているものを選んでください。</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CARRIERS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => update("current_carrier", c.id)}
                  className={`px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    answers.current_carrier === c.id
                      ? `${c.color} border-current`
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        );

      // Q2: 月額料金
      case 2:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">毎月の請求額は大体いくら？</h2>
            <p className="text-sm text-slate-500 mb-8">端末の分割代を含まない、通信費のみの金額で構いません。</p>
            <div className="text-center mb-8">
              <span className="text-5xl font-extrabold text-slate-900">
                ¥{answers.current_monthly_fee_yen.toLocaleString()}
              </span>
              <span className="text-slate-400 text-lg ml-1">/月</span>
            </div>
            <SliderInput
              value={answers.current_monthly_fee_yen}
              min={1000}
              max={20000}
              step={500}
              labels={["¥1,000", "¥5,000", "¥10,000", "¥15,000", "¥20,000"]}
              onChange={(v) => update("current_monthly_fee_yen", v)}
            />
          </div>
        );

      // Q3: データ使用量
      case 3:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">月に使うデータ量は？</h2>
            <p className="text-sm text-slate-500 mb-6">設定 → モバイル通信 → 通信量で確認できます。</p>
            <div className="space-y-3">
              {[
                { value: 3, label: "3GB未満", sub: "主にWi-Fi使用・LINEや調べものくらい" },
                { value: 7, label: "3〜10GB", sub: "動画をたまに見る・外出先でよく使う" },
                { value: 20, label: "10〜30GB", sub: "動画をよく見る・テザリングも使う" },
                { value: 50, label: "30GB以上", sub: "ヘビーユーザー・ほぼ使い放題" },
                { value: "unknown" as const, label: "わからない", sub: "確認していない" },
              ].map((opt) => (
                <SelectButton
                  key={String(opt.value)}
                  selected={answers.data_usage_gb === opt.value}
                  onClick={() => update("data_usage_gb", opt.value)}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-slate-400 text-xs ml-2">{opt.sub}</span>
                </SelectButton>
              ))}
            </div>
          </div>
        );

      // Q4: 通話頻度
      case 4:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">電話をかける頻度は？</h2>
            <p className="text-sm text-slate-500 mb-6">LINEやZoomは除く、通常の電話（050/080など）で考えてください。</p>
            <div className="space-y-3">
              {[
                { value: "none", label: "ほとんどしない", sub: "月に1〜2回以下" },
                { value: "few_monthly", label: "月数回", sub: "仕事や予約など必要なときだけ" },
                { value: "few_weekly", label: "週数回", sub: "定期的にかける" },
                { value: "daily", label: "ほぼ毎日", sub: "仕事や家族との連絡など頻繁" },
              ].map((opt) => (
                <SelectButton
                  key={opt.value}
                  selected={answers.call_frequency === opt.value}
                  onClick={() => update("call_frequency", opt.value as DiagnosisAnswers["call_frequency"])}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-slate-400 text-xs ml-2">{opt.sub}</span>
                </SelectButton>
              ))}
            </div>
          </div>
        );

      // Q5: 家族割
      case 5:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">家族と同じキャリアで契約している？</h2>
            <p className="text-sm text-slate-500 mb-6">家族割の適用状況を確認するための質問です。</p>
            <div className="space-y-3">
              {[
                { count: 0, label: "いない / 家族割なし", sub: "1人で契約" },
                { count: 1, label: "家族1人と同じキャリア", sub: "2回線で家族割" },
                { count: 2, label: "家族2人と同じキャリア", sub: "3回線で家族割" },
                { count: 3, label: "家族3人以上と同じキャリア", sub: "4回線以上で家族割" },
              ].map((opt) => (
                <SelectButton
                  key={opt.count}
                  selected={answers.family_lines_count === opt.count}
                  onClick={() => update("family_lines_count", opt.count)}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-slate-400 text-xs ml-2">{opt.sub}</span>
                </SelectButton>
              ))}
            </div>
          </div>
        );

      // Q5a: 家族全員で変える？（家族ありの場合のみ）
      case 6:
        if (answers.family_lines_count > 0) {
          return (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">家族全員で一緒に乗り換える予定？</h2>
              <p className="text-sm text-slate-500 mb-6">家族割が崩れるかどうかの判定に使います。</p>
              <div className="space-y-3">
                {[
                  { value: true, label: "全員で変える予定", sub: "家族みんなで新しいキャリアへ" },
                  { value: false, label: "自分だけ変えたい", sub: "家族は今のキャリアのまま" },
                ].map((opt) => (
                  <SelectButton
                    key={String(opt.value)}
                    selected={answers.family_all_switching === opt.value}
                    onClick={() => update("family_all_switching", opt.value)}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className="text-slate-400 text-xs ml-2">{opt.sub}</span>
                  </SelectButton>
                ))}
              </div>
            </div>
          );
        }
        // 家族なしの場合はスキップして次に
        return renderInstallmentStep();

      // 端末残債ステップ
      case 7:
        return renderInstallmentStep();

      // Q7: 店舗サポート重要度
      case 8:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">店舗でのサポートはどれくらい重要？</h2>
            <p className="text-sm text-slate-500 mb-8">故障・機種変更・手続き変更を店頭でしたいかどうかで選んでください。</p>
            <div className="mb-4 text-center">
              <span className="text-lg font-bold text-slate-800">
                {["", "どうでもよい", "できればあった方がいい", "重要", "必ず必要"][answers.store_support_priority]}
              </span>
            </div>
            <SliderInput
              value={answers.store_support_priority}
              min={1}
              max={4}
              step={1}
              labels={["どうでもよい", "↑", "↑", "必ず必要"]}
              onChange={(v) => update("store_support_priority", v as 1 | 2 | 3 | 4)}
            />
          </div>
        );

      // Q8: 通信品質
      case 9:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">通信速度・品質への不安は？</h2>
            <p className="text-sm text-slate-500 mb-8">格安SIMは大手より混雑時に遅くなりやすいです。</p>
            <div className="mb-4 text-center">
              <span className="text-lg font-bold text-slate-800">
                {["", "気にしない", "少し気になる", "かなり気になる", "大手と同水準でないと嫌"][answers.quality_sensitivity]}
              </span>
            </div>
            <SliderInput
              value={answers.quality_sensitivity}
              min={1}
              max={4}
              step={1}
              labels={["気にしない", "↑", "↑", "大手品質必須"]}
              onChange={(v) => update("quality_sensitivity", v as 1 | 2 | 3 | 4)}
            />
          </div>
        );

      // Q9: ポイント経済圏
      case 10: {
        const isLast = true;
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">よく使うポイントは？（複数可）</h2>
            <p className="text-sm text-slate-500 mb-6">キャリアとポイント経済圏の相性を判定します。</p>
            <div className="space-y-3">
              {POINT_OPTIONS.map((opt) => {
                const selected = answers.point_ecosystems.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (opt.id === "none") {
                        update("point_ecosystems", selected ? [] : ["none"]);
                      } else {
                        const without = answers.point_ecosystems.filter(
                          (p) => p !== "none" && p !== opt.id
                        );
                        update(
                          "point_ecosystems",
                          selected ? without : [...without, opt.id]
                        );
                      }
                    }}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 font-medium transition-all text-sm flex items-center gap-3 ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span>{opt.label}</span>
                    {selected && <span className="ml-auto text-blue-500 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
            {isLast && (
              <button
                onClick={handleFinish}
                className="mt-8 w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
              >
                診断結果を見る →
              </button>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  function renderInstallmentStep() {
    return (
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">今使っている端末の支払いは？</h2>
        <p className="text-sm text-slate-500 mb-6">分割払い中の場合、乗り換えても残債の支払いは続きます。</p>
        <div className="space-y-3">
          {[
            { months: 0, label: "完済済み / 一括購入", sub: "端末代の支払いは終わっている" },
            { months: 6, label: "残り半年程度", sub: "6ヶ月以内に完済予定" },
            { months: 12, label: "残り1年程度", sub: "6〜12ヶ月ほど残っている" },
            { months: 24, label: "残り1年以上", sub: "まだ12ヶ月以上ある" },
          ].map((opt) => (
            <SelectButton
              key={opt.months}
              selected={answers.device_installment_remaining_months === opt.months}
              onClick={() => update("device_installment_remaining_months", opt.months)}
            >
              <span className="font-semibold">{opt.label}</span>
              <span className="text-slate-400 text-xs ml-2">{opt.sub}</span>
            </SelectButton>
          ))}
        </div>
      </div>
    );
  }

  // 最後のステップ（ポイント）はボタンを非表示（内部ボタンで進む）
  const isLastStep = step === totalSteps;

  return (
    <div className={`transition-opacity duration-200 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
      <ProgressBar step={step} total={totalSteps} />

      {renderStep()}

      {/* ナビゲーション */}
      {!isLastStep && (
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={goPrev}
            disabled={step === 1}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600 disabled:invisible transition-colors"
          >
            ← 戻る
          </button>
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 active:scale-95 transition-all"
          >
            次へ →
          </button>
        </div>
      )}
      {step > 1 && isLastStep && (
        <div className="mt-4">
          <button onClick={goPrev} className="text-sm text-slate-400 hover:text-slate-600">
            ← 戻る
          </button>
        </div>
      )}
    </div>
  );
}
