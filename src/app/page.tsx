import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sim-shindan.com";

export const metadata: Metadata = {
  title: "スマホ料金診断 | 今変えるべきか、5分でわかる",
  description:
    "今のスマホ料金、本当に適切ですか？キャリア・月額・データ使用量を選ぶだけで「今変えるべきか」を根拠つきで判定。家族割・端末残債・ポイント経済圏まで考慮した、中立な意思決定支援ツールです。",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "スマホ料金診断 | 今変えるべきか、5分でわかる",
    description: "質問に答えるだけで「今変えるべきか」を根拠つきで判定。家族割・残債・ポイントも考慮。",
    url: SITE_URL,
    type: "website",
    locale: "ja_JP",
  },
};

// JSON-LD 構造化データ（WebApplication + FAQPage）
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "スマホ料金診断",
      url: SITE_URL,
      description:
        "キャリア・月額・データ使用量を入力するだけで「今変えるべきか」をAIが判定するスマートフォン料金診断ツール",
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
          name: "スマホの乗り換えはいつが最適ですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "端末の分割払い残債がなくなるタイミング、または家族割の影響が少ない時期が最適です。本ツールでは家族割・残債・ポイント経済圏を考慮して「今すぐ」「次のタイミング」「維持」の3択で判定します。",
          },
        },
        {
          "@type": "Question",
          name: "格安SIMに変えると品質は落ちますか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "MVNOは大手キャリアの回線を借りているため、混雑時間帯（12時・18時台）に速度が落ちる場合があります。本ツールでは品質感度の設定に応じてプランを絞り込み、安定性スコアを表示します。",
          },
        },
        {
          "@type": "Question",
          name: "診断に個人情報は必要ですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "名前・電話番号・請求書などの個人情報は一切不要です。匿名で診断できます。",
          },
        },
      ],
    },
  ],
};

const STATS = [
  { value: "23社以上", label: "対象キャリア・MVNO数" },
  { value: "5分", label: "診断所要時間" },
  { value: "0円", label: "完全無料" },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "「今変えるべきか」を断言",
    desc: "「今すぐ」「次のタイミング」「今は維持」の3択で判定。理由も合わせて返します。",
  },
  {
    icon: "💴",
    title: "現金節約とポイントを分離",
    desc: "ポイントと現金を混ぜた「実質○○円」ではなく、現金支出ベースで比較します。",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "家族割・残債も考慮",
    desc: "家族割が崩れる場合は「変えない方がよい」と正直に判定します。",
  },
  {
    icon: "🔗",
    title: "根拠URLと更新日を必ず表示",
    desc: "すべての料金データに公式ページURLと取得日時を付与。情報の鮮度が見えます。",
  },
  {
    icon: "🏪",
    title: "スポンサーと編集を分離",
    desc: "推奨順位はアルゴリズムで決定。広告案件は「PR」バッジで明示します。",
  },
  {
    icon: "🔒",
    title: "個人情報不要",
    desc: "名前・電話番号・請求書は不要。匿名で診断できます。",
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      {/* ナビ */}
      <nav className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between">
        <span className="font-bold text-blue-700 text-lg">📱 スマホ料金診断</span>
        <span className="text-xs text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">
          Beta
        </span>
      </nav>

      {/* ヒーロー */}
      <section className="max-w-2xl mx-auto px-5 pt-12 pb-16 text-center">
        <div className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          中立・無料・匿名で診断
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-5">
          あなたのスマホ料金、<br />
          <span className="text-blue-600">本当に変えるべきですか？</span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-lg mx-auto">
          最安プランを並べるだけじゃない。家族割・端末残債・ポイント経済圏まで考慮して、
          <strong>「今変えるべきか」を根拠つきで判定</strong>します。
        </p>

        {/* CTA */}
        <Link
          href="/diagnosis"
          className="inline-block px-10 py-4 rounded-2xl bg-blue-600 text-white font-bold text-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
        >
          無料で診断スタート →
        </Link>
        <p className="text-xs text-slate-400 mt-3">約5分・登録不要・完全無料</p>

        {/* 統計 */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl py-4 px-3 border border-slate-200 shadow-sm">
              <p className="text-2xl font-extrabold text-blue-600">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 特徴 */}
      <section className="max-w-2xl mx-auto px-5 pb-16">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
          他の比較サイトとの違い
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-slate-800 mb-1.5 text-sm">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 免責 */}
      <section className="max-w-2xl mx-auto px-5 pb-12">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs text-amber-700 leading-relaxed">
            ⚠️ 本サービスの料金データは公式ページを参照し、人手で確認を行っていますが、最新情報と差異が生じる場合があります。
            最終的な料金は必ず各キャリアの公式ページでご確認ください。
            診断結果は情報提供を目的としており、乗り換えを強制するものではありません。
          </p>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        <p>© 2026 スマホ料金診断 | プライバシーポリシー | 透明性ポリシー</p>
        <p className="mt-1">本サービスはアフィリエイトリンクを含む場合があります（PRバッジで明示）</p>
      </footer>
    </main>
    </>
  );
}
