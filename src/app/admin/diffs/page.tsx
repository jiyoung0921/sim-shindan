"use client";

import { useEffect, useState } from "react";
import { PlanDiff, AnomalyFlag } from "@/lib/db";

const DIFF_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  new_plan:        { label: "新規プラン", color: "bg-emerald-700 text-emerald-100" },
  price_change:    { label: "料金変更",   color: "bg-red-700 text-red-100" },
  discount_change: { label: "割引変更",   color: "bg-amber-700 text-amber-100" },
  field_change:    { label: "項目変更",   color: "bg-blue-700 text-blue-100" },
  removed:         { label: "削除",       color: "bg-slate-600 text-slate-200" },
};

const STATUS_BADGE: Record<string, string> = {
  pending:      "bg-amber-700 text-amber-100",
  auto_blocked: "bg-red-800 text-red-100",
  approved:     "bg-emerald-700 text-emerald-100",
  rejected:     "bg-slate-600 text-slate-300",
};

export default function DiffsPage() {
  const [diffs, setDiffs] = useState<PlanDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<PlanDiff | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const adminToken = typeof window !== "undefined"
    ? (localStorage.getItem("admin_token") ?? "")
    : "";

  useEffect(() => {
    loadDiffs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDiffs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/approve", {
        headers: { "x-admin-token": adminToken },
      });
      if (res.ok) {
        const data = await res.json();
        setDiffs(data.diffs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(diffId: string, action: "approve" | "reject") {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          diff_id: diffId,
          action,
          reviewed_by: "admin",
          review_note: reviewNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: action === "approve" ? "承認して公開しました" : "却下しました" });
        setSelectedDiff(null);
        setReviewNote("");
        await loadDiffs();
      } else {
        setMessage({ type: "error", text: "操作に失敗しました" });
      }
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="text-slate-400 p-8">読み込み中…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">差分承認キュー</h1>
        <button
          onClick={loadDiffs}
          className="px-3 py-1.5 text-sm bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300"
        >
          更新
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-emerald-800 text-emerald-100" : "bg-red-800 text-red-100"
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-70">✕</button>
        </div>
      )}

      {diffs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-4">✅</p>
          <p>承認待ちの差分はありません</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          {/* 差分リスト */}
          <div className="space-y-3">
            {diffs.map((diff) => {
              const typeCfg = DIFF_TYPE_LABEL[diff.diff_type] ?? { label: diff.diff_type, color: "bg-slate-600" };
              const anomalies = (diff.anomaly_flags ?? []) as AnomalyFlag[];
              return (
                <button
                  key={diff.id}
                  onClick={() => { setSelectedDiff(diff); setReviewNote(""); }}
                  className={`w-full text-left bg-slate-800 rounded-xl p-4 border transition-all ${
                    selectedDiff?.id === diff.id
                      ? "border-blue-500 ring-1 ring-blue-500"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeCfg.color}`}>
                      {typeCfg.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[diff.status]}`}>
                      {diff.status}
                    </span>
                    {anomalies.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-800 text-red-100">
                        ⚠️ 異常検知 {anomalies.length}件
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-white text-sm">{diff.plan_id}</p>
                  <p className="text-slate-400 text-xs mt-1">{diff.summary}</p>
                  {diff.changed_fields.length > 0 && (
                    <p className="text-slate-500 text-xs mt-1">
                      変更フィールド: {diff.changed_fields.join(", ")}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* 詳細パネル */}
          {selectedDiff && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-5 h-fit sticky top-6">
              <h3 className="font-bold text-white">{selectedDiff.plan_id}</h3>
              <p className="text-sm text-slate-300">{selectedDiff.summary}</p>

              {/* 異常フラグ */}
              {((selectedDiff.anomaly_flags ?? []) as AnomalyFlag[]).map((flag, i) => (
                <div key={i} className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-xs">
                  <p className="text-red-300 font-semibold">⚠️ {flag.type}</p>
                  <p className="text-red-400 mt-0.5">
                    {flag.field}: {flag.before?.toLocaleString()} → {flag.after?.toLocaleString()}
                    {flag.pct !== undefined && ` (${flag.pct > 0 ? "+" : ""}${flag.pct.toFixed(1)}%)`}
                  </p>
                </div>
              ))}

              {/* Before/After */}
              <div className="space-y-3">
                {selectedDiff.before_data && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1 font-semibold">変更前</p>
                    <pre className="text-xs bg-slate-900 rounded-lg p-3 text-slate-300 overflow-auto max-h-40">
                      {JSON.stringify(
                        (selectedDiff.before_data as Record<string, unknown>)?.billing ?? selectedDiff.before_data,
                        null, 2
                      )}
                    </pre>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 mb-1 font-semibold">変更後</p>
                  <pre className="text-xs bg-slate-900 rounded-lg p-3 text-emerald-300 overflow-auto max-h-40">
                    {JSON.stringify(
                      (selectedDiff.after_data as Record<string, unknown>)?.billing ?? selectedDiff.after_data,
                      null, 2
                    )}
                  </pre>
                </div>
              </div>

              {/* レビューノート */}
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="レビューメモ（任意）"
                rows={2}
                className="w-full text-sm bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-300 resize-none focus:outline-none focus:border-blue-500"
              />

              {/* 承認・却下ボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(selectedDiff.id ?? "", "approve")}
                  disabled={processing || selectedDiff.status === "approved"}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 disabled:opacity-40 transition-colors"
                >
                  ✓ 承認して公開
                </button>
                <button
                  onClick={() => handleAction(selectedDiff.id ?? "", "reject")}
                  disabled={processing || selectedDiff.status === "rejected"}
                  className="flex-1 py-2.5 rounded-lg bg-slate-600 text-white font-semibold text-sm hover:bg-slate-500 disabled:opacity-40 transition-colors"
                >
                  ✕ 却下
                </button>
              </div>

              {selectedDiff.status === "auto_blocked" && (
                <p className="text-xs text-red-400">
                  ⚠️ 異常検知により自動ブロック済み。内容を確認のうえ承認してください。
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
