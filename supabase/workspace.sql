-- Studix Workspaces: gemeinsame Bereiche mit Mitgliedern, Rollen (admin/member), Ordnern und geteilten Dokumenten.
-- Alle Zugriffe laufen ueber SECURITY-DEFINER-Funktionen, die Mitgliedschaft/Rolle selbst pruefen.
-- Die Tabellen haben RLS ohne Policy und keine Rechte fuer anon/authenticated -> kein direkter Zugriff.
create table if not exists public.lumi_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_at timestamptz not null default now()
);
create table if not exists public.lumi_ws_members (
  ws_id uuid not null references public.lumi_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (ws_id, user_id)
);
create index if not exists lumi_ws_members_user on public.lumi_ws_members(user_id);
create table if not exists public.lumi_ws_folders (
  id uuid primary key default gen_random_uuid(),
  ws_id uuid not null references public.lumi_workspaces(id) on delete cascade,
  parent uuid references public.lumi_ws_folders(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#0f0f12',
  icon text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists lumi_ws_folders_ws on public.lumi_ws_folders(ws_id);
create table if not exists public.lumi_ws_items (
  id uuid primary key default gen_random_uuid(),
  ws_id uuid not null references public.lumi_workspaces(id) on delete cascade,
  folder_id uuid references public.lumi_ws_folders(id) on delete set null,
  share_id uuid not null,
  title text not null default '' check (char_length(title) <= 200),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists lumi_ws_items_ws on public.lumi_ws_items(ws_id);
alter table public.lumi_workspaces enable row level security;
alter table public.lumi_ws_members enable row level security;
alter table public.lumi_ws_folders enable row level security;
alter table public.lumi_ws_items enable row level security;
revoke all on public.lumi_workspaces, public.lumi_ws_members, public.lumi_ws_folders, public.lumi_ws_items from anon, authenticated;

create or replace function public.lumi_ws_role(p_ws uuid) returns text language sql stable security definer set search_path = public as $$
  select role from lumi_ws_members where ws_id = p_ws and user_id = auth.uid()
$$;

create or replace function public.lumi_ws_create(p_name text, p_who text) returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if (select count(*) from lumi_workspaces where owner = auth.uid()) >= 20 then raise exception 'workspace limit'; end if;
  insert into lumi_workspaces(name, owner) values (left(trim(p_name), 80), auth.uid()) returning id into v;
  insert into lumi_ws_members(ws_id, user_id, role, name) values (v, auth.uid(), 'admin', left(coalesce(p_who, ''), 60));
  return v;
end $$;

create or replace function public.lumi_ws_list() returns table(id uuid, name text, role text, members bigint, created_at timestamptz) language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  return query select w.id, w.name, m.role, (select count(*) from lumi_ws_members x where x.ws_id = w.id), w.created_at
    from lumi_workspaces w join lumi_ws_members m on m.ws_id = w.id and m.user_id = auth.uid() order by w.created_at;
end $$;

create or replace function public.lumi_ws_join(p_code text, p_who text) returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select id into v from lumi_workspaces where invite_code = trim(p_code);
  if v is null then raise exception 'invalid code'; end if;
  insert into lumi_ws_members(ws_id, user_id, role, name) values (v, auth.uid(), 'member', left(coalesce(p_who, ''), 60)) on conflict do nothing;
  return v;
end $$;

create or replace function public.lumi_ws_get(p_ws uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r text := lumi_ws_role(p_ws);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if r is null then raise exception 'no access'; end if;
  return jsonb_build_object(
    'id', p_ws, 'role', r, 'me', auth.uid(),
    'name', (select name from lumi_workspaces where id = p_ws),
    'code', case when r = 'admin' then (select invite_code from lumi_workspaces where id = p_ws) else null end,
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'role', role, 'name', name) order by joined_at) from lumi_ws_members where ws_id = p_ws), '[]'),
    'folders', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'parent', parent, 'name', name, 'color', color, 'icon', icon) order by created_at) from lumi_ws_folders where ws_id = p_ws), '[]'),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'folder_id', folder_id, 'share_id', share_id, 'title', title, 'created_by', created_by, 'created_at', created_at) order by created_at desc) from lumi_ws_items where ws_id = p_ws), '[]'));
end $$;

create or replace function public.lumi_ws_rename(p_ws uuid, p_name text) returns void language plpgsql security definer set search_path = public as $$
begin
  if lumi_ws_role(p_ws) is distinct from 'admin' then raise exception 'admin only'; end if;
  update lumi_workspaces set name = left(trim(p_name), 80) where id = p_ws;
end $$;

create or replace function public.lumi_ws_delete(p_ws uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if lumi_ws_role(p_ws) is distinct from 'admin' then raise exception 'admin only'; end if;
  delete from lumi_workspaces where id = p_ws;
end $$;

create or replace function public.lumi_ws_new_code(p_ws uuid) returns text language plpgsql security definer set search_path = public as $$
declare v text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
begin
  if lumi_ws_role(p_ws) is distinct from 'admin' then raise exception 'admin only'; end if;
  update lumi_workspaces set invite_code = v where id = p_ws;
  return v;
end $$;

create or replace function public.lumi_ws_set_role(p_ws uuid, p_user uuid, p_role text) returns void language plpgsql security definer set search_path = public as $$
begin
  if lumi_ws_role(p_ws) is distinct from 'admin' then raise exception 'admin only'; end if;
  if p_role not in ('admin', 'member') then raise exception 'bad role'; end if;
  if p_role = 'member' and (select count(*) from lumi_ws_members where ws_id = p_ws and role = 'admin' and user_id <> p_user) = 0 then raise exception 'last admin'; end if;
  update lumi_ws_members set role = p_role where ws_id = p_ws and user_id = p_user;
end $$;

-- Mitglied entfernen (Admin) oder selbst verlassen
create or replace function public.lumi_ws_remove_member(p_ws uuid, p_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_user <> auth.uid() and lumi_ws_role(p_ws) is distinct from 'admin' then raise exception 'admin only'; end if;
  if (select role from lumi_ws_members where ws_id = p_ws and user_id = p_user) = 'admin'
     and (select count(*) from lumi_ws_members where ws_id = p_ws and role = 'admin' and user_id <> p_user) = 0 then raise exception 'last admin'; end if;
  delete from lumi_ws_members where ws_id = p_ws and user_id = p_user;
end $$;

create or replace function public.lumi_ws_folder_save(p_ws uuid, p_id uuid, p_parent uuid, p_name text, p_color text, p_icon text) returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if lumi_ws_role(p_ws) is null then raise exception 'no access'; end if;
  if p_parent is not null and not exists (select 1 from lumi_ws_folders where id = p_parent and ws_id = p_ws) then raise exception 'bad parent'; end if;
  if p_id is null then
    insert into lumi_ws_folders(ws_id, parent, name, color, icon) values (p_ws, p_parent, left(trim(p_name), 80), coalesce(p_color, '#0f0f12'), coalesce(p_icon, '')) returning id into v;
  else
    update lumi_ws_folders set name = coalesce(nullif(left(trim(p_name), 80), ''), name), color = coalesce(p_color, color), icon = coalesce(p_icon, icon) where id = p_id and ws_id = p_ws returning id into v;
  end if;
  return v;
end $$;

create or replace function public.lumi_ws_folder_delete(p_ws uuid, p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if lumi_ws_role(p_ws) is null then raise exception 'no access'; end if;
  delete from lumi_ws_folders where id = p_id and ws_id = p_ws;
end $$;

create or replace function public.lumi_ws_item_add(p_ws uuid, p_folder uuid, p_share uuid, p_title text) returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if lumi_ws_role(p_ws) is null then raise exception 'no access'; end if;
  if p_folder is not null and not exists (select 1 from lumi_ws_folders where id = p_folder and ws_id = p_ws) then raise exception 'bad folder'; end if;
  if not exists (select 1 from lumi_shares where id = p_share) then raise exception 'unknown share'; end if;
  insert into lumi_ws_items(ws_id, folder_id, share_id, title, created_by) values (p_ws, p_folder, p_share, left(coalesce(p_title, ''), 200), auth.uid()) returning id into v;
  return v;
end $$;

create or replace function public.lumi_ws_item_update(p_ws uuid, p_id uuid, p_title text, p_folder uuid, p_move boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if lumi_ws_role(p_ws) is null then raise exception 'no access'; end if;
  if p_move and p_folder is not null and not exists (select 1 from lumi_ws_folders where id = p_folder and ws_id = p_ws) then raise exception 'bad folder'; end if;
  update lumi_ws_items set title = coalesce(left(p_title, 200), title), folder_id = case when p_move then p_folder else folder_id end where id = p_id and ws_id = p_ws;
end $$;

create or replace function public.lumi_ws_item_delete(p_ws uuid, p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if lumi_ws_role(p_ws) is null then raise exception 'no access'; end if;
  delete from lumi_ws_items where id = p_id and ws_id = p_ws;
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'lumi\_ws\_%' loop
    execute 'revoke all on function ' || f || ' from public, anon';
    execute 'grant execute on function ' || f || ' to authenticated';
  end loop;
end $$;
