"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle, Refresh, WarningTriangle, Xmark } from "iconoir-react";
import type { AnomalyFlag, PlanDiff } from "@/lib/db";

const DIFF_TYPE_LABEL: Record<string, string> = {
  new_plan: "新規プラン",
  price_change: "料金変更",
  discount_change: "割引変更",
  field_change: "項目変更",
  removed: "削除",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  auto_blocked: "bg-red-50 text-red-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-stone-100 text-zinc-500",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "承認待ち",
  auto_blocked: "自動ブロック",
  approved: "承認済み",
  rejected: "却下",
};

export default function DiffsPage() {
  const [diffs, setDiffs] = useState<PlanDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<PlanDiff | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadDiffs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/approve");
      if (res.ok) {
        const data = await res.json();
        setDiffs(data.diffs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadDiffs();
    });
    return () => {
      cancelled = true;
    };
  }, [loadDiffs]);

  async function handleAction(diffId: string, action: "approve" | "reject") {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diff_id: diffId,
          action,
          reviewed_by: "admin",
          review_note: reviewNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: action === "approve" ? "承認して公開しました" : "却下しました",
        });
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
    return <p className="py-16 text-center text-sm text-zinc-500">読み込んでいます</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">差分承認キュー</h1>
        <button
          type="button"
          onClick={loadDiffs}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          <Refresh className="h-4 w-4" aria-hidden="true" />
          更新
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="rounded-md p-1 transition-colors hover:bg-white/60"
            aria-label="閉じる"
          >
            <Xmark className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {diffs.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <CheckCircle className="mx-auto h-6 w-6 text-zinc-400" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-zinc-700">承認待ちの差分はありません</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-3">
            {diffs.map((diff) => {
              const anomalies = (diff.anomaly_flags ?? []) as AnomalyFlag[];
              const selected = selectedDiff?.id === diff.id;
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => {
                    setSelectedDiff(diff);
                    setReviewNote("");
                  }}
                  className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm transition-colors ${
                    selected ? "border-zinc-950 ring-1 ring-zinc-950" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {DIFF_TYPE_LABEL[diff.diff_type] ?? diff.diff_type}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[diff.status]}`}>
                      {STATUS_LABEL[diff.status] ?? diff.status}
                    </span>
                    {anomalies.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <WarningTriangle className="h-3 w-3" aria-hidden="true" />
                        異常検知 {anomalies.length}件
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-zinc-950">{diff.plan_id}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{diff.summary}</p>
                  {diff.changed_fields.length > 0 && (
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      変更フィールド: {diff.changed_fields.join(", ")}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDiff && (
            <div className="h-fit space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">{selectedDiff.plan_id}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{selectedDiff.summary}</p>
              </div>

              {((selectedDiff.anomaly_flags ?? []) as AnomalyFlag[]).map((flag, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <WarningTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {flag.type}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-red-600">
                    {flag.field}: {flag.before?.toLocaleString()} → {flag.after?.toLocaleString()}
                    {flag.pct !== undefined && ` (${flag.pct > 0 ? "+" : ""}${flag.pct.toFixed(1)}%)`}
                  </p>
                </div>
              ))}

              <div className="space-y-3">
                {selectedDiff.before_data && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-zinc-500">変更前</p>
                    <pre className="max-h-44 overflow-auto rounded-lg border border-zinc-200 bg-stone-50 p-3 text-xs leading-5 text-zinc-700">
                      {JSON.stringify(
                        (selectedDiff.before_data as Record<string, unknown>)?.billing ??
                          selectedDiff.before_data,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-zinc-500">変更後</p>
                  <pre className="max-h-44 overflow-auto rounded-lg border border-zinc-200 bg-stone-50 p-3 text-xs leading-5 text-zinc-950">
                    {JSON.stringify(
                      (selectedDiff.after_data as Record<string, unknown>)?.billing ??
                        selectedDiff.after_data,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>

              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="レビューメモ（任意）"
                rows={2}
                className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-zinc-950"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAction(selectedDiff.id ?? "", "approve")}
                  disabled={processing || selectedDiff.status === "approved"}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  承認して公開
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(selectedDiff.id ?? "", "reject")}
                  disabled={processing || selectedDiff.status === "rejected"}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:text-zinc-400"
                >
                  <Xmark className="h-4 w-4" aria-hidden="true" />
                  却下
                </button>
              </div>

              {selectedDiff.status === "auto_blocked" && (
                <p className="text-xs leading-5 text-red-600">
                  異常検知により自動ブロックされています。内容を確認のうえ承認してください。
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
