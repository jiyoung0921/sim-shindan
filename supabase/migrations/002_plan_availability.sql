-- ============================================================
-- プランの受付状態・公式確認日
-- ============================================================

alter table plans
  add column if not exists plan_status text not null default 'unknown'
    check (plan_status in ('active', 'ended', 'existing_only', 'unknown')),
  add column if not exists last_verified_at timestamptz;

comment on column plans.status is
  '公開ワークフロー状態。draft/review/published/archived。';

comment on column plans.plan_status is
  '新規申込の受付状態。active/ended/existing_only/unknown。診断推奨対象はactiveのみ。';

comment on column plans.last_verified_at is
  '公式料金ページ・提供条件書などを最後に確認した日時。';

update plans
set last_verified_at = coalesce(last_verified_at, fetched_at)
where last_verified_at is null;
