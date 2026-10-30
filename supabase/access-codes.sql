-- Early-Access-Codes mit begrenzter Einlösung (z. B. 20x). Im Supabase SQL Editor ausführen.
-- Gespeichert wird nur der SHA-256 des Codes (Grossbuchstaben, nur A–Z/0–9). Ein Konto verbraucht pro Code höchstens eine Einlösung.
-- Neuen Code anlegen:  insert into public.lumi_access_codes (code_hash, max_uses, note) values ('<sha256-hex>', 20, 'Early Access 20x');
-- Stand ansehen:       select c.note, c.max_uses, count(r.*) as eingeloest from public.lumi_access_codes c left join public.lumi_access_redemptions r using (code_hash) group by c.code_hash;

create table if not exists public.lumi_access_codes (
  code_hash text primary key,
  max_uses  int  not null check (max_uses > 0),
  note      text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.lumi_access_redemptions (
  code_hash   text not null references public.lumi_access_codes(code_hash) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code_hash, user_id)
);
alter table public.lumi_access_codes enable row level security;        -- keine Policies: nur der Service-Key (Server) kommt dran
alter table public.lumi_access_redemptions enable row level security;

-- Löst den Code für ein Konto ein: 'ok' | 'invalid' | 'used_up'. Gesperrt pro Code, damit gleichzeitige Einlösungen nie über das Limit gehen.
create or replace function public.lumi_code_redeem(p_hash text, p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare mx int; n int;
begin
  select max_uses into mx from public.lumi_access_codes where code_hash = p_hash for update;
  if mx is null then return 'invalid'; end if;
  if exists (select 1 from public.lumi_access_redemptions where code_hash = p_hash and user_id = p_user) then return 'ok'; end if;
  select count(*) into n from public.lumi_access_redemptions where code_hash = p_hash;
  if n >= mx then return 'used_up'; end if;
  insert into public.lumi_access_redemptions (code_hash, user_id) values (p_hash, p_user);
  return 'ok';
end $$;
revoke all on function public.lumi_code_redeem(text, uuid) from public, anon, authenticated;
grant execute on function public.lumi_code_redeem(text, uuid) to service_role;
