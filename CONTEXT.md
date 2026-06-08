# プロジェクト状況サマリー（AI向け引き継ぎ資料）

**更新日:** 2026-06-08  
**ステータス:** 実装完了・未デプロイ（ローンチ待ち）

---

## このサービスは何か

**スマホ料金診断（仮称）**  
「今のキャリアから変えるべきか？」に答えるWebサービス。最安プランを並べるだけでなく、家族割・端末残債・ポイント経済圏・乗り換え摩擦を加味して「今すぐ変える / 次のタイミングで変える / 今は変えない」の3択で判定を返す。

ターゲット：日本のスマートフォンユーザー（30〜50代、現状に疑問を持っているが動けていない層）

---

## 実装状況

### ✅ 完成しているもの（全部動く）

**Next.js 16 App Router（TypeScript + Tailwind CSS）**

| ルート | 内容 | 配信方式 |
|--------|------|---------|
| `/` | LP・ヒーロー・特徴説明 | Static |
| `/diagnosis` | 10ステップ診断フォーム | Static |
| `/result` | 診断結果（スコア・判定・プラン推奨） | Client-side |
| `/history` | 料金データ更新履歴（公開） | ISR 1h |
| `/admin` | 管理ダッシュボード（KPI・アラート） | Dynamic |
| `/admin/diffs` | 差分承認キュー（Before/After・承認/却下） | Static+Client |
| `/admin/plans` | プラン一覧 | Dynamic |
| `/admin/signals` | 新サービス検知シグナル | Static+Client |
| `/api/admin/approve` | 差分承認API | Dynamic |
| `/api/admin/plans` | プラン管理API | Dynamic |
| `/api/admin/signals` | シグナルAPI | Dynamic |
| `/api/feedback` | フィードバック保存API | Dynamic |
| `/api/sessions` | 診断セッション保存API | Dynamic |
| `/robots.txt` | クローラー制御 | Static |
| `/sitemap.xml` | サイトマップ | Static |

**Python スクレイパー（`scraper/`）**

| ファイル | 役割 |
|---------|------|
| `main.py` | パイプライン統合エントリーポイント |
| `fetcher.py` | Conditional GET（ETag/Last-Modified）+ tenacityリトライ |
| `extractor.py` | BeautifulSoup + CSS セレクタで料金を抽出 |
| `normalizer.py` | 抽出データ → PlanRecord 形式に正規化 |
| `validator.py` | Pydantic v2 バリデーション + ±30%異常検知 |
| `diff.py` | 変更フィールド特定 → plan_diffs INSERT |
| `notifier.py` | Slack Block Kit 通知 |
| `new_service_detector.py` | PR TIMES RSS + JPRS ドメイン監視 |
| `config.json` | キャリア・セレクタ設定 |
| `requirements.txt` | 依存パッケージ |

**その他**
- `.github/workflows/scraper.yml` — 毎日JST 07:00自動実行
- `supabase/migrations/001_initial.sql` — DB初期化SQL
- `.env.local.example` — 環境変数テンプレート

---

## アーキテクチャ

```
GitHub Actions（毎日 JST 07:00）
  ↓ scraper/main.py
各キャリア公式ページ（Conditional GET）
  ↓
Supabase plan_diffs（pending / auto_blocked）
  ↓ 管理者が /admin/diffs で承認
Supabase plans（published）
  ↓ getPublishedPlans()
Next.js（Cloudflare Workers + OpenNext）
  ↓ ISR / Static
ユーザーのブラウザ
```

---

## コアロジック

### スコアリング（`src/lib/scoring.ts`）

6軸の重み付きスコアで判定:

| 軸 | 重み | 内容 |
|----|------|------|
| savings（節約） | 0.30 | 月間現金節約額（ポイント除く）、¥2,000で満点 |
| fit（適合度） | 0.25 | データ容量・通話・品質・店舗サポートの一致度 |
| friction inverted（摩擦） | 0.20 | 端末残債・オンライン限定耐性・家族割喪失 |
| stability（安定性） | 0.10 | MNO=0.9 / サブブランド=0.8 / MVNO=0.6 |
| ecosystem（経済圏） | 0.10 | ポイント種別の一致度 |
| psychology（心理） | 0.05 | 乗り換え耐性・店舗重視度 |

**判定ルール（`determineVerdict`）:**
- 総合スコア ≥ 0.65 かつ 摩擦スコア ≤ 0.6 → `switch_now`
- 総合スコア ≥ 0.50 → `switch_next_cycle`
- それ以外 → `keep_current`

### データモデル

現金とポイントは**必ず分離**して扱う。`billing`フィールドに現金料金のみ。`point_economy`フィールドにポイント情報。混在禁止。

```typescript
// src/lib/types.ts より
interface PriceTier {
  up_to_gb: number | "unlimited";
  monthly_fee_yen: number;   // 現金のみ
  label: string;
}
```

### Supabase フォールバック

`NEXT_PUBLIC_SUPABASE_URL` が未設定の場合、全DB操作が `public/data/plans.json` への静的JSONフォールバックに切り替わる。Supabase なしでもサービスが動く設計。

### 差分承認フロー

```
スクレイパー → plan_diffs（status: pending）
                         ↓ 異常検知（±30%）
                plan_diffs（status: auto_blocked）
                         ↓ 管理者が /admin/diffs で確認・承認
              plans テーブルに upsert → audit_log に記録 → /history に公開
```

---

## 環境変数（必須）

`.env.local.example` に全項目あり。最低限必要なもの：

```
NEXT_PUBLIC_SUPABASE_URL       # SupabaseプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonキー
SUPABASE_SERVICE_KEY           # Supabase service_roleキー（サーバー専用）
ADMIN_SECRET_TOKEN             # 管理画面認証トークン
NEXT_PUBLIC_SITE_URL           # 本番URL（sitemap・OGP用）
ADMIN_BASE_URL                 # 本番URL（Slack通知リンク用）
```

---

## デプロイ先（予定）

| 項目 | 選択 | 理由 |
|------|------|------|
| ホスティング | Cloudflare Workers + OpenNext | API Routes / SSR / ISR 対応 |
| DB | Supabase 無料枠 | 500MB・十分な容量 |
| ドメイン | Cloudflare Registrar | $10.44/年・管理一元化 |
| CI/CD | GitHub Actions（publicリポジトリ） | 無制限無料 |
| 記事・LP（将来） | microCMS + `/articles/[slug]` | 日本製・無料枠あり |

**初期費用: ¥1,618（ドメインのみ）**  
**ランニング: ¥135/月（ドメイン更新のみ）**

---

## 未着手・将来タスク

- [ ] microCMS連携（`/articles/[slug]`・`/lp/[slug]`）
- [ ] OGP画像の動的生成（`@vercel/og` → Cloudflare Workers対応版）
- [ ] プライバシーポリシー・透明性ポリシーページ
- [x] 管理画面ログイン画面（ADMIN_SECRET_TOKEN を httpOnly Cookie で保持）
- [ ] A/Bテスト基盤
- [ ] アフィリエイトリンク管理

---

## ローカル起動

```bash
cd /Users/jiyoung/sim-shindan
cp .env.local.example .env.local  # 値を設定する
npm install
npm run dev
# → http://localhost:3000
```

Supabase 未設定でも `public/data/plans.json` を使って診断機能は動く。

---

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| `docs/requirements.md` | 要件定義書（全959行・詳細仕様） |
| `docs/launch.md` | ローンチ手順書（30〜35分でデプロイ完了） |
| `.env.local.example` | 環境変数の全項目と説明 |
| `supabase/migrations/001_initial.sql` | DB初期化SQL（テーブル・RLS・トリガー） |
| `scraper/config.json` | スクレイパーのキャリア・セレクタ設定 |
