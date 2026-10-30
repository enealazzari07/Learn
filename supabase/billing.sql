-- Optional: KI-Tageszähler für Gratis-Konten (AI_FREE_DAILY). Einmalig im Supabase SQL-Editor ausführen.
-- Geschrieben wird nur serverseitig (Service-Role-Key in Vercel).

-- Das Abo liegt nicht mehr in der Datenbank, sondern wird live aus Stripe gelesen. Alte Tabelle aus früheren Versionen entfernen:
drop table if exists public.lumi_subscriptions;

create table if not exists public.lumi_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.lumi_ai_usage enable row level security;   -- keine Policy: nur der Server (Service-Role) greift zu

create or replace function public.lumi_ai_bump(p_user uuid, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  insert into lumi_ai_usage(user_id, day, n) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set n = lumi_ai_usage.n + 1 where lumi_ai_usage.n < p_limit
  returning n into used;
  return used is not null;   -- false = Tageslimit erreicht
end $$;
revoke all on function public.lumi_ai_bump(uuid, integer) from public, anon, authenticated;

-- Token-Budget pro Zeitfenster (Standard 5 Stunden; Länge und Budget stellst du in Vercel ein: AI_WINDOW_HOURS, AI_FREE_WINDOW_TOKENS). Einmalig ausführen:
drop function if exists public.lumi_ai_tokens(uuid);
drop function if exists public.lumi_ai_add(uuid, bigint);
create table if not exists public.lumi_ai_window (user_id uuid primary key references auth.users(id) on delete cascade, started timestamptz not null default now(), tokens bigint not null default 0);
alter table public.lumi_ai_window enable row level security;
create or replace function public.lumi_ai_tokens(p_user uuid, p_hours integer) returns jsonb language sql security definer set search_path = public as $$
  select coalesce((select case when now() - started >= make_interval(hours => p_hours) then jsonb_build_object('tokens', 0, 'started', null) else jsonb_build_object('tokens', tokens, 'started', started) end from lumi_ai_window where user_id = p_user), jsonb_build_object('tokens', 0, 'started', null))
$$;
create or replace function public.lumi_ai_add(p_user uuid, p_tokens bigint, p_hours integer) returns jsonb language sql security definer set search_path = public as $$
  insert into lumi_ai_window(user_id, started, tokens) values (p_user, now(), p_tokens)
  on conflict (user_id) do update set
    started = case when now() - lumi_ai_window.started >= make_interval(hours => p_hours) then now() else lumi_ai_window.started end,
    tokens = case when now() - lumi_ai_window.started >= make_interval(hours => p_hours) then p_tokens else lumi_ai_window.tokens + p_tokens end
  returning jsonb_build_object('tokens', tokens, 'started', started)
$$;
revoke all on function public.lumi_ai_tokens(uuid, integer) from public, anon, authenticated;
revoke all on function public.lumi_ai_add(uuid, bigint, integer) from public, anon, authenticated;

-- Zweites, kurzes Fenster (5 Stunden) zusätzlich zum Wochenfenster
create table if not exists public.lumi_ai_session (user_id uuid primary key references auth.users(id) on delete cascade, started timestamptz not null default now(), tokens bigint not null default 0);
alter table public.lumi_ai_session enable row level security;
create or replace function public.lumi_ai_s_tokens(p_user uuid, p_hours integer) returns jsonb language sql security definer set search_path = public as $$
  select coalesce((select case when now() - started >= make_interval(hours => p_hours) then jsonb_build_object('tokens', 0, 'started', null) else jsonb_build_object('tokens', tokens, 'started', started) end from lumi_ai_session where user_id = p_user), jsonb_build_object('tokens', 0, 'started', null))
$$;
create or replace function public.lumi_ai_s_add(p_user uuid, p_tokens bigint, p_hours integer) returns jsonb language sql security definer set search_path = public as $$
  insert into lumi_ai_session(user_id, started, tokens) values (p_user, now(), p_tokens)
  on conflict (user_id) do update set
    started = case when now() - lumi_ai_session.started >= make_interval(hours => p_hours) then now() else lumi_ai_session.started end,
    tokens = case when now() - lumi_ai_session.started >= make_interval(hours => p_hours) then p_tokens else lumi_ai_session.tokens + p_tokens end
  returning jsonb_build_object('tokens', tokens, 'started', started)
$$;
revoke all on function public.lumi_ai_s_tokens(uuid, integer) from public, anon, authenticated;
revoke all on function public.lumi_ai_s_add(uuid, bigint, integer) from public, anon, authenticated;
