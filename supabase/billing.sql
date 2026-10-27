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
