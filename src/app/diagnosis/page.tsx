import type { Metadata } from "next";
import DiagnosisFlow from "@/components/DiagnosisFlow";
import Link from "next/link";

export const metadata: Metadata = {
  title: "スマホ料金診断スタート",
  description:
    "今のキャリア・月額・データ使用量などを選ぶだけ。家族割・端末残債・ポイント経済圏まで考慮して「今変えるべきか」を5分で判定します。登録不要・完全無料。",
  robots: { index: true, follow: true },
};

export default function DiagnosisPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* ナビ */}
      <nav className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
          ← トップへ
        </Link>
        <span className="font-bold text-slate-700 text-sm">スマホ料金診断</span>
        <div className="w-16" /> {/* 右側スペーサー */}
      </nav>

      {/* 診断カード */}
      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <DiagnosisFlow />
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          個人情報の入力は不要です・匿名で診断できます
        </p>
      </div>
    </main>
  );
}
