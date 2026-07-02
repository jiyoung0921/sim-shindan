import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Clock,
  Label,
  OpenNewWindow,
  Plus,
  Refresh,
  ShieldCheck,
  SubmitDocument,
} from "iconoir-react";
import { getRecentAuditLog } from "@/lib/db";

export const revalidate = 3600; // 1時間キャッシュ。差分承認後に順次反映される。

export const metadata: Metadata = {
  title: "料金データ更新履歴",
  description:
    "スマホ料金診断が掲載するプランデータの変更履歴。すべての料金変更・新プラン追加は公式ページ確認と人手レビューを経て反映されます。",
  robots: { index: true, follow: true },
};

const ACTION_META: Record<string, { label: string; icon: typeof Plus }> = {
  created: { label: "新規追加", icon: Plus },
  updated: { label: "情報更新", icon: Refresh },
  price_changed: { label: "料金変更", icon: SubmitDocument },
  discount_changed: { label: "割引変更", icon: Label },
  archived: { label: "提供終了", icon: Archive },
};

const CARRIER_LABEL: Record<string, string> = {
  docomo: "docomo",
  au: "au",
  softbank: "SoftBank",
  rakuten: "楽天モバイル",
  iij: "IIJmio",
  mineo: "mineo",
  nuro: "NURO",
};

const POLICIES = [
  "人手レビューを経て反映",
  "公式ページを参照",
  "すべての変更を記録",
];

function yen(value: number) {
  return `¥${value.toLocaleString()}`;
}

function groupByDate(entries: Awaited<ReturnType<typeof getRecentAuditLog>>) {
  const groups: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const date = new Date(entry.published_at).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
    <main className="min-h-screen bg-stone-50 pb-16 text-zinc-950">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          トップ
        </Link>
        <span className="text-sm font-semibold text-zinc-950">更新履歴</span>
        <span className="w-14" aria-hidden="true" />
      </nav>

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <header className="mt-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            料金データ更新履歴
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            掲載している料金データの変更履歴です。変更はすべて公式ページの確認と人手レビューを経て反映しています。
          </p>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {POLICIES.map((policy) => (
              <li key={policy} className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                {policy}
              </li>
            ))}
          </ul>
        </header>

        {log.length === 0 && (
          <div className="mt-10 rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
            <Clock className="mx-auto h-6 w-6 text-zinc-400" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-zinc-700">まだ更新履歴がありません</p>
            <p className="mt-1 text-xs leading-6 text-zinc-500">
              料金の改定や新プランの追加が反映されると、ここに記録されます。
            </p>
          </div>
        )}

        <div className="mt-8 space-y-8">
          {Object.entries(grouped).map(([date, entries]) => (
            <section key={date}>
              <h2 className="text-xs font-semibold tracking-wide text-zinc-500">{date}</h2>
              <div className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
                {entries.map((entry) => {
                  const meta = ACTION_META[entry.action] ?? {
                    label: entry.action,
                    icon: Refresh,
                  };
                  const ActionIcon = meta.icon;
                  const hasPriceChange =
                    entry.before_base_fee != null && entry.after_base_fee != null;
                  const isDown =
                    hasPriceChange && entry.after_base_fee! < entry.before_base_fee!;

                  return (
                    <article key={entry.id} className="flex gap-4 px-5 py-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-zinc-600">
                        <ActionIcon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-xs font-medium text-zinc-500">{meta.label}</span>
                          <span className="text-xs text-zinc-400">
                            {CARRIER_LABEL[entry.carrier_id] ?? entry.carrier_id}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-zinc-950">{entry.plan_name}</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">{entry.summary}</p>

                        {hasPriceChange && (
                          <p className="mt-2 inline-flex items-center gap-2 text-sm tabular-nums">
                            <span className="text-zinc-400 line-through">
                              {yen(entry.before_base_fee!)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                            <span className="font-semibold text-zinc-950">
                              {yen(entry.after_base_fee!)}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                isDown ? "text-emerald-700" : "text-red-600"
                              }`}
                            >
                              {isDown ? "−" : "+"}
                              {yen(Math.abs(entry.after_base_fee! - entry.before_base_fee!))}
                            </span>
                          </p>
                        )}

                        <a
                          href={entry.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                        >
                          公式ページで確認
                          <OpenNewWindow className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 text-center text-xs leading-6 text-zinc-500">
          <p>料金データは公式ページを参照し、人手レビューを経て掲載しています。</p>
          <p>最終的な料金は各社公式ページでご確認ください。</p>
        </footer>
      </div>
    </main>
  );
}
