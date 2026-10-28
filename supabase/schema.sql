-- Worth Going accounts. Run once in Supabase: SQL Editor → New query → paste → Run.
-- One row per user holds what syncs: saved events, restaurant log, taste.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  saved      jsonb not null default '[]'::jsonb,
  profile    jsonb,
  places     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Each person can only read and write their own row.
alter table public.user_state enable row level security;

drop policy if exists "own row: read" on public.user_state;
drop policy if exists "own row: insert" on public.user_state;
drop policy if exists "own row: update" on public.user_state;
drop policy if exists "own row: delete" on public.user_state;
create policy "own row: read"   on public.user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row: insert" on public.user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row: update" on public.user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own row: delete" on public.user_state for delete to authenticated using ((select auth.uid()) = user_id);

-- Keep rows small: reject oversized payloads.
alter table public.user_state drop constraint if exists user_state_size;
alter table public.user_state add constraint user_state_size
  check (pg_column_size(saved) + coalesce(pg_column_size(profile), 0) + pg_column_size(places) < 200000);

-- "Delete my account": removes the signed-in user (their row goes with it).
create or replace function public.delete_me()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
