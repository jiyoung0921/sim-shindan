# スマホ料金プラン診断サービス 要件定義書

**バージョン:** 0.1（MVP〜初期拡張対象）  
**対象フェーズ:** Day0〜180日

---

## 1. プロダクトビジョンと設計思想

### 1.1 一言で言うと

> **「今あなたは変えるべきか、その理由と根拠を返す意思決定エンジン」**

最安プランを羅列するサービスではない。ユーザーが抱える「変えたいけど面倒」「安くなるか不安」「家族割が崩れると怖い」という具体的な迷いに対し、条件付きの判定と根拠を返すことがプロダクトの本質。

### 1.2 解決する問題の構造

| ユーザーが感じていること | 既存サービスの限界 | 本サービスが埋める穴 |
|---|---|---|
| 変えるべきかわからない | 最安順に並べるだけ | 「今変えるべきか」を3択で断言する |
| 比較表が複雑すぎる | 項目が多すぎて読めない | 7〜10問の質問で条件を絞り込み、判定理由を文章で返す |
| 家族割・残債が怖い | スイッチングコストを無視 | 摩擦コストを判定に組み込み、「変えない方がよい」も返せる |
| 本当に得かわからない | ポイントと現金を混在表示 | 現金支出ベース と ポイント込み実質 を分離表示 |
| 情報が古くないか不安 | 更新日不明 | 各プランに更新日・根拠URLを必ず付与 |
| 広告優先で中立でない | スポンサー順位と編集順位が混在 | 編集スコアと広告案件を画面上で分離 |

### 1.3 競合ポジショニング

```
           高い「判断の解像度」
                 ▲
                 │
本サービス ●    │
                 │
  モバプラ ●    │    ● マネーフォワード
─────────────────┼─────────────────→ 高い「網羅性」
  NUROモバイル  │      ● 価格.com
  LINEMO診断 ●  │
                 │
  ぴたスマ ●   │（人手サポート軸）
                 ▼
           低い「判断の解像度」
```

価格.comの比較網羅性とは競合しない。マネーフォワードの「回収期間表示」をさらに一歩進め、「乗換摩擦・不安の可視化・変えない判断」まで含んだ判定を出す領域で戦う。

---

## 2. ユーザー定義

### 2.1 ターゲットペルソナ（3類型）

**ペルソナA：放置系ヘビーユーザー（最重要）**
- 年齢：30〜45歳
- 状況：大手キャリアで月9,000〜12,000円払っているが「なんとなく」で放置
- 心理：「調べるのが面倒」「手続きが不安」「家族に巻き込みたくない」
- 行動：TikTokやYouTubeで「格安SIM どうなの」を何度か見たことがある
- このサービスでの期待：「診断したら5分で答えが出て、変えるかどうかだけわかる」

**ペルソナB：家族契約縛り型（ボリューム大）**
- 年齢：40〜55歳
- 状況：家族4人で大手キャリア、家族割が崩れることを恐れている
- 心理：「世帯で一番高い契約者なのでまず自分だけ変えたい、でも家族割が…」
- 行動：価格.comを見たことがあるが、条件が多すぎて離脱した
- このサービスでの期待：「家族割崩れを加味したうえでの判定をしてほしい」

**ペルソナC：格安SIM検討中だが不安型**
- 年齢：20〜35歳
- 状況：友達が格安SIMに乗り換えたのを見て気になっている
- 心理：「つながりにくくなるのが怖い」「電話番号どうなるの」「店がないと不安」
- 行動：Xで「MVNO 評判」「ahamo 速度」などを検索したことがある
- このサービスでの期待：「私の使い方で格安SIMにして大丈夫かをはっきり言ってほしい」

### 2.2 スコープ外ユーザー（初期）
- 法人契約の最適化を求めているユーザー
- 端末購入の意思決定を求めているユーザー
- 海外ローミング料金の比較を求めているユーザー

---

## 3. 機能要件

### 3.1 診断フロー（コア機能）

#### 質問設計（7〜10問）

| 質問番号 | 質問内容 | 入力形式 | 内部マッピング |
|---|---|---|---|
| Q1 | 今のキャリアとプランは？ | 選択 + 自由入力 | `current_carrier`, `current_plan` |
| Q2 | 月の請求額（おおよそ）は？ | スライダー（1,000円単位） | `current_monthly_fee_yen` |
| Q3 | 月に使うデータ量は？ | 選択（3GB未満 / 3〜10 / 10〜30 / 30GB超 / わからない） | `data_usage_gb` |
| Q4 | 通話の頻度は？ | 選択（ほぼしない / 月数回 / 週数回 / 毎日） | `call_frequency` |
| Q5 | 家族と同じキャリアで契約している？ | 選択（いる・何人 / いない） | `family_lines_count` |
| Q6 | 今の端末の支払いは終わっている？ | 選択（完済 / 支払い中・残何ヶ月 / わからない） | `device_installment_remaining_months` |
| Q7 | 店舗サポートはどれくらい重要？ | 4段階スライダー | `store_support_priority` |
| Q8 | 通信速度・品質への不安は？ | 4段階スライダー | `quality_sensitivity` |
| Q9 | ポイント経済圏はどれを使っている？ | チェックボックス複数選択（dポイント / au / PayPay / 楽天 / なし） | `point_ecosystems[]` |
| Q10 | 乗り換えの手続きをどれくらいやれる？ | 3択（自分でできる / 不安だけどやれる / 無理） | `migration_tolerance` |

**設計ルール：**
- Q1〜Q3は必須、Q4〜Q10はデフォルト値を持ち「わからない」で進めても動作する
- Q5で家族ありの場合、Q5-aとして「家族全員変える可能性は？」を追加分岐
- 質問の途中経過をCookieに保存し、離脱後の再開を可能にする
- 「この質問が多すぎる」と感じたユーザー向けにQ1〜Q3の3問ショートカット版を用意

#### 診断結果の分類（必須出力）

```
判定カテゴリ（3択）：
  A: 今すぐ変えるべき
  B: 次の請求タイミングで変えるべき（端末残債完済後、キャンペーン終了後等）
  C: 今は変えない方がよい

推奨アクション（4択）：
  1: 現状維持
  2: 同一キャリア内でのプラン変更
  3: オンライン専用ブランド・サブブランドへの移行
  4: MVNOへの移行
```

### 3.2 推薦エンジン仕様

#### スコアリングモデル

各プランに対し、以下の軸でスコアを算出する。**金額スコアと適合スコアを必ず分離して保持**すること（混在禁止）。

```
total_score =
  Σ(axis_score[i] × weight[i])

軸定義：
  axis[0]: 月額削減余地スコア     weight: 0.30
  axis[1]: 価値適合スコア         weight: 0.25
    (データ容量・通話・品質・サポートの一致度)
  axis[2]: 乗換摩擦スコア(逆転)   weight: 0.20
    (残債・家族割崩れ・eSIM・手続難易度)
  axis[3]: 継続安定性スコア       weight: 0.10
    (プランの改定リスク・実績)
  axis[4]: 経済圏一致スコア       weight: 0.10
    (ユーザーのポイント選好との一致)
  axis[5]: 心理特性適合スコア     weight: 0.05
    (migration_toleranceとstore_support_priorityとの一致)
```

#### 節約額算出ルール

```
// 現金支出ベース（優先表示）
cash_saving_per_month = current_monthly_fee - recommended_cash_base_fee
// 割引適用条件を全て明示した上での値

// ポイント込み実質（補助表示・条件明記）
effective_saving_per_month = cash_saving_per_month + point_value_per_month
// point_value_per_monthは「ユーザーが実際に使う前提で」算出

// 回収月数（端末残債がある場合）
breakeven_months = device_installment_remaining_months
// 残債ゼロになるまで「乗り換えると損する可能性」を表示

// 年間削減額
annual_saving = cash_saving_per_month × 12
```

**禁止事項：** ポイントを月額と同列に加算した「実質○○円」を唯一の比較軸にすること。

#### 判定文の生成ルール

判定文は**テンプレートベースのルール出力**とする（初期はLLM不使用、v2以降でLLM補助を検討）。

```
// 判定Aの例
「月{cash_saving}円（年間{annual_saving}円）の節約余地があります。
 {recommended_plan}は{data_match_reason}の点でも現在の使い方に合っています。
 ただし{caveat_if_any}のご注意を確認してください。」

// 判定Cの例
「{saving_amount}円の節約余地はありますが、現在の{discount_name}を失うと
 逆に月{loss_amount}円の増加になる可能性があります。
 {condition_to_switch}が解消されたタイミングで再診断をおすすめします。」
```

### 3.3 結果表示仕様

#### 結果画面の表示順序

```
1. ユーザータイプ名（例：「堅実節約派」）
   └ サブコピー（例：「慎重に、でも確実に節約できるタイプです」）

2. 判定バナー（大）
   ├ 判定カテゴリ（今すぐ / 次のタイミング / 今は維持）
   └ 判定理由の一文

3. 推奨プランカード（最大3件）
   ├ プラン名 / キャリア名
   ├ 月額（現金支出ベース） ← 大きく表示
   ├ 月額（ポイント込み実質） ← 小さく・条件付きで表示
   ├ 削減額（月 / 年）
   ├ 回収月数（残債ある場合）
   ├ 適合ポイント（箇条書き3点）
   ├ 注意点（箇条書き2点）
   ├ 根拠URL（公式ページリンク）
   ├ データ更新日
   └ 申込み導線（※広告案件は「PR」バッジを付与・編集スコアと分離）

4. 判定の根拠詳細（展開式アコーディオン）
   ├ 各軸のスコア内訳
   └ 計算に使った前提条件の全表示

5. 乗り換え時の注意点リスト
   └ MNP予約番号の取り方、eSIM手順、家族割解除手順 等

6. 共有ボタン
   └ OGP画像（判定結果カード形式）を自動生成

7. フィードバック収集
   └ 「この判定は参考になりましたか？」（5段階）＋ 任意コメント
```

#### 表示の禁止事項

- 「最安」「絶対」「必ず」「おすすめNo.1」などを算定条件の明示なしに使うこと
- ポイント還元を現金節約と同じ大きさで並べること
- 広告案件を編集スコア上位であるかのように見せること

### 3.4 管理・更新機能

#### 料金DB管理画面（内部ツール、初期はシンプルに）

| 機能 | 優先度 | 詳細 |
|---|---|---|
| プラン一覧・編集 | 必須 | JSON直編集 or フォームUI |
| 差分プレビュー | 必須 | 変更前後の差分をGitHubのdiff形式で表示 |
| 承認・公開フロー | 必須 | ドラフト→レビュー→公開の3ステータス |
| 更新履歴ログ | 必須 | 誰がいつ何を変えたかを記録 |
| 異常値アラート | 推奨 | 前日比30%超の料金変動を自動フラグ |
| スクレイピングジョブ実行 | 推奨 | 手動トリガーまたはスケジュール表示 |
| 根拠URLの死活確認 | 推奨 | 登録URLのHTTPステータスを週次確認 |

---

## 4. データモデル定義

### 4.1 プランマスター（PlanRecord）

```typescript
interface PlanRecord {
  // 識別子
  id: string;                    // "docomo_mini_2026_v1"
  carrier_id: string;            // "docomo"
  brand_id: string;              // "docomo_main"
  plan_name: string;             // "eximo mini"
  plan_type: "MNO" | "sub_brand" | "online_only" | "MVNO";

  // 基本料金（税込・円）
  billing: {
    base_fee_yen: number;        // 基本月額（割引なし）
    tiers: PriceTier[];          // 段階料金がある場合
    call_option: CallOption[];   // 通話オプション
    initial_fee_yen: number;     // 事務手数料等
    cancellation_fee_yen: number;
  };

  // 割引条件（必須：各割引を独立したオブジェクトで管理）
  discounts: Discount[];
  /*
    Discount: {
      name: string;              // "家族割プラス"
      monthly_discount_yen: number;
      condition: string;         // 人間が読める条件説明
      condition_structured: {    // 機械処理用
        min_lines?: number;
        requires_fixed_line?: boolean;
        requires_card?: string;
        requires_electricity?: boolean;
        age_max?: number;
      };
      is_permanent: boolean;     // 期間限定か恒久か
      expires_at?: string;       // ISO8601
    }
  */

  // ポイント経済圏（現金支出とは必ず分離）
  point_economy: {
    point_type: string;          // "d_point" | "au_point" | "paypay" | "rakuten"
    monthly_point_estimate: number; // 月間ポイント推定値（円換算）
    condition: string;           // ポイント発生条件（必ず明示）
  } | null;

  // 通信条件
  data: {
    monthly_gb: number | "unlimited";
    throttle_speed_kbps: number; // 速度制限後の速度
    tethering_gb: number | "same" | "not_supported";
  };

  // 制約条件
  constraints: {
    online_only: boolean;
    store_support: "full" | "limited" | "none";
    esim_available: boolean;
    sim_only_available: boolean;
    age_condition?: { min?: number; max?: number };
    payment_methods: string[];
  };

  // 端末条件
  device: {
    bundled_sales: boolean;
    installment_available: boolean;
  };

  // 証拠情報（必須）
  evidence: {
    source_url: string;          // 公式料金ページURL
    fetched_at: string;          // ISO8601（スクレイピング取得日時）
    published_at?: string;       // キャリアが明示している改定日
    reviewed_by?: string;        // 人手レビュー担当者
    reviewed_at?: string;
    snapshot_path: string;       // S3/GCSのHTMLスナップショットパス
    notes_hash: string;          // 取得HTMLの sha256（改ざん検知用）
  };

  // 内部管理
  status: "draft" | "review" | "published" | "archived";
  created_at: string;
  updated_at: string;
}
```

### 4.2 診断セッション（DiagnosisSession）

```typescript
interface DiagnosisSession {
  session_id: string;            // UUID（匿名・Cookie保存）
  answers: DiagnosisAnswers;
  result: DiagnosisResult;
  created_at: string;
  feedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    submitted_at: string;
  };
}

interface DiagnosisAnswers {
  current_carrier?: string;
  current_monthly_fee_yen?: number;
  data_usage_gb?: number | "unknown";
  call_frequency: "none" | "few_monthly" | "few_weekly" | "daily";
  family_lines_count: number;    // 0 = 家族なし
  device_installment_remaining_months: number; // 0 = 完済
  store_support_priority: 1 | 2 | 3 | 4;
  quality_sensitivity: 1 | 2 | 3 | 4;
  point_ecosystems: string[];
  migration_tolerance: "self" | "support_needed" | "impossible";
}

interface DiagnosisResult {
  verdict: "switch_now" | "switch_next_cycle" | "keep_current";
  recommended_action: 1 | 2 | 3 | 4;
  persona_type: string;
  persona_label: string;
  verdict_reason: string;        // 判定理由の文章
  recommendations: PlanRecommendation[];
  generated_at: string;
  plan_data_freshness: string;   // 使用した料金データの最終更新日
}
```

---

## 5. データ取得パイプライン要件

### 5.1 パイプライン全体像

```
[Layer 1: Discovery]
  公式サイト sitemap.xml / robots.txt / 手動登録リスト
  → 対象URLカタログの維持・更新

[Layer 2: Fetch]
  軽量HTTPフェッチ（ETag / Last-Modified 条件付きGET）
  → 304 Not Modified → スキップ
  → 200 OK → Layer 3へ
  → JSレンダリング必要フラグ → Playwright/Crawlee

[Layer 3: Extract]
  抽出優先順位：
    1st: JSON-LD (schema.org/Offer)
    2nd: 構造化表（HTMLテーブル）
    3rd: CSSセレクタ / XPath
    4th: LLM補助抽出（フォールバック・コスト高のため限定）

[Layer 4: Normalize]
  PlanRecord スキーマへの正規化
  Pydantic バリデーション
  → 失敗 → アラート + 手動確認キュー

[Layer 5: Diff]
  前回スナップショットとの差分計算（3種）：
    - Raw diff（HTML差分）
    - Semantic diff（正規化後フィールド差分）
    - Bill diff（代表ペルソナでの請求額再計算）

[Layer 6: Anomaly Detection]
  料金変動 > 30%  → 即時アラート（Slack/メール）
  NULL / 空値     → ブロック
  日付矛盾        → ブロック
  Great Expectationsによる品質チェック

[Layer 7: Human Review Gate]
  変更あり → 管理画面の差分キューへ
  レビュアーが承認 → Layer 8へ
  レビュアーが却下 → 差分を学習データとして保存

[Layer 8: Publish]
  公開DBへ反映
  更新履歴ログ記録
  Slack/メール通知
```

### 5.2 スクレイピング実装仕様

#### ツール選定と役割分担

| ツール | 役割 | 対象ページ | 設定値 |
|---|---|---|---|
| **Scrapy** | メインクローラ、一覧・定型HTML | 料金一覧ページ、テキストベースページ | `AUTOTHROTTLE_ENABLED = True` / `AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0` / `DOWNLOAD_DELAY = 3.0` / `HTTPCACHE_ENABLED = True` |
| **scrapy-playwright** | JSレンダリング補完 | 動的コンテンツ、シミュレーター周辺 | `PLAYWRIGHT_LAUNCH_OPTIONS = {"headless": True}` / 限定ページのみ使用 |
| **Crawlee (Node.js)** | TypeScript系サブシステム、代替 | TS実装を優先する場合 | `maxRequestsPerCrawl` を保守的に設定 |
| **changedetection.io** | 差分監視・アラート | 料金改定通知、ニュースルーム | JSON diff / HTML diff / 通知Webhook設定 |
| **httpx + asyncio** | 軽量条件付きGET | ETag/Last-Modifiedを使った差分確認 | timeout=20, follow_redirects=True |

#### Scrapy 設定（実装基準値）

```python
# settings.py
BOT_NAME = "plan_monitor"

# レート制御（最重要：相手サーバーへの配慮）
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 3.0      # 初期待機秒数
AUTOTHROTTLE_MAX_DELAY = 60.0       # 最大待機秒数
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0  # 同時接続数の目標（1.0 = 1本）
DOWNLOAD_DELAY = 3.0                # AutoThrottleの下限

CONCURRENT_REQUESTS = 4             # 全体の同時リクエスト数
CONCURRENT_REQUESTS_PER_DOMAIN = 1  # 1ドメインあたり1本

# キャッシュ（同一URLへの再取得を防止）
HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 86400   # 24時間
HTTPCACHE_POLICY = "scrapy.extensions.httpcache.RFC2616Policy"
# → ETag/Last-Modified を自動で扱う

# User-Agent（正直に名乗る）
USER_AGENT = "PlanMonitorBot/1.0 (compatible; research crawler; contact: your@email.com)"

# robots.txt 尊重
ROBOTSTXT_OBEY = True

# ログ
LOG_LEVEL = "INFO"
FEED_EXPORT_ENCODING = "utf-8"
```

#### 条件付きGET実装（httpx版）

```python
import hashlib
import httpx
from pydantic import BaseModel, HttpUrl
from typing import Optional

class FetchState(BaseModel):
    url: HttpUrl
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    last_notes_hash: Optional[str] = None

async def conditional_fetch(state: FetchState) -> tuple[bool, str, FetchState]:
    """
    Returns: (changed: bool, html: str, next_state: FetchState)
    """
    headers = {"User-Agent": "PlanMonitorBot/1.0 (contact: your@email.com)"}
    if state.etag:
        headers["If-None-Match"] = state.etag
    if state.last_modified:
        headers["If-Modified-Since"] = state.last_modified

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        res = await client.get(str(state.url), headers=headers)

    if res.status_code == 304:
        return False, "", state  # 変更なし

    if res.status_code != 200:
        raise RuntimeError(f"Unexpected status {res.status_code} for {state.url}")

    html = res.text
    new_hash = hashlib.sha256(html.encode("utf-8")).hexdigest()

    # ハッシュが同じなら内容変更なし（ETag非対応サイト向けフォールバック）
    if new_hash == state.last_notes_hash:
        return False, html, state

    next_state = FetchState(
        url=state.url,
        etag=res.headers.get("etag"),
        last_modified=res.headers.get("last-modified"),
        last_notes_hash=new_hash,
    )
    return True, html, next_state
```

### 5.3 抽出の正確性を守るためのルール

#### セレクタ崩れ検知（必須）

```python
from dataclasses import dataclass

@dataclass
class ExtractionContract:
    """各サイトの抽出契約。セレクタが壊れたら即アラート"""
    carrier_id: str
    required_fields: list[str]     # 抽出後に必ず値があるべきフィールド
    plausible_fee_range: tuple[int, int]  # (min_yen, max_yen) 妥当な料金範囲
    selector_health_check_url: str  # 契約確認用URL

EXTRACTION_CONTRACTS = {
    "ahamo": ExtractionContract(
        carrier_id="ahamo",
        required_fields=["plan_name", "billing.base_fee_yen", "data.monthly_gb"],
        plausible_fee_range=(1000, 5000),
        selector_health_check_url="https://ahamo.com/ahamo/plans/",
    ),
    # 各キャリア分を定義...
}

def validate_extraction(record: dict, contract: ExtractionContract) -> list[str]:
    """抽出結果の健全性チェック。エラーリストを返す"""
    errors = []
    for field in contract.required_fields:
        keys = field.split(".")
        val = record
        for k in keys:
            val = val.get(k) if isinstance(val, dict) else None
        if val is None:
            errors.append(f"Missing required field: {field}")

    fee = record.get("billing", {}).get("base_fee_yen")
    if fee is not None:
        lo, hi = contract.plausible_fee_range
        if not (lo <= fee <= hi):
            errors.append(f"Fee {fee} out of plausible range [{lo}, {hi}]")
    return errors
```

#### 異常検知の閾値定義

| チェック項目 | 条件 | アクション |
|---|---|---|
| 料金変動 | 前回比 ±30% 超 | 即時Slackアラート + 公開ブロック |
| 必須フィールドNULL | `billing.base_fee_yen` が空 | 公開ブロック + キュー追加 |
| 更新日矛盾 | `expires_at` < `starts_at` | 公開ブロック |
| 代表ペルソナ請求額乖離 | 前日比 ±20% 超 | アラート |
| 根拠URLの死活 | HTTP 4xx/5xx | 週次確認 + 警告フラグ |
| スナップショットサイズ異常 | 前回比 ±50% 超（バイト数） | 警告フラグ（サイトリニューアル検知） |

#### Great Expectations によるデータ品質定義（中期実装）

```python
# プランマスターへの期待値定義例
import great_expectations as ge

def build_plan_expectations(df):
    dataset = ge.from_pandas(df)

    # 必須値
    dataset.expect_column_values_to_not_be_null("billing_base_fee_yen")
    dataset.expect_column_values_to_not_be_null("source_url")
    dataset.expect_column_values_to_not_be_null("fetched_at")

    # 値の範囲
    dataset.expect_column_values_to_be_between(
        "billing_base_fee_yen", min_value=0, max_value=30000
    )
    dataset.expect_column_values_to_be_in_set(
        "plan_type", ["MNO", "sub_brand", "online_only", "MVNO"]
    )
    dataset.expect_column_values_to_be_in_set(
        "status", ["draft", "review", "published", "archived"]
    )

    # 日付の論理整合性
    dataset.expect_column_pair_values_A_to_be_greater_than_B(
        "fetched_at", "published_at", or_equal=True, ignore_row_if="either_value_is_missing"
    )

    return dataset.validate()
```

### 5.4 ブロック回避の方針（倫理的範囲）

**やること（正当な低負荷アクセスの範囲内）：**
- `robots.txt` を毎回確認し、`Disallow` されているパスは取得しない
- `User-Agent` に連絡先を明記する
- `DOWNLOAD_DELAY` を最低3秒以上確保する
- `ETag` / `Last-Modified` を活用し、不要なフル取得を避ける
- 1ドメインあたりの同時接続を1に制限する
- 取得失敗時は指数バックオフ（3秒 → 6秒 → 12秒）
- 1サイトの月次取得回数の上限を設定する（目安：1日1回 × 対象ページ数）

**やらないこと（明確な禁止事項）：**
- CAPTCHAの自動解除
- 認証・会員領域への不正アクセス
- アクセス制御やbot対策の意図的な迂回
- 同一IPからの連続大量アクセス
- `robots.txt` の `Disallow` パスへのアクセス
- 取得した文言・画像の大量転載（事実データの正規化内部利用は別）

### 5.5 スナップショット保存要件

```
保存対象：
  - 取得HTMLフルボディ（gzip圧縮）
  - スクリーンショット（PNG、1280x720）← JSレンダリングページのみ
  - 抽出後のPlanRecord JSON
  - 差分サマリ JSON

保存先：
  - MVP期：GitHub Actions artifactsまたはS3互換ストレージ
  - 中期以降：GCS or S3、ライフサイクルポリシーで90日保持

ファイル命名規則：
  {carrier_id}_{plan_id}_{YYYYMMDD_HHMMSS}.{ext}
  例: docomo_eximo_mini_20260607_020000.html.gz
```

---

## 6. 技術アーキテクチャ

### 6.1 MVP フェーズ（〜30日）

```
[フロントエンド]
  Next.js 14 (App Router) + TypeScript
  └ 診断フロー・結果画面・共有カード生成
  └ ホスティング: Vercel Hobby（無料）

[データ]
  静的JSON（public/data/plans.json）+ Gitで管理
  └ 更新：手動編集 → Git commit → Vercel自動デプロイ
  └ スキーマ検証：Zod（ビルド時）

[定期取得]
  GitHub Actions（`schedule: cron`）
  └ 週1回、対象キャリアのHTTPフェッチ + diff生成
  └ 差分をPull Requestとして自動作成 → 人手レビューしてmerge

[解析]
  Vercel Analytics（無料）または PostHog（無料枠）
```

### 6.2 中期フェーズ（90〜180日）

```
[フロントエンド] ← 変更なし（Vercel Pro移行を検討）

[バックエンド]
  Next.js API Routes または Hono (Edge Runtime)
  └ 診断セッション保存
  └ フィードバック受信
  └ 管理画面API

[データ]
  Supabase（PostgreSQL）
  ├ plans テーブル（PlanRecord）
  ├ sessions テーブル（DiagnosisSession）
  ├ fetch_states テーブル（ETag/Last-Modified管理）
  └ audit_log テーブル（更新履歴）

[スクレイピング基盤]
  Python（Scrapy + scrapy-playwright）
  └ 実行環境: GitHub Actions（無料枠）or Railway（小額）
  └ スナップショット保存: Cloudflare R2（Freeで10GB/月）
  └ 差分検出: 自作差分モジュール + changedetection.io（補助）
  └ スキーマ検証: Pydantic v2

[監視・通知]
  Slack Webhook（差分・アラート通知）
  GitHub Actions の失敗通知
```

### 6.3 本格化フェーズ（180日〜）の検討候補

```
[オーケストレーション]
  Apache Airflow（GCP Composer or self-hosted）
  └ DAG: 収集 → 正規化 → 検証 → 通知 → 承認待ち → 公開

[データ品質]
  Great Expectations（品質テストスイート）

[LLM補助抽出（限定用途）]
  Firecrawl API（構造化抽出・非定型ページのフォールバック）
  Anthropic API + instructor（JSON抽出プロンプト）
  └ 用途: セレクタが壊れたときのフォールバックのみ
  └ コスト管理: 月$50上限でアラート設定
```

### 6.4 LLM補助抽出の実用性評価

| ツール | 強み | 弱み | 推奨用途 | コスト目安 |
|---|---|---|---|---|
| **Firecrawl** | 非構造化HTMLをMarkdown/JSONに変換しやすい・APIが簡単 | 抽出の再現性が不安定・料金条件の細かい注記解釈は苦手 | 新規サイトのプロトタイプ抽出・フォールバック | $16/月〜 |
| **Jina AI Reader** | URLを渡すだけでMarkdown変換・無料枠あり | 複雑な表形式や条件付き割引の構造化は弱い | 調査目的のクイックスキャン | 無料〜 |
| **instructor + Claude** | 型付きJSON出力を強制できる・プロンプト精度が高い | API コストが積み上がる・rate limit | セレクタ崩れ検知後の緊急フォールバック | $0.003/1K tokens |

**重要方針：LLMは本番の唯一ソースにしない。** セレクタベース抽出が正常な間はLLMを使わない。LLMを使った場合は必ず人手レビューゲートを通すこと。

---

## 7. 新規サービス・プラン改定の検知設計

### 7.1 監視ソースと優先度

| 優先度 | ソース | 検知対象 | 自動化方法 | 精度 |
|---|---|---|---|---|
| **最高** | 公式ページ差分（changedetection.io） | 料金改定・新プラン | 毎日差分確認 + Webhook | 高（公式一次ソース） |
| **最高** | PR TIMES RSS | 新ブランド・新プラン発表 | `https://prtimes.jp/rss/` キーワードフィルタ | 高（公式性高い） |
| **高** | Google Alerts | Web言及全般 | メール → Gmail Filterで自動ラベル | 中（ノイズ多め） |
| **中** | JPRS WHOIS | 新ブランドドメイン登録 | キーワード候補リストとの突合 | 中 |
| **中** | J-PlatPat 商標検索 | 新ブランド名・サービス名 | 週次検索スクリプト | 中 |
| **中** | e-Gov / 総務省関連 | 制度変更・新規事業者参入届出 | RSSまたは週次確認 | 低（ラグがある） |
| **補助** | X（公式アカウント） | ティザー・先行告知 | Twitter API v2（Bearer Token） | 高（速い）/ 誤検知多 |
| **補助** | YouTube Data API | キャリア公式動画の新着 | ChannelId指定での新着監視 | 中 |

### 7.2 シグナル判定ロジック

```python
SIGNAL_WEIGHTS = {
    "official_page_diff": 1.0,     # 公式ページ差分
    "pr_times_release": 0.9,       # プレスリリース
    "google_alerts": 0.5,          # ニュースアラート
    "jprs_whois": 0.4,             # ドメイン登録
    "j_platpat_trademark": 0.4,    # 商標登録
    "x_official_account": 0.3,     # X公式ツイート
}

NEGATIVE_KEYWORDS = [
    "解約", "終了", "障害", "採用", "インターン",
    "決算", "株主", "不祥事"
]

def classify_signal(signals: list[Signal]) -> str:
    # ネガティブキーワードを除外
    filtered = [s for s in signals if not any(kw in s.text for kw in NEGATIVE_KEYWORDS)]

    total_weight = sum(SIGNAL_WEIGHTS.get(s.source, 0) for s in filtered)

    if total_weight >= 1.5:
        return "high_confidence"   # 自動キューへ
    elif total_weight >= 0.7:
        return "needs_review"      # 人手確認へ
    else:
        return "noise"             # 学習データへ
```

**公開判断のルール：** シグナルがいくら高確度でも、**公開前は必ず人手承認**を通す。自動公開は行わない。

---

## 8. 非機能要件

### 8.1 パフォーマンス

| 指標 | 目標値 | 計測方法 |
|---|---|---|
| 診断完了までのページ読み込み | FCP < 1.5秒 | Vercel Web Analytics |
| 結果生成時間（サーバーサイド計算） | < 200ms | API Routes レスポンスタイム |
| Lighthouse Performance Score | > 85 | CI/CDで計測 |
| 診断フロー全体の完了時間（ユーザー操作含む） | 3〜5分以内に収まる設計 | ユーザーテスト計測 |

### 8.2 可用性・信頼性

| 指標 | 目標値 | 備考 |
|---|---|---|
| サービス稼働率 | 99.5%以上 | Vercelのインフラで担保 |
| 料金データの鮮度 | 最新プランのデータ更新遅延 < 7日 | MVP期は週次手動更新 |
| 異常データの公開防止 | 異常値検知後30分以内に公開停止 | アラート設計で担保 |
| スクレイピング失敗時のフォールバック | 前回スナップショットを保持・差分なしとして扱う | 人手確認キューへ |

### 8.3 セキュリティ

- 個人情報（氏名・電話番号・請求書）は MVP フェーズでは収集しない
- 診断セッションは匿名UUID、サーバー側での個人紐付けは行わない
- Cookie は SameSite=Strict、Secure フラグを設定
- CSP（Content Security Policy）ヘッダーを設定
- Supabase RLS（Row Level Security）で管理画面データを保護
- スクレイピングサーバーのIPアドレスはセキュリティグループで制限
- APIシークレット・DBパスワードは環境変数管理（Vercel Environment Variables / GitHub Secrets）

### 8.4 スケーラビリティ設計方針

- 診断ロジックはステートレス（セッションDBに依存しない設計）
- 料金データはCDNキャッシュ可能な静的配信を基本とする
- スクレイピングジョブはキュー駆動でスケールアウト可能に設計
- DB接続はコネクションプール（Supabase の pgbouncer）を使用

---

## 9. 法務・コンプライアンス要件

### 9.1 景品表示法（必須対応）

| 表示パターン | 対応要件 |
|---|---|
| 「○○円節約できます」 | 算定条件（適用割引・期間・対象プラン）を同じ画面内に表示 |
| 「今すぐ変えるべき」 | 判定の前提条件（使用データ量・家族割有無等）を折りたたみ式でも表示 |
| 「最安」という表現 | 使用禁止（または「当サービス掲載プランの中での比較」と明記） |
| 推奨プランの順位 | 編集スコアのロジック概要を公開し、広告案件との分離を明示 |

### 9.2 アフィリエイト・広告表示規制

- アフィリエイトリンクを含む推奨プランには「広告」または「PR」バッジを付与
- 編集スコアによる推奨順位と、広告案件の順位を同一のものにしない
- ASP案件DBと編集DBを物理的に分離し、混入を防ぐ
- 広告案件の採用条件・除外条件をプライバシーポリシーとは別に「透明性ポリシー」として公開

### 9.3 個人情報保護法・電気通信事業法

- プライバシーポリシーを本番公開前に整備（利用目的・保存期間・開示対応窓口）
- 外部送信規律（改正電気通信事業法）に基づき、解析タグの送信先・目的・送信情報を通知
- Cookieはセッション目的の最小限に留め、バナーで説明
- 将来的に請求書アップロード機能を追加する場合は、個人情報の取扱方針を再整備してから実装

### 9.4 スクレイピングの法務チェックリスト

本番稼働前に対象キャリア全社について以下を確認する：

```
□ robots.txt を確認し、Disallow パスを取得対象から除外した
□ 各社の利用規約を確認し、「転載禁止」「複製禁止」条件の範囲を把握した
□ 取得対象が認証・会員領域でないことを確認した
□ 取得した文言・画像を大量転載しない設計になっている
□ 「限定提供データ」に該当する可能性のあるデータを取得していない
□ 取得頻度が常識的な範囲（1日1回程度）になっている
□ 問題発生時の連絡先（User-Agentに記載）を用意した
```

---

## 10. KPI・計測設計

### 10.1 フェーズ別 KPI ツリー

```
[北極星指標]
  診断完了数（週次）

[中間指標]
  ├ 診断開始率（訪問者 → 診断開始）
  ├ 診断完了率（診断開始 → 結果表示）  目標: 45%以上
  ├ 結果納得率（フィードバック 4〜5 の比率）  目標: 60%以上
  ├ 推奨クリック率（結果 → キャリア公式）  目標: 15%以上
  └ 結果共有率（シェアボタン押下）  目標: 3%以上

[データ品質指標（内部KPI）]
  ├ parse_success_rate（抽出成功率）  目標: 95%以上
  ├ schema_pass_rate（Pydantic検証通過率）  目標: 99%以上
  ├ bill_regression_failures（代表ペルソナ請求額の前日差異件数）  目標: 0
  ├ human_review_queue_age（キューの最大滞留時間）  目標: 24時間以内
  └ time_to_publish（シグナル検知 → 公開反映）  目標: 48時間以内
```

### 10.2 A/Bテスト計画（MVP後）

| テスト | バリアントA | バリアントB | 測定KPI |
|---|---|---|---|
| CTA表現 | 「節約額を見る」 | 「今変えるべきか診断する」 | 診断開始率 |
| 判定バナー | 「今すぐ変えるべき」強調 | 「変えない方がよい場合もある」も前面 | 結果納得率 |
| 推奨数 | 1件のみ表示 | 3件表示 | 推奨クリック率 |
| 節約額訴求 | 月額差分（例：月2,000円節約） | 年間差分（例：年24,000円節約） | 診断完了率 |
| 質問数 | 5問（短縮版） | 9問（フル版） | 診断完了率 × 納得率 |

---

## 11. ローンチ計画とMVPスコープ

### 11.1 対象プラン（初期12〜20件）

| カテゴリ | 対象ブランド | 優先度 |
|---|---|---|
| 大手MNO | docomo (eximo, eximo mini), au (使い放題MAX), SoftBank (メリハリ無制限+) | 必須 |
| オンライン専用 | ahamo, povo 2.0, LINEMO | 必須 |
| サブブランド | UQ mobile, Y!mobile | 必須 |
| 楽天 | 楽天モバイル（UN-LIMIT VII） | 必須 |
| 代表MVNO | IIJmio, mineo, NURO Mobile | 推奨 |

### 11.2 機能スコープ（MVP vs 将来）

| 機能 | MVP（30日） | 中期（90日） | 長期（180日〜） |
|---|---|---|---|
| 診断フロー（7〜10問） | ✅ | ✅ | ✅ |
| 判定結果（3択） | ✅ | ✅ | ✅ |
| 推奨プランカード（3件） | ✅ | ✅ | ✅ |
| 現金支出 / ポイント分離表示 | ✅ | ✅ | ✅ |
| 根拠URL・更新日表示 | ✅ | ✅ | ✅ |
| 結果共有（OGP画像） | ✅ | ✅ | ✅ |
| フィードバック収集 | ✅ | ✅ | ✅ |
| データ更新（手動） | ✅ | - | - |
| スクレイピング自動化 | - | ✅ | ✅ |
| 差分監視・人手承認ゲート | - | ✅ | ✅ |
| 更新履歴ページ（公開） | - | ✅ | ✅ |
| 新サービス検知パイプライン | - | ✅ | ✅ |
| 世帯・家族同時診断 | - | - | ✅ |
| 端末残債精密計算 | - | - | ✅ |
| 事業者提携フィード | - | - | ✅ |
| Great Expectations品質監査 | - | - | ✅ |

### 11.3 週次コスト概算（MVP期）

| 項目 | 候補 | 月額 | 備考 |
|---|---|---|---|
| ホスティング | Vercel Hobby | $0 | Free forever |
| DB | Supabase Free | $0 | 500MB・50,000 MAU以内 |
| スナップショット保存 | Cloudflare R2 | $0 | 10GB/月まで無料 |
| 定期実行 | GitHub Actions | $0 | public repoは無制限 |
| 差分監視 | changedetection.io (self-host) | $0 | Docker自前運用 |
| 解析 | PostHog Cloud | $0 | 月100万イベントまで無料 |
| **合計** | | **$0〜$10/月** | ドメイン・広告費除く |

---

## 12. 未解決事項・今後の判断ポイント

以下は現時点で「意思決定が必要」だが、MVPの前に決まっていなくてよい事項：

| 項目 | 選択肢 | 影響範囲 |
|---|---|---|
| 収益化モデル | アフィリエイト / キャリア提携 / 有料プラン / 広告 | 広告・編集分離設計の細部 |
| チーム体制 | 1名 / 複数 | 人手レビューゲートの運用頻度 |
| 対象プラン数の拡張方針 | 段階拡張 / 最初から20件 | 初期DBの作り込み工数 |
| ユーザー認証の導入時期 | 90日後 / 180日後 / 不要 | セッション設計・個人情報規制対応の深度 |
| LLM補助抽出の採用判断 | Firecrawl / instructor / 不使用 | コスト・精度のトレードオフ |
| スクレイピング基盤の言語 | Python (Scrapy) / TypeScript (Crawlee) | チームのスキルセットによる |

---

## 付記：最重要原則

> プロダクトの競争力は「料金比較ロジックそのもの」ではなく、  
> **「判定の納得感 × 更新の透明性 × 摩擦コストを含めた正直な説明」**  
> の組み合わせにある。この3点を手を抜かずに実装したサービスは、  
> 後発であっても十分に戦える。
