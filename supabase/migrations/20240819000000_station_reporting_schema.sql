-- Community reporting schema. Safe to run after an existing station_updates table:
-- the ALTER statements preserve the client contract used by stationUpdates.js.
create table if not exists public.station_updates (
  id uuid primary key default gen_random_uuid(),
  station_name text,
  kind text not null default 'report' check (kind in ('report', 'chat')),
  category text,
  label text,
  tone text default 'blue',
  message text,
  where_on text,
  location_text text,
  author_id uuid references auth.users(id) on delete set null,
  author_initial text,
  confirms integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CONFIRMED', 'RESOLVED', 'EXPIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.station_updates add column if not exists status text not null default 'ACTIVE';
alter table public.station_updates add column if not exists updated_at timestamptz not null default now();
alter table public.station_updates add column if not exists confirms integer not null default 0;
alter table public.station_updates add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.station_updates add column if not exists where_on text;
alter table public.station_updates add column if not exists location_text text;
alter table public.station_updates add column if not exists category text;
alter table public.station_updates add column if not exists kind text not null default 'report';

create index if not exists station_updates_station_created_idx
  on public.station_updates (station_name, created_at desc);
create index if not exists station_updates_active_idx
  on public.station_updates (status, kind, created_at desc);

create table if not exists public.station_update_confirmations (
  update_id uuid not null references public.station_updates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (update_id, user_id)
);

alter table public.station_updates enable row level security;
drop policy if exists "Public can read station updates" on public.station_updates;
create policy "Public can read station updates"
  on public.station_updates for select using (true);
drop policy if exists "Signed in users can post station updates" on public.station_updates;
drop policy if exists "Anyone can post station reports" on public.station_updates;
create policy "Anyone can post station reports"
  on public.station_updates for insert to anon, authenticated
  with check (kind = 'report' and (author_id is null or author_id = auth.uid()));
drop policy if exists "Authors can update their station updates" on public.station_updates;
create policy "Authors can update their station updates"
  on public.station_updates for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

alter table public.station_update_confirmations enable row level security;
drop policy if exists "Users can confirm station updates" on public.station_update_confirmations;
create policy "Users can confirm station updates"
  on public.station_update_confirmations for insert to authenticated
  with check (user_id = auth.uid());

create or replace function public.increment_confirms(update_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.station_update_confirmations (update_id, user_id)
  values (update_id, auth.uid())
  on conflict do nothing;

  update public.station_updates
  set confirms = (
        select count(*) from public.station_update_confirmations
        where station_update_confirmations.update_id = station_updates.id
      ),
      status = case when (
        select count(*) from public.station_update_confirmations
        where station_update_confirmations.update_id = station_updates.id
      ) >= 3 then 'CONFIRMED' else status end,
      updated_at = now()
  where id = update_id and kind = 'report' and status not in ('RESOLVED', 'EXPIRED');
end;
$$;

grant execute on function public.increment_confirms(uuid) to anon, authenticated;

-- Reports older than seven days are no longer active map incidents. Run this
-- from a scheduled Supabase job or call it from an admin maintenance task.
create or replace function public.expire_old_station_reports()
returns void
language sql
security definer
set search_path = public
as $$
  update public.station_updates
  set status = 'EXPIRED', updated_at = now()
  where kind = 'report'
    and status in ('ACTIVE', 'CONFIRMED')
    and created_at < now() - interval '7 days';
$$;

-- Realtime is intentionally shared with the existing station_updates feed.
do $$
begin
  alter publication supabase_realtime add table public.station_updates;
exception when duplicate_object then
  null;
end $$;
