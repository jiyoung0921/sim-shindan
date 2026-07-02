# ローンチ手順書

**サービス名:** スマホ料金診断  
**作成日:** 2026-06-08  
**ステータス:** 実装完了・未デプロイ

---

## 概要

コードは完成している。ローンチに必要な作業は以下の4フェーズのみ。  
所要時間の目安：**30〜35分**

---

## Phase 1｜GitHubにコードをpush（5分）

```bash
cd /Users/jiyoung/sim-shindan

git init
git add .
git commit -m "initial commit"

# GitHubでリポジトリ作成後（Public推奨・GitHub Actions無料枠が無制限になる）
git remote add origin https://github.com/YOUR_USERNAME/sim-shindan.git
git push -u origin main
```

> **注意:** `.env.local` は `.gitignore` に含まれているので秘密情報がpushされることはない。

---

## Phase 2｜Supabaseをセットアップ（10分）

### 2-1. プロジェクト作成
1. [supabase.com](https://supabase.com) でアカウント作成（無料）
2. New Project → 名前: `sim-shindan` / リージョン: **Northeast Asia (Tokyo)**

### 2-2. テーブル作成
1. Supabase ダッシュボード → SQL Editor
2. `supabase/migrations/001_initial.sql` の中身を全コピーして実行
3. `supabase/migrations/002_plan_availability.sql` の中身を全コピーして実行
4. `supabase/migrations/003_plan_clicks.sql` の中身を全コピーして実行
5. `supabase/migrations/004_analytics_events.sql` の中身を全コピーして実行
6. 「Success」と表示されればOK

作成されるテーブル:
- `plans` — プランデータ（公開用）
- `plan_diffs` — 差分承認キュー
- `fetch_states` — スクレイパーのETag管理
- `diagnosis_sessions` — 診断セッション記録
- `feedbacks` — ユーザーフィードバック
- `audit_log` — 更新履歴（公開用）
- `new_service_signals` — 新サービス検知
- `plan_clicks` — 公式リンククリック計測
- `analytics_events` — 診断ファネル計測

### 2-3. 初期プランデータを投入

ローカルまたはGitHub Actionsから、`public/data/plans.json` の内容を `plans` テーブルへ投入する。

```bash
cd /Users/jiyoung/sim-shindan

SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_KEY=eyJ... \
npm run seed:plans
```

`Seeded 13 plans` と表示されればOK。これを実行しないと、管理画面のプラン一覧とスクレイパーの差分比較が空のDBを基準に動く。

### 2-4. APIキーをメモ
Settings → API から以下3つを控える:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（anon key）
SUPABASE_SERVICE_KEY=eyJ...（service_role key）
```

---

## Phase 3｜Cloudflare Workersをセットアップ（15分）

### 3-1. アカウント作成
[cloudflare.com](https://cloudflare.com) でアカウント作成（無料）

### 3-2. ドメイン取得（唯一の課金ポイント）
1. Cloudflare ダッシュボード → Domain Registration → Register Domains
2. 任意の `.com` ドメインを検索
3. **$10.44/年**（¥1,618）で購入
4. 支払い → 数分でアクティブになる

### 3-3. Workers プロジェクト作成
1. Workers & Pages → Create application → Workers → Connect to Git
2. GitHubアカウントを連携 → `sim-shindan` リポジトリを選択
3. ビルド設定:

```
Framework preset: None
Build command:    npm run deploy
Root directory:   （空欄）
```

このリポジトリには OpenNext 用の以下を追加済み:

- `@opennextjs/cloudflare`
- `wrangler`
- `wrangler.jsonc`
- `open-next.config.ts`
- `public/_headers`
- `.dev.vars.example`（ローカル preview 用。必要なら `.dev.vars` にコピー）
- `npm run preview / deploy / upload / cf-typegen`

### 3-4. 環境変数を設定
Workers プロジェクト → Settings → Build → Build variables and secrets に追加:

```
NEXT_PUBLIC_SUPABASE_URL        = （Phase2でメモした値）
NEXT_PUBLIC_SUPABASE_ANON_KEY   = （Phase2でメモした値）
SUPABASE_SERVICE_KEY            = （Phase2でメモした値）
ADMIN_SECRET_TOKEN              = （openssl rand -hex 32 で生成した文字列）
NEXT_PUBLIC_SITE_URL            = https://（取得したドメイン）
ADMIN_BASE_URL                  = https://（取得したドメイン）
```

同じ値を Workers プロジェクト → Settings → Variables and Secrets にも Runtime variables/secrets として設定する。`SUPABASE_SERVICE_KEY` と `ADMIN_SECRET_TOKEN` はSecret扱いにする。

承認済みの差分を `public/data/plans.json` に自動exportしたい場合は、以下も Runtime variables/secrets に追加する。

```
GITHUB_REPOSITORY       = YOUR_USERNAME/sim-shindan
GITHUB_DISPATCH_TOKEN   = repository_dispatch を実行できる Fine-grained PAT
```

未設定でも管理画面での承認は成功する。その場合、`plans.json` への反映は GitHub Actions の「プランJSONエクスポート」を手動実行する。

### 3-5. カスタムドメインを設定
Workers プロジェクト → Settings → Domains & Routes → Add  
→ 購入したドメインを入力 → DNSは自動設定される（Cloudflare内完結）

### 3-6. 初回デプロイ
Save & Deploy → `opennextjs-cloudflare build && opennextjs-cloudflare deploy` が実行される  
`https://（ドメイン）` でサイトが表示される

---

## Phase 4｜GitHub Secretsを設定（5分）

スクレイパー（GitHub Actions）が Supabase に書き込むために必要。

GitHubリポジトリ → Settings → Secrets and variables → Actions → New repository secret

| Secret名 | 値 |
|---------|---|
| `SUPABASE_URL` | SupabaseのProject URL |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `SLACK_WEBHOOK_URL` | SlackのIncoming Webhook URL（任意） |
| `ADMIN_BASE_URL` | `https://（取得したドメイン）` |

設定後、翌朝JST 07:00に初回スクレイパーが自動実行される。  
手動で今すぐ実行したい場合: Actions → 料金スクレイパー → Run workflow

`/admin/diffs` で承認した内容を静的フォールバックにも反映するため、GitHub Actions → プランJSONエクスポート → Run workflow を1回実行し、`public/data/plans.json` が更新されることを確認する。

---

## Supabase 停止防止 cron の追加（推奨）

無料プランは7日間アクセスがないとDBが停止する。  
以下のファイルを追加してpushすれば自動でpingが走る。

**`.github/workflows/supabase-ping.yml`** を作成:

```yaml
name: Supabase 停止防止
on:
  schedule:
    - cron: "0 12 */5 * *"  # 5日に1回
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s "${{ secrets.SUPABASE_URL }}/rest/v1/plans?limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" > /dev/null
```

GitHub Secrets に `SUPABASE_ANON_KEY`（anon key）も追加すること。

---

## ローンチ後の運用フロー

```
毎日 JST 07:00
  ↓
GitHub Actions がスクレイパーを自動実行
  ↓
各キャリア公式ページから料金を取得（Conditional GET）
  ↓
変更があれば plan_diffs テーブルに INSERT
  ↓
Slack に通知（設定している場合）
  ↓
/admin/diffs で内容を確認・承認
  ↓
承認後、plans テーブルに反映・/history に公開
  ↓
GITHUB_DISPATCH_TOKEN 設定済みなら GitHub Actions が plans.json をexportしてcommit
  ↓
Cloudflare のGit連携が main push を検知して再デプロイ
```

---

## 管理画面へのアクセス

```
URL: https://（ドメイン）/admin
認証: ログイン画面で ADMIN_SECRET_TOKEN を入力

管理APIは x-admin-token ヘッダー、またはログイン後の httpOnly Cookie と照合する。
```

---

## コスト確認

| 項目 | 初期費用 | 月額 |
|------|---------|------|
| ドメイン（Cloudflare Registrar） | **¥1,618** | — |
| Cloudflare Workers | ¥0 | ¥0 |
| Supabase | ¥0 | ¥0 |
| GitHub Actions（publicリポジトリ） | ¥0 | ¥0 |
| microCMS（記事・LP追加時） | ¥0 | ¥0 |
| **合計** | **¥1,618** | **¥0** |
| 2年目以降 | — | **¥135/月（ドメイン更新のみ）** |
