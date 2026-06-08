"use client";

import { useState } from "react";

interface FeedbackWidgetProps {
  sessionId: string;
}

export default function FeedbackWidget({ sessionId }: FeedbackWidgetProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, rating, comment }),
      });
      setSubmitted(true);
    } catch {
      // MVP: エラーは無視してUIだけ更新
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <p className="text-2xl mb-2">🙏</p>
        <p className="text-slate-600 font-medium">フィードバックをありがとうございました！</p>
        <p className="text-sm text-slate-400 mt-1">診断の改善に活用させていただきます。</p>
      </div>
    );
  }

  const labels: Record<number, string> = {
    1: "全く参考にならなかった",
    2: "あまり参考にならなかった",
    3: "まあまあ参考になった",
    4: "参考になった",
    5: "とても参考になった！",
  };

  return (
    <div>
      <p className="text-sm font-medium text-slate-600 mb-4 text-center">
        この診断は参考になりましたか？
      </p>

      {/* スター評価 */}
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className={`text-3xl transition-transform hover:scale-110 ${
              (hovered ?? rating ?? 0) >= star ? "text-amber-400" : "text-slate-200"
            }`}
            aria-label={`${star}点`}
          >
            ★
          </button>
        ))}
      </div>

      {/* ラベル */}
      {(hovered || rating) && (
        <p className="text-center text-sm text-slate-500 mb-4">
          {labels[hovered ?? rating ?? 0]}
        </p>
      )}

      {/* コメント（任意） */}
      {rating && (
        <div className="mt-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ご意見があればお書きください（任意）"
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-3 w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "送信中…" : "送信する"}
          </button>
        </div>
      )}
    </div>
  );
}
