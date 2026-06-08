import type { Metadata } from "next";
import "./globals.css";

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : null;

export const metadata: Metadata = {
  title: {
    default: "スマホ料金診断 | 今変えるべきか、5分でわかる",
    template: "%s | スマホ料金診断",
  },
  description:
    "今のスマホ料金、本当に適切ですか？いくつかの質問に答えるだけで「今変えるべきか」を根拠付きで判定します。家族割・端末残債・ポイント経済圏まで考慮した、中立な意思決定支援ツールです。",
  openGraph: {
    title: "スマホ料金診断 | 今変えるべきか、5分でわかる",
    description: "質問に答えるだけで「今変えるべきか」を根拠つきで判定。家族割・残債・ポイントも考慮。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* Supabase への接続を事前確立（DB クエリのレイテンシ削減） */}
        {SUPABASE_HOST && (
          <>
            <link rel="preconnect" href={`https://${SUPABASE_HOST}`} />
            <link rel="dns-prefetch" href={`https://${SUPABASE_HOST}`} />
          </>
        )}
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
