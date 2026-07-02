import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  DatabaseCheck,
  GraphUp,
  Lock,
  NavArrowRight,
  Page,
  ShieldCheck,
  SmartphoneDevice,
} from "iconoir-react";
import CarrierIcon from "@/components/CarrierIcon";
import { FEATURED_CARRIERS } from "@/lib/carriers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sumahoshindan.com";

export const metadata: Metadata = {
  title: "スマホ料金診断 | 今のスマホ代をかんたんチェック",
  description:
    "今の通信料、データ使用量、家族割、端末残債をもとに、スマホ料金を見直すべきか無料で診断します。",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "スマホ料金診断 | 今のスマホ代をかんたんチェック",
    description: "公式料金データをもとに、今すぐ見直す・次のタイミング・今は維持を判定します。",
    url: SITE_URL,
    type: "website",
    locale: "ja_JP",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "スマホ料金診断",
      url: SITE_URL,
      description:
        "キャリア・通信料・データ使用量などを入力して、スマートフォン料金を見直すべきか判定する無料診断ツール",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
      inLanguage: "ja",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "スマホ料金診断では何がわかりますか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "今の通信料、データ使用量、通話頻度、家族割、端末残債、自宅回線、店舗サポートの必要性をもとに、スマホ料金を今見直すべきか判定します。",
          },
        },
        {
          "@type": "Question",
          name: "診断に個人情報は必要ですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "名前、電話番号、請求書アップロードは不要です。匿名で診断できます。",
          },
        },
      ],
    },
  ],
};

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: "匿名・無料", text: "名前や電話番号は不要です。" },
  { icon: Lock, title: "入力は端末内", text: "診断に必要な条件だけを使います。" },
  { icon: DatabaseCheck, title: "公式料金データ", text: "更新日と根拠を分けて管理します。" },
];

const STEPS = [
  { number: "01", title: "条件を入力", text: "今の通信料、データ量、家族割、端末残債を選択します。" },
  { number: "02", title: "料金を分析", text: "現金支出、割引条件、乗り換え摩擦を分けて比較します。" },
  { number: "03", title: "判定を確認", text: "今すぐ見直し、次のタイミング、今は維持のどれかを返します。" },
];

function ResultPreview() {
  const rows = [
    ["現在の通信料", "¥8,000"],
    ["候補プラン", "¥4,980"],
    ["割引条件", "-¥1,100"],
    ["月の差額", "-¥3,020"],
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(24,24,27,0.10)]">
      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-xs font-medium text-zinc-500">診断結果のプレビュー</p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}
            >
              <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              今すぐ見直し
            </p>
            <h2 className="mt-3 text-xl font-semibold leading-snug text-zinc-950">
              月額を下げられる可能性があります
            </h2>
          </div>
          <GraphUp className="mt-1 h-7 w-7 shrink-0" color="#2563eb" strokeWidth={1.8} aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-zinc-100 border-b border-zinc-100">
        <div className="px-5 py-5">
          <p className="text-xs text-zinc-500">現在の目安</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">¥8,000</p>
          <p className="mt-1 text-xs text-zinc-500">通信料ベース</p>
        </div>
        <div className="px-5 py-5">
          <p className="text-xs text-zinc-500">見直し後の目安</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "#2563eb" }}>
            ¥4,980
          </p>
          <p className="mt-1 text-xs text-zinc-500">条件適用後</p>
        </div>
      </div>

      <dl className="divide-y divide-zinc-100 px-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="font-medium tabular-nums text-zinc-950">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-zinc-100 px-5 py-4">
        <Link
          href="/diagnosis"
          className="flex h-11 items-center justify-between rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          診断を始める
          <NavArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-stone-50 text-zinc-950">
        <header className="border-b border-zinc-200/70 bg-stone-50/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="text-sm font-semibold tracking-normal text-zinc-950">
              スマホ料金診断
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 sm:flex">
              <a href="#flow" className="transition-colors hover:text-zinc-950">
                診断の流れ
              </a>
              <a href="#carriers" className="transition-colors hover:text-zinc-950">
                対応回線
              </a>
              <Link href="/history" className="transition-colors hover:text-zinc-950">
                料金データ
              </Link>
            </nav>
            <Link
              href="/diagnosis"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              診断を始める
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <section
          className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:py-20"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 430px), 1fr))" }}
        >
          <div className="max-w-2xl">
            <p
              className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm font-semibold"
              style={{ borderColor: "#bfdbfe", color: "#2563eb" }}
            >
              <SmartphoneDevice className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              通信料を、ムダなく最適に
            </p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-normal text-zinc-950 sm:text-6xl">
              スマホ料金診断
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">
              月々の通信料、データ使用量、家族割、端末残債をもとに、今のスマホ代を見直すべきか判定します。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/diagnosis"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition-colors"
                style={{ backgroundColor: "#2563eb" }}
              >
                診断を始める
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link
                href="/history"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
              >
                料金データを見る
                <NavArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-12 grid gap-5 border-t border-zinc-200 pt-7 sm:grid-cols-3">
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title}>
                    <Icon className="h-5 w-5 text-zinc-800" strokeWidth={1.8} aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-zinc-950">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <ResultPreview />
        </section>

        <section id="flow" className="border-y border-zinc-200 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#2563eb" }}>
                  3ステップ
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
                  さっと入力して、判定を見る
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-zinc-600">
                請求額そのものではなく、端末代を除いた通信料で比較します。
              </p>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number} className="border-t border-zinc-200 pt-5">
                  <p className="text-sm font-semibold tabular-nums" style={{ color: "#2563eb" }}>
                    {step.number}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="carriers" className="bg-stone-50 py-14 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#2563eb" }}>
                対応回線
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
                主要プランをまとめて確認
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                大手キャリア、サブブランド、オンライン専用、MVNOを比較対象にしています。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-4">
              {FEATURED_CARRIERS.map((carrier) => (
                <div
                  key={carrier.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-3"
                >
                  <CarrierIcon carrier={carrier} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">{carrier.label}</p>
                    <p className="truncate text-xs text-zinc-500">{carrier.subLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-white px-4 py-14 text-center sm:px-6 sm:py-16">
          <Page className="mx-auto h-7 w-7" color="#2563eb" strokeWidth={1.8} aria-hidden="true" />
          <h2 className="mt-5 text-3xl font-semibold tracking-normal text-zinc-950">
            今のスマホ代を確認する
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-600">
            名前、電話番号、請求書アップロードは不要です。近い条件を選ぶだけで診断できます。
          </p>
          <Link
            href="/diagnosis"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            診断へ進む
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>
      </main>
    </>
  );
}
