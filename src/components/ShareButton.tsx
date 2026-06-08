"use client";

import { Copy, Share2 } from "lucide-react";
import { DiagnosisResult } from "@/lib/types";

interface ShareButtonProps {
  result: DiagnosisResult;
}

const VERDICT_TEXT: Record<string, string> = {
  switch_now: "今すぐ変えるべき",
  switch_next_cycle: "次のタイミングで変えるべき",
  keep_current: "今は変えない方がよい",
};

export default function ShareButton({ result }: ShareButtonProps) {
  const best = result.recommendations[0];
  const saving = best?.cash_saving_per_month ?? 0;
  const annualSaving = best?.annual_saving ?? 0;

  const shareText = [
    "スマホ料金診断",
    `タイプ: ${result.persona_label}`,
    `判定: ${VERDICT_TEXT[result.verdict]}`,
    saving > 0 ? `節約余地: 月${saving.toLocaleString()}円 / 年間${annualSaving.toLocaleString()}円` : "",
    typeof window !== "undefined" ? window.location.origin : "",
  ]
    .filter(Boolean)
    .join("\n");

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "スマホ料金診断の結果",
          text: shareText,
          url,
        });
        return;
      } catch {
        // User cancelled share sheet.
      }
    }

    await navigator.clipboard.writeText(shareText);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        共有する
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        コピー
      </button>
    </div>
  );
}
