"use client";

import { useEffect, useState } from "react";
import type { NewServiceSignalRow } from "@/lib/db";

const SIGNAL_TYPE_CFG: Record<string, { label: string; color: string; icon: string }> = {
  new_carrier:    { label: "新規参入",    color: "bg-emerald-700 text-emerald-100", icon: "🆕" },
  price_cut:      { label: "値下げ",      color: "bg-blue-700 text-blue-100",       icon: "💰" },
  new_plan:       { label: "新プラン",    color: "bg-violet-700 text-violet-100",   icon: "📱" },
  mvno_launch:    { label: "MVNO参入",    color: "bg-teal-700 text-teal-100",       icon: "🌐" },
  whois_new:      { label: "ドメイン取得", color: "bg-amber-700 text-amber-100",    icon: "🔍" },
  pr_times:       { label: "プレスリリース", color: "bg-pink-700 text-pink-100",    icon: "📰" },
  rss_keyword:    { label: "RSSマッチ",   color: "bg-orange-700 text-orange-100",   icon: "📡" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400">{pct}%</span>
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<NewServiceSignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  const adminToken = typeof window !== "undefined"
    ? (localStorage.getItem("admin_token") ?? "")
    : "";

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/signals", {
        headers: { "x-admin-token": adminToken },
      });
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function dismiss(id: string) {
    setDismissing(id);
    try {
      await fetch("/api/admin/signals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ id, action: "dismiss" }),
      });
      setSignals((prev) =>
        prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s))
      );
    } finally {
      setDismissing(null);
    }
  }

  const visible = showDismissed ? signals : signals.filter((s) => !s.dismissed);
  const dismissedCount = signals.filter((s) => s.dismissed).length;

  if (loading) {
    return <div className="text-slate-400 p-8">読み込み中…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">新サービス検知</h1>
        <div className="flex gap-3 items-center">
          {dismissedCount > 0 && (
            <button
              onClick={() => setShowDismissed((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showDismissed ? "処理済みを隠す" : `処理済み ${dismissedCount}件を表示`}
            </button>
          )}
          <button
            onClick={load}
            className="px-3 py-1.5 text-sm bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300"
          >
            更新
          </button>
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
        <p>
          <span className="text-white font-medium">PR TIMES RSS</span> と
          <span className="text-white font-medium ml-1">JPRS WHOIS</span> を監視して、
          新規キャリア参入・新プラン発表のシグナルを検知します。
          スクレイパーが自動挿入 → ここで確認 → 必要なら手動でプランデータに追加してください。
        </p>
      </div>

      {/* シグナルなし */}
      {visible.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-4">🔍</p>
          <p>検知シグナルがありません</p>
          <p className="text-sm mt-1">スクレイパー実行後に表示されます</p>
        </div>
      )}

      {/* シグナル一覧 */}
      <div className="space-y-3">
        {visible.map((signal) => {
          const cfg = SIGNAL_TYPE_CFG[signal.signal_type ?? "rss_keyword"] ?? {
            label: signal.signal_type ?? "不明",
            color: "bg-slate-600 text-slate-200",
            icon: "📌",
          };

          return (
            <div
              key={signal.id}
              className={`bg-slate-800 rounded-xl border p-4 transition-opacity ${
                signal.dismissed
                  ? "border-slate-700/50 opacity-50"
                  : "border-slate-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-500">{signal.source}</span>
                    {signal.negative_match && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                        除外キーワードあり
                      </span>
                    )}
                  </div>

                  <p className="text-white font-semibold text-sm leading-snug">{signal.title}</p>

                  {signal.url && (
                    <a
                      href={signal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                    >
                      記事を確認 ↗
                    </a>
                  )}

                  {signal.matched_keywords && signal.matched_keywords.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {signal.matched_keywords.map((kw) => (
                        <span key={kw} className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {signal.raw_content && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{signal.raw_content}</p>
                  )}

                  <div className="mt-2 flex items-center gap-4">
                    {signal.confidence != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">信頼度</span>
                        <ConfidenceBar value={signal.confidence} />
                      </div>
                    )}
                    <span className="text-xs text-slate-500 ml-auto">
                      {new Date(signal.created_at).toLocaleString("ja-JP")}
                    </span>
                  </div>
                </div>

                {!signal.dismissed && (
                  <button
                    onClick={() => dismiss(signal.id)}
                    disabled={dismissing === signal.id}
                    className="shrink-0 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {dismissing === signal.id ? "…" : "処理済み"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
