-- ============================================================
-- 匿名プロダクトイベント
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists analytics_events (
  id              uuid primary key default uuid_generate_v4(),
  event_name      text not null,
  session_token   text,
  step_index      integer,
  verdict         text,
  plan_id         text,
  metadata        jsonb not null default '{}'::jsonb,
  user_agent_hint text,
  created_at      timestamptz not null default now()
);

comment on table analytics_events is
  '診断ファネル、結果表示、シェアなどの匿名イベント。個人情報は含めない。';

create index if not exists analytics_events_event_name_idx on analytics_events(event_name);
create index if not exists analytics_events_session_token_idx on analytics_events(session_token);
create index if not exists analytics_events_created_at_idx on analytics_events(created_at desc);

alter table analytics_events enable row level security;

drop policy if exists "service role has full access to analytics_events" on analytics_events;
create policy "service role has full access to analytics_events"
  on analytics_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
