-- Studix/Lumi: Rechte auf das Noetige reduzieren (auf dem Projekt bereits als Migration "lumi_harden_grants" angewendet).
-- RLS ist auf allen lumi_*-Tabellen aktiv; das hier ist zusaetzlicher Schutz (Defense in Depth).
revoke all on public.lumi_kv from anon;
revoke all on public.lumi_shares from anon, authenticated;
revoke all on public.lumi_ai_usage, public.lumi_ai_window, public.lumi_ai_session from anon, authenticated;
revoke truncate, references, trigger on public.lumi_kv from authenticated;
grant select, insert, update, delete on public.lumi_kv to authenticated;
alter function public.lumi_autoconfirm() set search_path = public, auth;
revoke execute on function public.lumi_share_create(text, text, jsonb, jsonb) from public, anon;
revoke execute on function public.lumi_share_get(uuid) from public, anon;
revoke execute on function public.lumi_share_put(uuid, text, text, jsonb, jsonb, text) from public, anon;
revoke execute on function public.lumi_share_stop(uuid) from public, anon;
grant execute on function public.lumi_share_create(text, text, jsonb, jsonb), public.lumi_share_get(uuid), public.lumi_share_put(uuid, text, text, jsonb, jsonb, text), public.lumi_share_stop(uuid) to authenticated;
