# Claude Review Prompt: Data Freshness Architecture

あなたは、通信料金比較サービスのデータ基盤・スクレイピング・プロダクト信頼性をレビューするシニアエンジニア兼事業アドバイザーです。

このZIPには、`sumahoshindan.com` の「スマホ料金診断」リポジトリから、データ鮮度・プランマスタ・スクレイパー・管理画面・DB・デプロイに関係するファイルだけを同梱しています。

## サービス概要

`sumahoshindan.com` は、ユーザーの現在のスマホ利用状況を入力してもらい、MNO/MVNO/サブブランド/オンライン専用プランから、乗り換えるべきか・変えない方がいいかを診断するサービスです。

サービスの価値は「正直な診断」と「情報の鮮度」です。公式情報に基づかない料金や終了済みプランを出すと、サービスの信頼性が壊れます。

## 現在わかっている課題

- `public/data/plans.json` は初期プラン中心で、網羅性が不足している。
- 一部のMNO本体プランが古い可能性がある。
  - docomo `eximo / irumo`
  - au 旧 `使い放題MAX`
  - SoftBank 旧 `メリハリ / ペイトク` 系
  - Y!mobile `シンプル2`
- Pythonスクレイパーはあるが、現状では「日次実行すれば最新化される」状態ではない。
- 以前の確認では、スクレイパーに以下の問題があった。
  - `plan_id` が `plans.json` と一致しない。
  - 一部URLが404。
  - SSLエラー。
  - 価格抽出失敗。
  - PR TIMES RSS 404。
  - DBスキーマと `fetch_states` / `signal_type` がズレている可能性。
- Deep ResearchでMVNO/MNO一覧を調べたが、LLM出力には矛盾や未確認情報が混ざる。
- 公式サイト・公式料金ページ・重要事項説明書・提供条件書・約款URLがない情報は本番データに使わない方針。
- 自動更新ではなく、差分検知、管理画面で人間が承認、公開、という形が望ましい。

## 同梱ファイルの主な見どころ

- `public/data/plans.json`
- `src/lib/scoring.ts`
- `src/lib/plans.ts` が存在しない場合は、プラン読み込みがどこで行われているか周辺コードから推定してください。
- `src/lib/types.ts`
- `src/lib/db.ts`
- `src/lib/supabase.ts`
- `src/lib/admin-auth.ts`
- `src/app/admin/**`
- `src/app/api/admin/**`
- `src/app/api/sessions/route.ts`
- `src/app/api/feedback/route.ts`
- `scraper/**`
- `supabase/migrations/001_initial.sql`
- `.github/workflows/scraper.yml`
- `docs/launch.md`
- `wrangler.jsonc`
- `open-next.config.ts`
- `package.json`

## レビューしてほしいこと

### 1. 現行機能の棚卸し

リポジトリの実ファイルを読んで、今ある機能を整理してください。

以下を `実装済み` / `一部実装` / `未実装` / `壊れている` に分けてください。

- 診断ロジック
- プランマスタ
- スクレイパー
- 差分検知
- Supabase保存
- 管理画面
- GitHub Actions
- Cloudflare本番運用
- データ検証
- 公式根拠/evidence管理
- 新規MVNO/MNO検知

### 2. 鮮度維持に使える技術候補

MNO/MVNOの料金・容量・キャンペーン・受付状態を継続的に追うために、使える技術を比較してください。

候補例:

- 公式ページのHTMLスクレイピング
- Playwrightなどのブラウザ自動化
- RSS / ニュースリリース監視
- サイトマップ監視
- PDFの提供条件書・重要事項説明書の取得と差分比較
- text extraction / OCR
- スクリーンショット差分
- DOM差分
- LLMによる変更要約
- 公式APIがある場合のAPI利用
- SERP / 検索アラート
- GitHub Actions / Cloudflare Cron / Supabase Edge Functions
- 差分承認ワークフロー
- 人間レビュー前提の管理画面

それぞれについて、以下を評価してください。

- 何を検知できるか
- 何を検知できないか
- 壊れやすさ
- 運用コスト
- 法務/規約/負荷面の注意
- MVPで採用すべきか
- 将来採用でよいか

### 3. 「常に最新」の現実的な定義

「常に最新」は本当に可能か、現実的な表現に落としてください。

このサービスで使うべきデータ鮮度SLOを提案してください。

例:

- 公式ページの変更を24時間以内に検知
- 自動公開はしない
- 重要プランは人間承認後に反映
- 最終確認日を公開
- 公式根拠URLを公開
- 不確実な情報は診断対象にしない

### 4. 推奨アーキテクチャ

このサービスに最適なデータ更新アーキテクチャを提案してください。

前提:

- Next.js 16 App Router
- Cloudflare Workers / OpenNext
- Supabase
- GitHub Actions
- Pythonスクレイパーあり
- 管理画面あり
- public data は `public/data/plans.json`

希望する方向性:

- 自動取得
- 自動差分検知
- 自動バリデーション
- 人間承認
- 承認後に公開
- 誤情報を自動公開しない

以下を含めてください。

- データフロー
- DBテーブル設計の不足
- `plans.json` をどう扱うべきか
- Supabaseを正とするべきか
- JSONをビルド時に生成するべきか
- GitHub ActionsとCloudflare Cronの使い分け
- 失敗時のアラート
- 管理画面で必要なレビューUI

### 5. 現行スクレイパーの改善方針

現行スクレイパーを捨てるべきか、直して使うべきか判断してください。

確認してほしい観点:

- `plan_id` 設計
- URL設定
- HTML抽出
- PDF抽出
- 公式根拠URL
- snapshot保存
- checksum / content hash
- fetch state
- 差分検知
- normalizer
- validator
- DB schema
- GitHub Actions
- エラー分類
- リトライ
- SSL/403/404対応
- Playwright fallback
- LLM extractionを使うべき範囲

より良い構成があれば提案してください。

### 6. 足りない機能

ローンチ前またはローンチ直後に必要な機能を洗い出してください。

特に以下を見てください。

- 公式URL/evidence必須化
- plan status: `active` / `ended` / `existing_only` / `unknown`
- 最終確認日
- 料金変更履歴
- 管理画面の承認フロー
- レビュー担当者
- 変更理由
- 差分の影響範囲
- 診断ロジックへの影響
- rollback
- alert
- data quality score
- 公式クリック計測
- ユーザーからの誤情報報告
- MVNO新規発見バックログ
- 旧プラン/終了プランの扱い

### 7. 実装ロードマップ

以下の粒度でロードマップをください。

- 今すぐやること
- 7日以内
- 30日以内
- 90日以内
- 180日以降でよいもの

今すぐやることは、ローンチ前に必要なものだけに絞ってください。

## 最終アウトプット形式

以下の形式で返してください。

1. 結論
2. 現行機能の棚卸し表
3. 壊れている/足りない機能一覧
4. データ鮮度を保つ技術候補の比較表
5. 推奨アーキテクチャ
6. DB/JSON/管理画面の改善案
7. スクレイパー改善案
8. ロードマップ
9. 今すぐ修正すべきファイル一覧
10. 実装時の注意点

## 重要

- 推測と確認済み事実を分けてください。
- 公式URLがない情報を事実扱いしないでください。
- 「LLMに調べさせればOK」という結論にしないでください。
- 自動公開ではなく、人間承認前提で設計してください。
- MVPとしてやるべきことと、将来でよいことを分けてください。
- ファイルを読めていない場合は、そのセクションを推測で埋めず、どのファイルが不足しているかを書いてください。
