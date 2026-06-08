import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sumahoshindan.com";

export const metadata: Metadata = {
  title: "スマホ料金診断 | 今変えるべきか、5分でわかる",
  description:
    "今のスマホ料金を、家族割・端末残債・ポイント経済圏まで含めて診断。「今変えるべきか」を根拠つきで判定します。",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "スマホ料金診断 | 今変えるべきか、5分でわかる",
    description: "質問に答えるだけで、スマホ料金を今見直すべきかを根拠つきで判定します。",
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
        "キャリア・月額・データ使用量などを入力して、スマートフォン料金を今見直すべきか判定するツール",
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
          name: "スマホ料金の見直しで何がわかりますか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "月額、データ使用量、家族割、端末残債、店舗サポートの必要性をもとに、今すぐ変えるべきか、次のタイミングでよいか、今は維持すべきかを判定します。",
          },
        },
        {
          "@type": "Question",
          name: "個人情報は必要ですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "名前、電話番号、請求書のアップロードは不要です。匿名で診断できます。",
          },
        },
      ],
    },
  ],
};

const DECISION_OUTPUTS = [
  {
    icon: BadgeCheck,
    label: "判定",
    value: "今すぐ / 次のタイミング / 維持",
  },
  {
    icon: CircleDollarSign,
    label: "現金の差額",
    value: "月額と年間の節約余地",
  },
  {
    icon: ReceiptText,
    label: "根拠",
    value: "公式URL・更新日・スコア内訳",
  },
];

const CHECK_POINTS = [
  {
    icon: Users,
    title: "家族割の崩れ",
    text: "自分だけ動くと家族の請求が変わる可能性を分けて見ます。",
  },
  {
    icon: Clock3,
    title: "端末残債",
    text: "残り支払いがある場合は、待つべきタイミングも判定に入れます。",
  },
  {
    icon: ShieldCheck,
    title: "不安の強さ",
    text: "店舗サポートや通信品質を重視する人には、無理なMVNO推しをしません。",
  },
];

const STEPS = ["キャリア", "月額", "データ量", "家族割", "残債", "不安度"];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-stone-50 text-zinc-950">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-normal text-zinc-950">
            スマホ料金診断
          </Link>
          <Link
            href="/diagnosis"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            診断する
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl items-center gap-10 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium text-zinc-500">
              登録不要。請求書アップロードも不要。
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-zinc-950 sm:text-6xl">
              スマホ料金診断
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600 sm:text-xl">
              安い順に並べる比較表ではなく、あなたが今変えるべきかを判定します。
              家族割、残債、店舗サポート、ポイントを分けて見ます。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/diagnosis"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-6 text-base font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                5分で診断を始める
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/history"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-100"
              >
                更新履歴を見る
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {STEPS.map((step) => (
                <span
                  key={step}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-zinc-950">診断で返すもの</p>
            <div className="mt-4 divide-y divide-zinc-100">
              {DECISION_OUTPUTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3">
            {CHECK_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <article key={point.title} className="rounded-lg border border-zinc-200 p-5">
                  <Icon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
                  <h2 className="mt-4 text-base font-semibold text-zinc-950">{point.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{point.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="border-t border-zinc-200 bg-stone-50 px-4 py-8 text-center text-xs leading-6 text-zinc-500">
          <p>料金データは公式ページをもとに管理しています。最終確認は各社公式ページで行ってください。</p>
          <p>広告リンクがある場合は PR として分けて表示します。</p>
        </footer>
      </main>
    </>
  );
}
