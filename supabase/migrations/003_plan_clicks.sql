-- ============================================================
-- 公式リンククリック計測
-- ============================================================

create table if not exists plan_clicks (
  id              uuid primary key default gen_random_uuid(),
  plan_id         text not null,
  session_token   text,
  verdict         text,
  rank            integer,
  target_url      text not null,
  referrer        text,
  user_agent_hint text,
  clicked_at      timestamptz not null default now()
);

comment on table plan_clicks is
  '結果画面から公式料金ページへ遷移した匿名クリックログ。ASP導入前のCTR計測に使う。';

create index if not exists plan_clicks_plan_id_idx on plan_clicks(plan_id);
create index if not exists plan_clicks_clicked_at_idx on plan_clicks(clicked_at desc);
create index if not exists plan_clicks_session_token_idx on plan_clicks(session_token);

alter table plan_clicks enable row level security;

drop policy if exists "service role has full access to plan_clicks" on plan_clicks;
create policy "service role has full access to plan_clicks"
  on plan_clicks for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
