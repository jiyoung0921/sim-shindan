"use client";

import { useState } from "react";
import { Send } from "iconoir-react";

interface FeedbackWidgetProps {
  sessionId: string;
}

const LABELS: Record<number, string> = {
  1: "参考にならなかった",
  2: "少し足りない",
  3: "ふつう",
  4: "参考になった",
  5: "かなり参考になった",
};

export default function FeedbackWidget({ sessionId }: FeedbackWidgetProps) {
  const [rating, setRating] = useState<number | null>(null);
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
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
        <p className="text-sm font-semibold text-zinc-950">送信しました</p>
        <p className="mt-1 text-sm text-zinc-600">診断精度の改善に使います。</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">この判定は参考になりましたか？</h3>
          <p className="mt-1 text-xs text-zinc-500">5段階で送れます。コメントは任意です。</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => setRating(score)}
            className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${
              rating === score
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
            }`}
            aria-label={`${score}点: ${LABELS[score]}`}
          >
            {score}
          </button>
        ))}
      </div>

      {rating && <p className="mt-2 text-center text-xs text-zinc-500">{LABELS[rating]}</p>}

      {rating && (
        <div className="mt-4">
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="気になった点があれば入力"
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-zinc-950"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {loading ? "送信中" : "送信する"}
          </button>
        </div>
      )}
    </div>
  );
}
