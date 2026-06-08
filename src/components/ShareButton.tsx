"use client";

import { DiagnosisResult } from "@/lib/types";

interface ShareButtonProps {
  result: DiagnosisResult;
}

const VERDICT_TEXT: Record<string, string> = {
  switch_now: "今すぐ変えるべき",
  switch_next_cycle: "次のタイミングで変えよう",
  keep_current: "今は変えない方がよい",
};

export default function ShareButton({ result }: ShareButtonProps) {
  const best = result.recommendations[0];
  const saving = best?.cash_saving_per_month ?? 0;
  const annualSaving = best?.annual_saving ?? 0;

  const shareText = [
    `【スマホ料金診断】`,
    `タイプ：${result.persona_label}`,
    `判定：${VERDICT_TEXT[result.verdict]}`,
    saving > 0
      ? `節約余地：月${saving.toLocaleString()}円（年間${annualSaving.toLocaleString()}円）`
      : "",
    ``,
    `あなたも診断してみよう👇`,
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
        // キャンセルなど、無視
      }
    }

    // フォールバック: テキストコピー
    try {
      await navigator.clipboard.writeText(shareText);
      alert("結果をクリップボードにコピーしました！");
    } catch {
      // 古いブラウザ向け
      const el = document.createElement("textarea");
      el.value = shareText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      alert("結果をクリップボードにコピーしました！");
    }
  };

  const handleTwitterShare = () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const twitterText = encodeURIComponent(
      `【スマホ料金診断】私は「${result.persona_label}」タイプ。判定：${VERDICT_TEXT[result.verdict]}。${saving > 0 ? `年間${annualSaving.toLocaleString()}円の節約余地あり！` : ""} #スマホ料金診断`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      <button
        onClick={handleTwitterShare}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Xでシェア
      </button>
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        結果をシェア
      </button>
    </div>
  );
}
