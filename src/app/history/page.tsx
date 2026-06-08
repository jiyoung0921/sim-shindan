import type { Metadata } from "next";
import { getRecentAuditLog } from "@/lib/db";
import Link from "next/link";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "料金データ更新履歴",
  description:
    "スマホ料金診断が掲載するプランデータの変更履歴。すべての料金変更・新プラン追加は公式ページ確認と人手レビューを経て反映されます。",
  robots: { index: true, follow: true },
}; // 1時間キャッシュ、Supabase 差分承認後に自動更新

const ACTION_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  created:          { label: "新規追加",   color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: "🆕" },
  updated:          { label: "情報更新",   color: "text-blue-600 bg-blue-50 border-blue-200",         icon: "🔄" },
  price_changed:    { label: "料金変更",   color: "text-red-600 bg-red-50 border-red-200",            icon: "💰" },
  discount_changed: { label: "割引変更",   color: "text-amber-600 bg-amber-50 border-amber-200",      icon: "🏷️" },
  archived:         { label: "提供終了",   color: "text-slate-500 bg-slate-50 border-slate-200",      icon: "📦" },
};

const CARRIER_COLOR: Record<string, string> = {
  docomo:   "bg-red-100 text-red-700",
  au:       "bg-orange-100 text-orange-700",
  softbank: "bg-yellow-100 text-yellow-700",
  rakuten:  "bg-pink-100 text-pink-700",
  iij:      "bg-blue-100 text-blue-700",
  mineo:    "bg-green-100 text-green-700",
  nuro:     "bg-purple-100 text-purple-700",
};

function groupByDate(entries: Awaited<ReturnType<typeof getRecentAuditLog>>) {
  const groups: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const date = new Date(entry.published_at).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(entry);
  }
  return groups;
}

export default async function HistoryPage() {
  const log = await getRecentAuditLog(100);
  const grouped = groupByDate(log);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ナビ */}
      <nav className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="text-blue-600 text-sm hover:underline">
          ← トップへ
        </Link>
        <span className="font-bold text-slate-700 text-sm">料金データ更新履歴</span>
        <div className="w-16" />
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">料金データ更新履歴</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            掲載している料金データの変更履歴です。変更はすべて公式ページの確認と人手レビューを経て反映されています。
          </p>
        </div>

        {/* 透明性バッジ */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1.5">
            <span>✅</span> 人手レビュー済み
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1.5">
            <span>🔗</span> 公式ページ参照
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1.5">
            <span>📋</span> 全変更を記録
          </div>
        </div>

        {/* 更新なし */}
        {log.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-4">📋</p>
            <p>まだ更新履歴がありません</p>
            <p className="text-sm mt-1">Supabase 設定後に表示されます</p>
          </div>
        )}

        {/* タイムライン */}
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs font-semibold text-slate-500 shrink-0">{date}</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            <div className="space-y-3">
              {entries.map((entry) => {
                const action = ACTION_LABEL[entry.action] ?? {
                  label: entry.action,
                  color: "text-slate-600 bg-slate-50 border-slate-200",
                  icon: "📝",
                };
                const carrierColor = CARRIER_COLOR[entry.carrier_id] ?? "bg-slate-100 text-slate-600";

                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{action.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${action.color}`}>
                            {action.label}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${carrierColor}`}>
                            {entry.carrier_id}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{entry.plan_name}</p>
                        <p className="text-sm text-slate-600 mt-1">{entry.summary}</p>

                        {/* 料金変動（ある場合） */}
                        {entry.before_base_fee != null && entry.after_base_fee != null && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="text-slate-400 line-through">
                              ¥{entry.before_base_fee.toLocaleString()}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className={`font-semibold ${
                              entry.after_base_fee < entry.before_base_fee
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}>
                              ¥{entry.after_base_fee.toLocaleString()}
                            </span>
                            <span className={`text-xs ${
                              entry.after_base_fee < entry.before_base_fee
                                ? "text-emerald-500"
                                : "text-red-500"
                            }`}>
                              ({entry.after_base_fee < entry.before_base_fee ? "−" : "+"}
                              ¥{Math.abs(entry.after_base_fee - entry.before_base_fee).toLocaleString()})
                            </span>
                          </div>
                        )}

                        {/* 根拠URL */}
                        <a
                          href={entry.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline mt-1.5 inline-block"
                        >
                          公式ページで確認 ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>料金データは公式ページを参照し、人手レビューを経て掲載しています。</p>
          <p className="mt-0.5">最終的な料金は各社公式ページでご確認ください。</p>
        </div>
      </div>
    </main>
  );
}
