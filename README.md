# スマホ料金診断

「今のキャリアから変えるべきか？」に答えるWebサービス。  
最安プランを並べるだけでなく、家族割・端末残債・ポイント経済圏・乗り換え摩擦を加味して **「今すぐ変える / 次のタイミングで変える / 今は変えない」** の3択で判定を返す。

---

## ステータス

**本番デプロイ済み・初期MVP検証中**（2026-06-11時点）

- 本番URL: https://sumahoshindan.com
- 現在の主目的: 診断完了率、結果納得度、公式リンククリック意図の検証

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16（App Router）/ TypeScript / Tailwind CSS |
| DB | Supabase（PostgreSQL + RLS） |
| ホスティング（予定） | Cloudflare Workers + OpenNext |
| CI/CD | GitHub Actions（毎日JST 07:00スクレイパー実行） |
| スクレイパー | Python 3.12 / httpx / Pydantic v2 / BeautifulSoup |

---

## クイックスタート

```bash
cp .env.local.example .env.local   # 環境変数を設定（Supabase未設定でも動く）
npm install
npm run dev
# → http://localhost:3000
```

---

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [`CONTEXT.md`](./CONTEXT.md) | **AI向け引き継ぎ資料**（アーキテクチャ・実装状況・コアロジック） |
| [`docs/requirements.md`](./docs/requirements.md) | 要件定義書（詳細仕様・全959行） |
| [`docs/claude-business-review.md`](./docs/claude-business-review.md) | Claudeレビュー用の事業・ロジック・マネタイズ・ロードマップ整理 |
| [`docs/launch.md`](./docs/launch.md) | ローンチ手順書（30〜35分でデプロイ完了） |
| [`.env.local.example`](./.env.local.example) | 環境変数テンプレート |

---

## ディレクトリ構成

```
sim-shindan/
├── src/
│   ├── app/                   # Next.js ルート
│   │   ├── page.tsx           # LP（トップ）
│   │   ├── diagnosis/         # 診断フォーム
│   │   ├── result/            # 診断結果
│   │   ├── history/           # 更新履歴（公開）
│   │   ├── admin/             # 管理画面
│   │   └── api/               # APIルート
│   ├── components/            # UIコンポーネント
│   └── lib/
│       ├── scoring.ts         # スコアリングエンジン（コアロジック）
│       ├── types.ts           # 型定義
│       ├── db.ts              # DB操作（Supabase / 静的JSONフォールバック）
│       └── supabase.ts        # Supabaseクライアント
├── scraper/                   # Pythonスクレイパー
│   ├── main.py                # エントリーポイント
│   ├── fetcher.py             # Conditional GET
│   ├── extractor.py           # HTML解析
│   ├── normalizer.py          # データ正規化
│   ├── validator.py           # Pydantic検証 + 異常検知
│   ├── diff.py                # 差分生成・DB書き込み
│   ├── notifier.py            # Slack通知
│   └── new_service_detector.py # 新サービス検知
├── public/data/plans.json     # 静的プランデータ（Supabase未設定時のフォールバック）
├── supabase/migrations/       # DBマイグレーションSQL
├── .github/workflows/         # GitHub Actions（スクレイパー定時実行）
└── docs/                      # ドキュメント
```

---

## コスト

| 項目 | 初期 | 月額 |
|------|------|------|
| ドメイン（Cloudflare Registrar） | ¥1,618 | — |
| その他すべて | ¥0 | ¥0 |
| 2年目以降 | — | ¥135/月 |
