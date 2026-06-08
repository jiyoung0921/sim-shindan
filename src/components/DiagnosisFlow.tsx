"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Gauge,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import { DiagnosisAnswers, PointEcosystemType } from "@/lib/types";

type StepId =
  | "carrier"
  | "fee"
  | "data"
  | "call"
  | "family"
  | "familySwitch"
  | "installment"
  | "support"
  | "quality"
  | "points"
  | "migration";

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

const BASE_STEPS: StepId[] = [
  "carrier",
  "fee",
  "data",
  "call",
  "family",
  "installment",
  "support",
  "quality",
  "points",
  "migration",
];

const STEP_META: Record<StepId, { label: string; title: string; hint: string }> = {
  carrier: {
    label: "キャリア",
    title: "今使っている回線は？",
    hint: "メインで使っているスマホ回線を選んでください。",
  },
  fee: {
    label: "月額",
    title: "毎月の通信費はいくら？",
    hint: "端末代を除いた金額で十分です。わからなければ近い金額にしてください。",
  },
  data: {
    label: "データ",
    title: "月に使うデータ量は？",
    hint: "迷ったら「わからない」で進めて構いません。",
  },
  call: {
    label: "通話",
    title: "電話をかける頻度は？",
    hint: "LINEやZoomではなく、通常の電話で考えてください。",
  },
  family: {
    label: "家族割",
    title: "家族と同じキャリア？",
    hint: "家族割が崩れるかどうかを判定に入れます。",
  },
  familySwitch: {
    label: "家族割",
    title: "家族も一緒に変える？",
    hint: "自分だけ動く場合は、家族側の請求が変わる可能性があります。",
  },
  installment: {
    label: "残債",
    title: "端末の支払いは残っている？",
    hint: "乗り換えても端末残債の支払いは続きます。",
  },
  support: {
    label: "店舗",
    title: "店頭サポートは必要？",
    hint: "故障、機種変更、手続き変更を店で相談したいかで選んでください。",
  },
  quality: {
    label: "品質",
    title: "通信品質への不安は？",
    hint: "大手キャリア水準を重視するほど、MVNOの評価を慎重にします。",
  },
  points: {
    label: "ポイント",
    title: "よく使うポイントは？",
    hint: "ポイントは現金節約とは分けて、補助的に判定します。",
  },
  migration: {
    label: "手続き",
    title: "乗り換え手続きはできそう？",
    hint: "無理にオンライン専用プランへ寄せないための質問です。",
  },
};

const CARRIERS = [
  { id: "docomo", label: "ドコモ", sub: "docomo" },
  { id: "au", label: "au", sub: "KDDI" },
  { id: "softbank", label: "ソフトバンク", sub: "SoftBank" },
  { id: "rakuten", label: "楽天モバイル", sub: "Rakuten" },
  { id: "ymobile", label: "Y!mobile", sub: "サブブランド" },
  { id: "uqmobile", label: "UQ mobile", sub: "サブブランド" },
  { id: "ahamo", label: "ahamo", sub: "オンライン専用" },
  { id: "povo", label: "povo", sub: "オンライン専用" },
  { id: "other", label: "その他/格安SIM", sub: "MVNOなど" },
];

const POINT_OPTIONS: { id: PointEcosystemType; label: string }[] = [
  { id: "d_point", label: "dポイント" },
  { id: "au_point", label: "Ponta" },
  { id: "paypay", label: "PayPay" },
  { id: "rakuten", label: "楽天ポイント" },
  { id: "none", label: "特になし" },
];

const SUPPORT_LABELS = ["", "不要", "あれば安心", "重要", "必須"];
const QUALITY_LABELS = ["", "気にしない", "少し気になる", "かなり気になる", "大手水準が必要"];

function currency(value: number) {
  return `¥${value.toLocaleString()}`;
}

function ChoiceButton({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-16 w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-zinc-950 bg-white text-zinc-950 shadow-sm"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 text-transparent"
        }`}
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-zinc-500">{description}</span>}
      </span>
    </button>
  );
}

function RangeControl({
  value,
  min,
  max,
  step,
  label,
  minLabel,
  maxLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-5 rounded-lg border border-zinc-200 bg-white px-4 py-5 text-center">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-zinc-950">{currency(value)}</p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-zinc-950"
      />
      <div className="mt-2 flex justify-between text-xs text-zinc-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function FourPointScale({
  value,
  labels,
  onChange,
}: {
  value: 1 | 2 | 3 | 4;
  labels: string[];
  onChange: (value: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <div>
      <div className="mb-5 rounded-lg border border-zinc-200 bg-white px-4 py-5 text-center">
        <p className="text-sm text-zinc-500">選択中</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-950">{labels[value]}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((point) => (
          <button
            key={point}
            type="button"
            onClick={() => onChange(point as 1 | 2 | 3 | 4)}
            className={`h-12 rounded-lg border text-sm font-semibold transition-colors ${
              value === point
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
            }`}
          >
            {point}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-500">
        <span>{labels[1]}</span>
        <span>{labels[4]}</span>
      </div>
    </div>
  );
}

export default function DiagnosisFlow() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<DiagnosisAnswers>(INITIAL_ANSWERS);
  const [hydrated, setHydrated] = useState(false);

  const steps = useMemo<StepId[]>(() => {
    if (answers.family_lines_count > 0) {
      return [
        "carrier",
        "fee",
        "data",
        "call",
        "family",
        "familySwitch",
        "installment",
        "support",
        "quality",
        "points",
        "migration",
      ];
    }
    return BASE_STEPS;
  }, [answers.family_lines_count]);

  const activeStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[activeStepIndex];
  const meta = STEP_META[currentStep];
  const progress = Math.round(((activeStepIndex + 1) / steps.length) * 100);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const raw = window.localStorage.getItem("sim_shindan_answers_draft");
      if (raw) {
        try {
          setAnswers({ ...INITIAL_ANSWERS, ...JSON.parse(raw) });
        } catch {
          window.localStorage.removeItem("sim_shindan_answers_draft");
        }
      }
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("sim_shindan_answers_draft", JSON.stringify(answers));
  }, [answers, hydrated]);

  const update = <K extends keyof DiagnosisAnswers>(key: K, value: DiagnosisAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const goNext = () => {
    if (activeStepIndex >= steps.length - 1) {
      handleFinish();
      return;
    }
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const goPrev = () => setStepIndex(Math.max(0, activeStepIndex - 1));

  const reset = () => {
    setAnswers(INITIAL_ANSWERS);
    setStepIndex(0);
    window.localStorage.removeItem("sim_shindan_answers_draft");
    window.localStorage.removeItem("sim_shindan_answers");
  };

  const handleFinish = () => {
    window.localStorage.setItem("sim_shindan_answers", JSON.stringify(answers));
    window.localStorage.removeItem("sim_shindan_answers_draft");
    router.push("/result");
  };

  const canProceed = currentStep !== "carrier" || answers.current_carrier !== "";

  const renderStep = () => {
    switch (currentStep) {
      case "carrier":
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CARRIERS.map((carrier) => (
              <ChoiceButton
                key={carrier.id}
                selected={answers.current_carrier === carrier.id}
                onClick={() => update("current_carrier", carrier.id)}
                title={carrier.label}
                description={carrier.sub}
              />
            ))}
          </div>
        );

      case "fee":
        return (
          <RangeControl
            value={answers.current_monthly_fee_yen}
            min={1000}
            max={20000}
            step={500}
            label="現在の通信費"
            minLabel="¥1,000"
            maxLabel="¥20,000"
            onChange={(value) => update("current_monthly_fee_yen", value)}
          />
        );

      case "data":
        return (
          <div className="grid gap-3">
            {[
              { value: 3, title: "3GB未満", description: "Wi-Fi中心。LINE、検索、短い動画くらい" },
              { value: 7, title: "3〜10GB", description: "外でもよく使う。動画はたまに見る" },
              { value: 20, title: "10〜30GB", description: "動画、SNS、テザリングをよく使う" },
              { value: 50, title: "30GB以上", description: "ほぼ使い放題が必要" },
              { value: "unknown" as const, title: "わからない", description: "10GB前後として仮定します" },
            ].map((option) => (
              <ChoiceButton
                key={String(option.value)}
                selected={answers.data_usage_gb === option.value}
                onClick={() => update("data_usage_gb", option.value)}
                title={option.title}
                description={option.description}
              />
            ))}
          </div>
        );

      case "call":
        return (
          <div className="grid gap-3">
            {[
              { value: "none", title: "ほとんどしない", description: "月に1〜2回以下" },
              { value: "few_monthly", title: "月数回", description: "予約、仕事、家族連絡など必要な時だけ" },
              { value: "few_weekly", title: "週数回", description: "短い電話を定期的にかける" },
              { value: "daily", title: "ほぼ毎日", description: "かけ放題の有無を重く見ます" },
            ].map((option) => (
              <ChoiceButton
                key={option.value}
                selected={answers.call_frequency === option.value}
                onClick={() => update("call_frequency", option.value as DiagnosisAnswers["call_frequency"])}
                title={option.title}
                description={option.description}
              />
            ))}
          </div>
        );

      case "family":
        return (
          <div className="grid gap-3">
            {[
              { count: 0, title: "いない / 家族割なし", description: "自分の回線だけで見ます" },
              { count: 1, title: "家族1人と同じ", description: "合計2回線" },
              { count: 2, title: "家族2人と同じ", description: "合計3回線" },
              { count: 3, title: "家族3人以上と同じ", description: "合計4回線以上" },
            ].map((option) => (
              <ChoiceButton
                key={option.count}
                selected={answers.family_lines_count === option.count}
                onClick={() => update("family_lines_count", option.count)}
                title={option.title}
                description={option.description}
              />
            ))}
          </div>
        );

      case "familySwitch":
        return (
          <div className="grid gap-3">
            <ChoiceButton
              selected={answers.family_all_switching}
              onClick={() => update("family_all_switching", true)}
              title="家族も一緒に変える"
              description="家族割の崩れを小さく見ます"
            />
            <ChoiceButton
              selected={!answers.family_all_switching}
              onClick={() => update("family_all_switching", false)}
              title="自分だけ変えたい"
              description="家族の請求増リスクを判定に入れます"
            />
          </div>
        );

      case "installment":
        return (
          <div className="grid gap-3">
            {[
              { months: 0, title: "完済済み / 一括購入", description: "端末代の支払いは残っていない" },
              { months: 6, title: "残り半年くらい", description: "待つ選択肢も判定します" },
              { months: 12, title: "残り1年くらい", description: "次のタイミング判定になりやすい条件です" },
              { months: 24, title: "残り1年以上", description: "乗り換え摩擦を強めに見ます" },
            ].map((option) => (
              <ChoiceButton
                key={option.months}
                selected={answers.device_installment_remaining_months === option.months}
                onClick={() => update("device_installment_remaining_months", option.months)}
                title={option.title}
                description={option.description}
              />
            ))}
          </div>
        );

      case "support":
        return (
          <FourPointScale
            value={answers.store_support_priority}
            labels={SUPPORT_LABELS}
            onChange={(value) => update("store_support_priority", value)}
          />
        );

      case "quality":
        return (
          <FourPointScale
            value={answers.quality_sensitivity}
            labels={QUALITY_LABELS}
            onChange={(value) => update("quality_sensitivity", value)}
          />
        );

      case "points":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {POINT_OPTIONS.map((option) => {
              const selected = answers.point_ecosystems.includes(option.id);
              return (
                <ChoiceButton
                  key={option.id}
                  selected={selected}
                  onClick={() => {
                    if (option.id === "none") {
                      update("point_ecosystems", selected ? [] : ["none"]);
                      return;
                    }
                    const withoutCurrent = answers.point_ecosystems.filter(
                      (point) => point !== "none" && point !== option.id
                    );
                    update("point_ecosystems", selected ? withoutCurrent : [...withoutCurrent, option.id]);
                  }}
                  title={option.label}
                />
              );
            })}
          </div>
        );

      case "migration":
        return (
          <div className="grid gap-3">
            {[
              { value: "self", title: "自分でできる", description: "オンライン申込やeSIM設定も抵抗が少ない" },
              { value: "support_needed", title: "不安だけどできる", description: "手順がはっきりしていれば進められる" },
              { value: "impossible", title: "自分では難しい", description: "店舗サポートありの選択肢を重めに見ます" },
            ].map((option) => (
              <ChoiceButton
                key={option.value}
                selected={answers.migration_tolerance === option.value}
                onClick={() => update("migration_tolerance", option.value as DiagnosisAnswers["migration_tolerance"])}
                title={option.title}
                description={option.description}
              />
            ))}
          </div>
        );
    }
  };

  const summary = [
    {
      label: "現在",
      value: answers.current_carrier
        ? CARRIERS.find((carrier) => carrier.id === answers.current_carrier)?.label ?? answers.current_carrier
        : "未選択",
    },
    { label: "月額", value: currency(answers.current_monthly_fee_yen) },
    {
      label: "データ",
      value: answers.data_usage_gb === "unknown" ? "不明" : `${answers.data_usage_gb}GB`,
    },
    {
      label: "家族",
      value: answers.family_lines_count === 0 ? "なし" : `${answers.family_lines_count + 1}回線`,
    },
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {activeStepIndex + 1}/{steps.length} {meta.label}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold leading-tight text-zinc-950">{meta.title}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{meta.hint}</p>
          </div>

          {renderStep()}
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeStepIndex === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            戻る
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              リセット
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500"
            >
              {activeStepIndex === steps.length - 1 ? "結果を見る" : "次へ"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-5 lg:h-fit">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-zinc-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-zinc-950">いま見ている条件</p>
        </div>
        <dl className="mt-4 divide-y divide-zinc-100">
          {summary.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 py-3">
              <dt className="text-xs text-zinc-500">{item.label}</dt>
              <dd className="text-right text-sm font-medium text-zinc-950">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-lg bg-stone-50 p-3">
          <div className="flex gap-2">
            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <p className="text-xs leading-5 text-zinc-600">
              Q1〜Q3以外は近い答えで進めて構いません。判定では不確実な条件も明示します。
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 text-xs text-zinc-500">
          <ReceiptText className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>入力内容はブラウザ内に一時保存されます。</span>
        </div>
      </aside>
    </section>
  );
}
