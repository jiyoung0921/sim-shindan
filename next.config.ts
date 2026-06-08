import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // ── 画像最適化（将来 OGP 画像・アイコン追加時に自動 WebP/AVIF 変換） ──
  images: {
    formats: ["image/avif", "image/webp"],
    // Supabase Storage から画像を配信する場合はここに追加
    // remotePatterns: [{ hostname: "*.supabase.co" }],
  },

  // ── HTTP ヘッダー ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // 静的アセット（JS・CSS・フォント）: 1年キャッシュ（ハッシュ付きファイル名なので安全）
        source: "/:path*\\.(js|css|woff2|woff|ttf)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // plans.json: スクレイパーが更新するまで1時間キャッシュ
        source: "/data/plans.json",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        // セキュリティヘッダー（全ルート）
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  // ── リダイレクト ────────────────────────────────────────────────────────
  async redirects() {
    return [
      // 将来 /blog → /articles に統一する場合などに使う
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
