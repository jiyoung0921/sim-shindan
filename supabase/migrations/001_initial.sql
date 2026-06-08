-- ============================================================
-- スマホ料金診断サービス データベーススキーマ
-- ============================================================

-- ─── 拡張機能 ───
create extension if not exists "uuid-ossp";

-- ============================================================
-- plans テーブル（プランマスター）
-- ============================================================
create table plans (
  id                text primary key,
  carrier_id        text not null,
  brand_id          text not null,
  plan_name         text not null,
  plan_type         text not null check (plan_type in ('MNO', 'sub_brand', 'online_only', 'MVNO')),

  -- billing（JSONB で段階料金・通話オプションを保持）
  billing           jsonb not null,
  discounts         jsonb not null default '[]'::jsonb,
  point_economy     jsonb,

  -- data
  data_monthly_gb   text not null,   -- "unlimited" or numeric string
  data_throttle_kbps integer not null,
  data_tethering    text not null,

  -- constraints
  online_only       boolean not null default false,
  store_support     text not null check (store_support in ('full', 'limited', 'none')),
  esim_available    boolean not null default false,
  sim_only_available boolean not null default false,
  payment_methods   text[] not null default '{}',

  -- device
  bundled_sales     boolean not null default false,
  installment_available boolean not null default false,

  -- evidence（ソース証拠）
  source_url        text not null,
  fetched_at        timestamptz not null,
  published_at      date,
  reviewed_by       text,
  reviewed_at       timestamptz,
  snapshot_path     text not null default '',
  notes_hash        text not null default '',

  -- workflow
  status            text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table plans is 'キャリア・MVNOの料金プランマスター。scraper が draft で投入し、人手承認後 published になる。';

-- ─── 変更トリガー ───
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plans_updated_at
  before update on plans
  for each row execute function set_updated_at();

-- ============================================================
-- plan_diffs テーブル（スクレイピング差分キュー）
-- ============================================================
create table plan_diffs (
  id              uuid primary key default uuid_generate_v4(),
  plan_id         text not null,

  -- 変更の種別
  diff_type       text not null check (diff_type in ('new_plan', 'price_change', 'discount_change', 'field_change', 'removed')),
  changed_fields  text[] not null default '{}',

  -- 変更前後のスナップショット
  before_data     jsonb,
  after_data      jsonb not null,

  -- 差分サマリ（Slack通知用）
  summary         text not null,

  -- 異常検知フラグ
  anomaly_flags   jsonb default '[]'::jsonb,
    -- 例: [{"type": "price_jump", "field": "monthly_fee_yen", "before": 2970, "after": 4500, "pct": 51.5}]

  -- 代表ペルソナでの請求額差分
  bill_regression jsonb default '{}'::jsonb,

  -- ワークフロー
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'auto_blocked')),
  reviewed_by     text,
  reviewed_at     timestamptz,
  review_note     text,

  -- スクレイパー情報
  scraped_at      timestamptz not null default now(),
  scraper_version text not null default '1.0.0',

  created_at      timestamptz not null default now()
);

comment on table plan_diffs is 'スクレイピング結果の差分キュー。人手承認後に plans テーブルへ反映される。';

create index plan_diffs_status_idx on plan_diffs(status);
create index plan_diffs_plan_id_idx on plan_diffs(plan_id);
create index plan_diffs_scraped_at_idx on plan_diffs(scraped_at desc);

-- ============================================================
-- fetch_states テーブル（ETag/Last-Modified 管理）
-- ============================================================
create table fetch_states (
  url             text primary key,
  plan_id         text,
  etag            text,
  last_modified   text,
  last_hash       text,
  last_fetched_at timestamptz not null default now(),
  fetch_count     integer not null default 0,
  last_status     integer,
  consecutive_errors integer not null default 0,
  updated_at      timestamptz not null default now()
);

comment on table fetch_states is '各URLの条件付きGET状態管理。ETAGやhashで変更なしを判定して無駄なフル取得を防ぐ。';

-- ============================================================
-- diagnosis_sessions テーブル（診断セッション）
-- ============================================================
create table diagnosis_sessions (
  id              uuid primary key default uuid_generate_v4(),
  session_token   text not null unique,  -- クライアントside のUUID

  -- 回答（匿名）
  answers         jsonb not null,

  -- 結果
  verdict         text check (verdict in ('switch_now', 'switch_next_cycle', 'keep_current')),
  recommended_action integer check (recommended_action between 1 and 4),
  persona_type    text,
  top_plan_id     text,
  cash_saving     integer,

  -- 完了フラグ
  completed       boolean not null default false,
  result_viewed   boolean not null default false,

  -- 計測
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  result_viewed_at timestamptz,

  -- デバイス情報（プライバシー配慮・UAのみ）
  user_agent_hint text,

  created_at      timestamptz not null default now()
);

comment on table diagnosis_sessions is '診断セッション。個人情報は含まない。session_token はクッキーで管理。';

create index sessions_token_idx on diagnosis_sessions(session_token);
create index sessions_verdict_idx on diagnosis_sessions(verdict);
create index sessions_created_at_idx on diagnosis_sessions(created_at desc);

-- ============================================================
-- feedbacks テーブル（ユーザーフィードバック）
-- ============================================================
create table feedbacks (
  id              uuid primary key default uuid_generate_v4(),
  session_token   text,
  rating          smallint not null check (rating between 1 and 5),
  comment         text,
  verdict         text,           -- 診断結果（集計用）
  top_plan_id     text,
  submitted_at    timestamptz not null default now()
);

comment on table feedbacks is 'ユーザーの診断満足度フィードバック。';

create index feedbacks_rating_idx on feedbacks(rating);

-- ============================================================
-- audit_log テーブル（更新履歴・公開向け）
-- ============================================================
create table audit_log (
  id              uuid primary key default uuid_generate_v4(),
  plan_id         text not null,
  plan_name       text not null,
  carrier_id      text not null,

  action          text not null check (action in ('created', 'updated', 'archived', 'price_changed', 'discount_changed')),
  changed_fields  text[] default '{}',
  summary         text not null,  -- 人間が読める変更サマリ（公開用）

  -- 変更前後の主要数値（公開用）
  before_base_fee integer,
  after_base_fee  integer,

  -- 承認情報
  diff_id         uuid references plan_diffs(id),
  approved_by     text,
  source_url      text not null,

  published_at    timestamptz not null default now()
);

comment on table audit_log is '料金変更の公開履歴ログ。フロント側の「更新履歴ページ」から参照される。';

create index audit_log_plan_id_idx on audit_log(plan_id);
create index audit_log_published_at_idx on audit_log(published_at desc);
create index audit_log_carrier_id_idx on audit_log(carrier_id);

-- ============================================================
-- new_service_signals テーブル（新サービス検知シグナル）
-- ============================================================
create table new_service_signals (
  id              uuid primary key default uuid_generate_v4(),

  source          text not null,  -- 'pr_times' | 'jprs_whois' | 'google_alerts' | 'x_official' | 'youtube'
  title           text not null,
  url             text,
  raw_content     text,

  -- 分類
  signal_type     text check (signal_type in ('new_plan', 'new_brand', 'campaign_change', 'regulation_change', 'noise')),
  confidence      real,           -- 0.0〜1.0
  weight          real,

  -- キーワードマッチ
  matched_keywords text[] default '{}',
  negative_match  boolean default false,

  -- ワークフロー
  status          text not null default 'unreviewed' check (status in ('unreviewed', 'confirmed', 'rejected', 'noise')),
  reviewed_by     text,
  reviewed_at     timestamptz,

  detected_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

comment on table new_service_signals is '新キャリア・新プランの検知シグナルキュー。人手確認後にplans追加へ。';

create index signals_status_idx on new_service_signals(status);
create index signals_source_idx on new_service_signals(source);
create index signals_detected_at_idx on new_service_signals(detected_at desc);

-- ============================================================
-- Row Level Security（RLS）
-- ============================================================

-- plans: 公開プランは全員閲覧可
alter table plans enable row level security;
create policy "published plans are viewable by everyone"
  on plans for select
  using (status = 'published');

-- 管理者は全件操作可（service_role で行う）
create policy "service role has full access to plans"
  on plans for all
  using (auth.role() = 'service_role');

-- feedbacks: 誰でも投稿可
alter table feedbacks enable row level security;
create policy "anyone can insert feedback"
  on feedbacks for insert
  with check (true);

-- diagnosis_sessions: 誰でも投稿可、自分のトークンのみ読取
alter table diagnosis_sessions enable row level security;
create policy "anyone can insert session"
  on diagnosis_sessions for insert
  with check (true);

-- audit_log: 全員閲覧可
alter table audit_log enable row level security;
create policy "audit log is viewable by everyone"
  on audit_log for select
  using (true);

-- plan_diffs: service_role のみ
alter table plan_diffs enable row level security;
create policy "service role has full access to plan_diffs"
  on plan_diffs for all
  using (auth.role() = 'service_role');

-- ============================================================
-- 初期データ投入（plans.jsonの内容をSQLで管理する場合の例）
-- ============================================================
-- ※ 実際はscraper側からJSONで投入する。ここは構造確認用。
