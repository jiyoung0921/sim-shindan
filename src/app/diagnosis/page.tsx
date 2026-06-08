import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DiagnosisFlow from "@/components/DiagnosisFlow";

export const metadata: Metadata = {
  title: "診断スタート",
  description:
    "今のキャリア・月額・データ使用量などを選ぶだけ。家族割・端末残債・ポイント経済圏まで考慮して「今変えるべきか」を5分で判定します。",
  robots: { index: true, follow: true },
};

export default function DiagnosisPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          トップ
        </Link>
        <span className="text-sm font-semibold text-zinc-950">スマホ料金診断</span>
        <span className="w-14" aria-hidden="true" />
      </nav>

      <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <DiagnosisFlow />
        <p className="mt-5 text-center text-xs leading-6 text-zinc-500">
          名前、電話番号、請求書アップロードは不要です。
        </p>
      </div>
    </main>
  );
}
