"use client";

import { useCallback, useEffect, useState } from "react";
import { AntennaSignal, OpenNewWindow, Refresh } from "iconoir-react";
import type { NewServiceSignalRow } from "@/lib/db";

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  new_carrier: "新規参入",
  price_cut: "値下げ",
  new_plan: "新プラン",
  mvno_launch: "MVNO参入",
  whois_new: "ドメイン取得",
  pr_times: "プレスリリース",
  rss_keyword: "RSSマッチ",
};

function isProcessed(signal: NewServiceSignalRow): boolean {
  return signal.status !== undefined && signal.status !== "unreviewed";
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
        <span className="block h-full rounded-full bg-zinc-950" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-zinc-500">{pct}%</span>
    </span>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<NewServiceSignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/signals");
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function dismiss(id: string) {
    setDismissing(id);
    try {
      await fetch("/api/admin/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "dismiss" }),
      });
      setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, status: "noise" } : s)));
    } finally {
      setDismissing(null);
    }
  }

  const visible = showDismissed ? signals : signals.filter((s) => !isProcessed(s));
  const dismissedCount = signals.filter(isProcessed).length;

  if (loading) {
    return <p className="py-16 text-center text-sm text-zinc-500">読み込んでいます</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">検知シグナル</h1>
        <div className="flex items-center gap-3">
          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDismissed((value) => !value)}
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950"
            >
              {showDismissed ? "処理済みを隠す" : `処理済み ${dismissedCount}件を表示`}
            </button>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <Refresh className="h-4 w-4" aria-hidden="true" />
            更新
          </button>
        </div>
      </div>

      <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600 shadow-sm">
        PR TIMES RSS と公開情報を監視し、新規キャリア参入・新プラン発表のシグナルを検知します。
        ここで内容を確認し、必要であれば手動でプランデータに追加してください。
      </p>

      {visible.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <AntennaSignal className="mx-auto h-6 w-6 text-zinc-400" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-zinc-700">検知シグナルはありません</p>
          <p className="mt-1 text-xs leading-6 text-zinc-500">スクレイパー実行後に表示されます。</p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((signal) => (
          <article
            key={signal.id}
            className={`rounded-lg border bg-white p-5 shadow-sm transition-opacity ${
              isProcessed(signal) ? "border-zinc-100 opacity-50" : "border-zinc-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {SIGNAL_TYPE_LABEL[signal.signal_type ?? ""] ?? signal.signal_type ?? "不明"}
                  </span>
                  <span className="text-xs text-zinc-400">{signal.source}</span>
                  {signal.negative_match && (
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-zinc-500">
                      除外キーワードあり
                    </span>
                  )}
                </div>

                <h2 className="mt-2 text-sm font-semibold leading-6 text-zinc-950">{signal.title}</h2>

                {signal.url && (
                  <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                  >
                    記事を確認
                    <OpenNewWindow className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}

                {signal.matched_keywords && signal.matched_keywords.length > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    キーワード: {signal.matched_keywords.join(" / ")}
                  </p>
                )}

                {signal.raw_content && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
                    {signal.raw_content}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {signal.confidence != null && (
                    <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                      信頼度
                      <ConfidenceBar value={signal.confidence} />
                    </span>
                  )}
                  <span className="text-xs text-zinc-400">
                    {new Date(signal.created_at).toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>

              {!isProcessed(signal) && (
                <button
                  type="button"
                  onClick={() => dismiss(signal.id)}
                  disabled={dismissing === signal.id}
                  className="inline-flex h-8 shrink-0 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                >
                  処理済みにする
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
