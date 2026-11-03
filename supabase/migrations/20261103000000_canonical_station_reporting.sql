-- Canonical reporting layer. The existing station_updates feed and RPCs are
-- retained so current clients can roll forward without a coordinated deploy.
begin;

create table if not exists public.stations (
  id text primary key,
  name text not null,
  normalized_name text generated always as (lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '', 'g'))) stored unique,
  code text,
  latitude double precision,
  longitude double precision
);

create table if not exists public.lines (
  id text primary key,
  name text not null unique,
  normalized_name text generated always as (lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '', 'g'))) stored unique
);

create table if not exists public.station_lines (
  station_id text not null references public.stations(id) on delete cascade,
  line_id text not null references public.lines(id) on delete cascade,
  valid_from date not null default current_date,
  valid_to date,
  primary key (station_id, line_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  station_id text not null references public.stations(id),
  reporter_key text not null,
  category text not null,
  label text,
  tone text default 'blue',
  message text,
  where_on text,
  author_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  scope text not null default 'station_wide' check (scope in ('station_wide', 'line_specific')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CONFIRMED', 'RESOLVED', 'EXPIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.stations add column if not exists external_source_id text;
alter table public.lines add column if not exists colour text;
alter table public.station_lines add column if not exists valid_from date not null default current_date;
alter table public.station_lines add column if not exists valid_to date;
alter table public.reports add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists scope text not null default 'station_wide';
alter table public.reports add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');
update public.reports set user_id = author_id where user_id is null and author_id is not null;
update public.reports set expires_at = created_at + interval '24 hours'
where expires_at > created_at + interval '24 hours';
alter table public.reports drop constraint if exists reports_scope_check;
alter table public.reports add constraint reports_scope_check check (scope in ('station_wide', 'line_specific'));

create table if not exists public.report_lines (
  report_id uuid not null references public.reports(id) on delete cascade,
  line_id text not null references public.lines(id) on delete cascade,
  primary key (report_id, line_id)
);

create index if not exists reports_station_active_idx
  on public.reports (station_id, status, created_at desc);
create index if not exists report_lines_line_idx
  on public.report_lines (line_id, report_id);

insert into public.lines (id, name) values
  ('bakerloo', 'Bakerloo'), ('central', 'Central'), ('circle', 'Circle'),
  ('district', 'District'), ('dlr', 'DLR'), ('elizabeth', 'Elizabeth'),
  ('hammersmith-and-city', 'Hammersmith & City'), ('jubilee', 'Jubilee'),
  ('london-overground', 'London Overground'), ('metropolitan', 'Metropolitan'),
  ('northern', 'Northern'), ('piccadilly', 'Piccadilly'), ('tramlink', 'Tramlink'),
  ('victoria', 'Victoria'), ('waterloo-city', 'Waterloo & City')
on conflict (id) do update set name = excluded.name;
update public.lines set colour = case id
  when 'bakerloo' then '#B36305' when 'central' then '#DC2626'
  when 'circle' then '#FFD300' when 'district' then '#00782A'
  when 'dlr' then '#00A4A7' when 'elizabeth' then '#7156A5'
  when 'hammersmith-and-city' then '#F589A6' when 'jubilee' then '#A0A5A9'
  when 'london-overground' then '#EE7C0E' when 'metropolitan' then '#C4007D'
  when 'northern' then '#1A1A1A' when 'piccadilly' then '#4C6FCB'
  when 'tramlink' then '#84B817' when 'victoria' then '#2563EB'
  when 'waterloo-city' then '#95CDBA' else colour end;

-- Existing rows are imported when their station can be resolved. This is
-- intentionally non-destructive; unmapped legacy rows remain readable.
insert into public.stations (id, name)
select 'legacy-' || md5(lower(regexp_replace(trim(station_name), '[^a-zA-Z0-9]+', '', 'g'))),
       min(trim(station_name))
from public.station_updates
where nullif(trim(station_name), '') is not null
group by lower(regexp_replace(trim(station_name), '[^a-zA-Z0-9]+', '', 'g'))
on conflict (id) do nothing;

alter table public.reports enable row level security;
alter table public.report_lines enable row level security;
drop policy if exists "Public can read active canonical reports" on public.reports;
create policy "Public can read active canonical reports" on public.reports
  for select using (status in ('ACTIVE', 'CONFIRMED') and expires_at > now());
drop policy if exists "Public can read report line mappings" on public.report_lines;
create policy "Public can read report line mappings" on public.report_lines
  for select using (exists (select 1 from public.reports r where r.id = report_id and r.status in ('ACTIVE', 'CONFIRMED') and r.expires_at > now()));
drop policy if exists "Users can read their report history" on public.reports;
create policy "Users can read their report history" on public.reports
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users can read their report line history" on public.report_lines;
create policy "Users can read their report line history" on public.report_lines
  for select to authenticated using (exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid()));
revoke insert, update, delete on public.reports from public, anon, authenticated;
revoke insert, update, delete on public.report_lines from public, anon, authenticated;

create or replace view public.unique_line_report_summary
with (security_invoker = true) as
select
  rl.line_id,
  count(distinct r.id)::integer as report_count,
  max(r.created_at) as latest_report_at
from public.report_lines rl
join public.reports r on r.id = rl.report_id
where r.status in ('ACTIVE', 'CONFIRMED') and r.expires_at > now()
group by rl.line_id;

create or replace function public.expire_canonical_reports()
returns void language sql security definer set search_path = public as $$
  update public.reports set status = 'EXPIRED', updated_at = now()
  where status in ('ACTIVE', 'CONFIRMED') and expires_at <= now();
$$;
grant execute on function public.expire_canonical_reports() to anon, authenticated;

-- Retain report history for 90 days, then remove personal report records.
-- Schedule this function with a Supabase cron job; active reports are never
-- removed by this function before their expiry.
create or replace function public.purge_old_canonical_reports()
returns void language sql security definer set search_path = public as $$
  delete from public.reports
  where created_at < now() - interval '90 days'
    and status in ('RESOLVED', 'EXPIRED');
$$;
revoke all on function public.purge_old_canonical_reports() from public, anon, authenticated;

-- Safe read RPC used by the selector. It returns one distinct-report count
-- per line and never accepts arbitrary station/line joins from the client.
create or replace function public.get_station_line_report_summary(p_station_id text)
returns table (line_id text, report_count integer)
language sql stable security definer set search_path = public as $$
  select sl.line_id, count(distinct r.id)::integer
  from public.station_lines sl
  left join public.report_lines rl on rl.line_id = sl.line_id
  left join public.reports r on r.id = rl.report_id and r.station_id = p_station_id
    and r.status in ('ACTIVE', 'CONFIRMED') and r.expires_at > now()
  where sl.station_id = p_station_id
  group by sl.line_id;
$$;
grant execute on function public.get_station_line_report_summary(text) to anon, authenticated;

create or replace function public.get_station_report_summary(p_station_id text)
returns integer
language sql stable security definer set search_path = public as $$
  select count(distinct r.id)::integer
  from public.reports r
  where r.station_id = p_station_id
    and r.status in ('ACTIVE', 'CONFIRMED') and r.expires_at > now();
$$;
grant execute on function public.get_station_report_summary(text) to anon, authenticated;

create or replace function public.get_line_report_summary(p_line_id text)
returns integer
language sql stable security definer set search_path = public as $$
  select count(distinct rl.report_id)::integer
  from public.report_lines rl
  join public.reports r on r.id = rl.report_id
  where rl.line_id = p_line_id
    and r.status in ('ACTIVE', 'CONFIRMED')
    and r.expires_at > now();
$$;
grant execute on function public.get_line_report_summary(text) to anon, authenticated;

create or replace function public.get_line_report_breakdown(p_line_id text)
returns table (category text, scope text, report_count integer)
language sql stable security definer set search_path = public as $$
  select r.category, r.scope, count(distinct r.id)::integer
  from public.report_lines rl
  join public.reports r on r.id = rl.report_id
  where rl.line_id = p_line_id
    and r.status in ('ACTIVE', 'CONFIRMED')
    and r.expires_at > now()
  group by r.category, r.scope
  order by count(distinct r.id) desc, r.category, r.scope;
$$;
grant execute on function public.get_line_report_breakdown(text) to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.report_lines;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
commit;

-- Seed the same canonical station IDs and line mappings used by the map.
insert into public.stations (id, name, latitude, longitude) values ('abbey-road', 'Abbey Road', 51.532394, 0.00353) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('abbey-wood', 'Abbey Wood', 51.491093, 0.120405) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('acton-central', 'Acton Central', 51.508709, -0.262833) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('acton-main-line', 'Acton Main Line', 51.517108, -0.267155) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('acton-town', 'Acton Town', 51.502644, -0.279917) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('addington-village', 'Addington Village', 51.356207, -0.032495) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('addiscombe', 'Addiscombe', 51.379936, -0.073267) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('aldgate', 'Aldgate', 51.514096, -0.075716) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('aldgate-east', 'Aldgate East', 51.515147, -0.071877) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('all-saints', 'All Saints', 51.510716, -0.013071) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('alperton', 'Alperton', 51.540555, -0.299455) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('amersham', 'Amersham', 51.674207, -0.608469) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ampere-way', 'Ampere Way', 51.382359, -0.123687) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('anerley', 'Anerley', 51.412264, -0.065798) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('angel', 'Angel', 51.531821, -0.10613) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('archway', 'Archway', 51.565371, -0.134745) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('arena', 'Arena', 51.391605, -0.058253) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('arnos-grove', 'Arnos Grove', 51.616476, -0.133269) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('arsenal', 'Arsenal', 51.557824, -0.108099) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('avenue-road', 'Avenue Road', 51.407045, -0.049) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('baker-street', 'Baker Street', 51.522501, -0.155512) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('balham', 'Balham', 51.443164, -0.152988) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bank', 'Bank', 51.51345, -0.08899) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bank-dlr', 'Bank (DLR)', 51.5123, -0.087) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('barbican', 'Barbican', 51.520215, -0.097792) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('barking', 'Barking', 51.5395, 0.0812) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('barking-rail', 'Barking (Rail)', 51.5392, 0.0809) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('barking-riverside', 'Barking Riverside', 51.51955, 0.11599) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('barkingside', 'Barkingside', 51.58565, 0.08858) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('barons-court', 'Barons Court', 51.49026, -0.213749) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('battersea-park', 'Battersea Park', 51.47804, -0.147444) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('battersea-power-station', 'Battersea Power Station', 51.479432, -0.142994) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bayswater', 'Bayswater', 51.512333, -0.187837) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('beckenham-junction', 'Beckenham Junction', 51.410718, -0.026159) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('beckenham-road', 'Beckenham Road', 51.409637, -0.043157) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('beckton', 'Beckton', 51.514278, 0.061053) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('beckton-park', 'Beckton Park', 51.508726, 0.054976) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('becontree', 'Becontree', 51.540323, 0.127269) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('beddington-lane', 'Beddington Lane', 51.389452, -0.142846) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('belgrave-walk', 'Belgrave Walk', 51.400976, -0.178357) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('belsize-park', 'Belsize Park', 51.550275, -0.164704) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bermondsey', 'Bermondsey', 51.49773, -0.063738) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bethnal-green', 'Bethnal Green', 51.527473, -0.055488) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('birkbeck', 'Birkbeck', 51.403748, -0.055802) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('blackfriars', 'Blackfriars', 51.511774, -0.10314) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('blackhorse-lane', 'Blackhorse Lane', 51.38482, -0.070462) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('blackhorse-road', 'Blackhorse Road', 51.587, -0.0407) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('blackhorse-road-rail', 'Blackhorse Road (Rail)', 51.586636, -0.041339) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('blackwall', 'Blackwall', 51.507945, -0.007226) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bond-street', 'Bond Street', 51.514325, -0.148986) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('borough', 'Borough', 51.501094, -0.09341) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('boston-manor', 'Boston Manor', 51.495748, -0.324733) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bounds-green', 'Bounds Green', 51.607066, -0.124134) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bow-church', 'Bow Church', 51.527729, -0.020911) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bow-road', 'Bow Road', 51.526873, -0.024842) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('brent-cross', 'Brent Cross', 51.5767, -0.213553) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('brentwood', 'Brentwood', 51.613535, 0.299834) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('brixton', 'Brixton', 51.462606, -0.114872) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('brockley', 'Brockley', 51.464638, -0.037469) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bromley-by-bow', 'Bromley-by-Bow', 51.524737, -0.011585) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('brondesbury', 'Brondesbury', 51.545123, -0.202323) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('brondesbury-park', 'Brondesbury Park', 51.540696, -0.210148) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bruce-grove', 'Bruce Grove', 51.593711, -0.070081) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('buckhurst-hill', 'Buckhurst Hill', 51.625946, 0.046797) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('burnham', 'Burnham', 51.5234, -0.646353) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('burnt-oak', 'Burnt Oak', 51.602845, -0.263952) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bush-hill-park', 'Bush Hill Park', 51.641206, -0.069034) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('bushey', 'Bushey', 51.645749, -0.385197) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('caledonian-road', 'Caledonian Road', 51.548373, -0.118367) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('caledonian-road-barnsbury', 'Caledonian Road & Barnsbury', 51.543607, -0.114988) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('cambridge-heath', 'Cambridge Heath', 51.532435, -0.057593) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('camden-road', 'Camden Road', 51.541949, -0.139464) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('camden-town', 'Camden Town', 51.53894, -0.142557) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('canada-water', 'Canada Water', 51.498, -0.0493) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('canada-water-rail', 'Canada Water (Rail)', 51.4975, -0.04995) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('canary-wharf', 'Canary Wharf', 51.503541, -0.018612) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('canning-town', 'Canning Town', 51.51404, 0.008171) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('canning-town-dlr', 'Canning Town (DLR)', 51.5135, 0.008) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('cannon-street', 'Cannon Street', 51.511391, -0.090323) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('canonbury', 'Canonbury', 51.54868, -0.092683) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('canons-park', 'Canons Park', 51.607756, -0.294744) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('carpenders-park', 'Carpenders Park', 51.628407, -0.385674) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('cassiobridge', 'Cassiobridge', 51.650626, -0.424368) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('centrale', 'Centrale', 51.375876, -0.103774) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chadwell-heath', 'Chadwell Heath', 51.567939, 0.12906) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chalfont-latimer', 'Chalfont & Latimer', 51.668042, -0.56082) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chalk-farm', 'Chalk Farm', 51.544202, -0.15347) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chancery-lane', 'Chancery Lane', 51.518112, -0.112121) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('charing-cross', 'Charing Cross', 51.507335, -0.127362) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chesham', 'Chesham', 51.70539, -0.61093) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('cheshunt', 'Cheshunt', 51.70287, -0.023975) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chigwell', 'Chigwell', 51.617826, 0.074748) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chingford', 'Chingford', 51.633222, 0.010079) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chiswick-park', 'Chiswick Park', 51.494579, -0.268121) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('chorleywood', 'Chorleywood', 51.654181, -0.518356) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('church-street', 'Church Street', 51.373591, -0.104029) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('clapham-common', 'Clapham Common', 51.461986, -0.137588) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('clapham-high-street', 'Clapham High Street', 51.465508, -0.132392) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('clapham-junction', 'Clapham Junction', 51.4648, -0.171967) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('clapham-north', 'Clapham North', 51.465118, -0.129898) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('clapham-south', 'Clapham South', 51.452763, -0.147584) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('clapton', 'Clapton', 51.561663, -0.056832) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('cockfosters', 'Cockfosters', 51.651605, -0.14935) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('colindale', 'Colindale', 51.595349, -0.249783) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('colliers-wood', 'Colliers Wood', 51.418115, -0.17809) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('coombe-lane', 'Coombe Lane', 51.359783, -0.060086) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('covent-garden', 'Covent Garden', 51.51306, -0.124196) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('crossharbour', 'Crossharbour', 51.495836, -0.014468) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('crouch-hill', 'Crouch Hill', 51.571278, -0.117195) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('croxley', 'Croxley', 51.647149, -0.441667) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('crystal-palace', 'Crystal Palace', 51.417945, -0.072205) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('custom-house', 'Custom House', 51.5097, 0.02637) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('cutty-sark', 'Cutty Sark', 51.481741, -0.010721) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('cyprus', 'Cyprus', 51.508432, 0.063971) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('dagenham-east', 'Dagenham East', 51.54416, 0.165642) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('dagenham-heathway', 'Dagenham Heathway', 51.541672, 0.1477) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('dalston-junction', 'Dalston Junction', 51.546135, -0.074908) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('dalston-kingsland', 'Dalston Kingsland', 51.548173, -0.075823) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('debden', 'Debden', 51.645293, 0.083573) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('denmark-hill', 'Denmark Hill', 51.468161, -0.089006) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('deptford-bridge', 'Deptford Bridge', 51.47411, -0.022394) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('devons-road', 'Devons Road', 51.522475, -0.017501) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('dollis-hill', 'Dollis Hill', 51.55208, -0.239229) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('dundonald-road', 'Dundonald Road', 51.417507, -0.207617) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ealing-broadway', 'Ealing Broadway', 51.5152, -0.301543) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ealing-broadway-rail', 'Ealing Broadway (Rail)', 51.514785, -0.301543) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ealing-common', 'Ealing Common', 51.509907, -0.288181) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('earl-s-court', 'Earl''s Court', 51.491482, -0.194168) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('east-acton', 'East Acton', 51.516869, -0.247572) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('east-croydon', 'East Croydon', 51.374808, -0.092713) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('east-finchley', 'East Finchley', 51.587566, -0.165219) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('east-ham', 'East Ham', 51.539243, 0.052011) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('east-india', 'East India', 51.509386, -0.002259) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('east-putney', 'East Putney', 51.459069, -0.211062) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('eastcote', 'Eastcote', 51.576608, -0.397075) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('edgware', 'Edgware', 51.613989, -0.275504) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('edgware-road', 'Edgware Road', 51.520483, -0.170339) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('edmonton-green', 'Edmonton Green', 51.624972, -0.061243) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('elephant-castle', 'Elephant & Castle', 51.495383, -0.100545) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('elm-park', 'Elm Park', 51.549643, 0.197464) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('elmers-end', 'Elmers End', 51.398249, -0.049693) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('elverson-road', 'Elverson Road', 51.469096, -0.016786) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('embankment', 'Embankment', 51.507014, -0.122577) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('emerson-park', 'Emerson Park', 51.568587, 0.220267) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('enfield-town', 'Enfield Town', 51.651971, -0.079386) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('epping', 'Epping', 51.694177, 0.114528) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('euston', 'Euston', 51.528432, -0.134286) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('euston-rail', 'Euston (Rail)', 51.529, -0.1348) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('euston-square', 'Euston Square', 51.525684, -0.135534) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('fairlop', 'Fairlop', 51.595949, 0.091113) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('farringdon', 'Farringdon', 51.520207, -0.104666) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('farringdon-rail', 'Farringdon (Rail)', 51.5192, -0.1033) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('fieldway', 'Fieldway', 51.35097, -0.024215) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('finchley-central', 'Finchley Central', 51.600683, -0.191944) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('finchley-road', 'Finchley Road', 51.547377, -0.180884) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('finchley-road-frognal', 'Finchley Road & Frognal', 51.54999, -0.183954) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('finsbury-park', 'Finsbury Park', 51.564639, -0.106338) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('forest-gate', 'Forest Gate', 51.54955, 0.024122) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('forest-hill', 'Forest Hill', 51.439775, -0.052834) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('fulham-broadway', 'Fulham Broadway', 51.480184, -0.195281) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('gallions-reach', 'Gallions Reach', 51.508964, 0.071771) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('gants-hill', 'Gants Hill', 51.576609, 0.066351) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('george-street', 'George Street', 51.373931, -0.09871) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('gidea-park', 'Gidea Park', 51.581616, 0.205288) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('gloucester-road', 'Gloucester Road', 51.494438, -0.183472) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('golders-green', 'Golders Green', 51.572397, -0.194086) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('goldhawk-road', 'Goldhawk Road', 51.501947, -0.226674) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('goodge-street', 'Goodge Street', 51.520515, -0.134358) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('goodmayes', 'Goodmayes', 51.565501, 0.110997) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('gospel-oak', 'Gospel Oak', 51.555677, -0.152153) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('grange-hill', 'Grange Hill', 51.613121, 0.092516) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('gravel-hill', 'Gravel Hill', 51.354529, -0.042861) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('great-portland-street', 'Great Portland Street', 51.523837, -0.143921) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('green-park', 'Green Park', 51.506557, -0.143119) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('greenford', 'Greenford', 51.542188, -0.344816) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('greenwich', 'Greenwich', 51.478042, -0.015487) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('gunnersbury', 'Gunnersbury', 51.491614, -0.27538) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hackney-central', 'Hackney Central', 51.547063, -0.057317) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hackney-downs', 'Hackney Downs', 51.549072, -0.061151) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hackney-wick', 'Hackney Wick', 51.543413, -0.024834) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('haggerston', 'Haggerston', 51.538929, -0.075538) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hainault', 'Hainault', 51.603709, 0.093472) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hammersmith', 'Hammersmith', 51.494096, -0.225083) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hampstead', 'Hampstead', 51.556394, -0.178196) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hampstead-heath', 'Hampstead Heath', 51.555246, -0.165335) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hanger-lane', 'Hanger Lane', 51.530298, -0.293287) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hanwell', 'Hanwell', 51.511809, -0.338596) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('harlesden', 'Harlesden', 51.53637, -0.257954) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('harold-wood', 'Harold Wood', 51.592681, 0.233006) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('harringay-green-lanes', 'Harringay Green Lanes', 51.577242, -0.097821) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('harrington-road', 'Harrington Road', 51.399663, -0.060481) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('harrow-wealdstone', 'Harrow & Wealdstone', 51.592321, -0.335399) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('harrow-on-the-hill', 'Harrow-on-the-Hill', 51.579238, -0.336305) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hatch-end', 'Hatch End', 51.609464, -0.368613) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hatton-cross', 'Hatton Cross', 51.466721, -0.423116) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hayes-harlington', 'Hayes & Harlington', 51.50297, -0.419624) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('headstone-lane', 'Headstone Lane', 51.602417, -0.356632) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('heathrow-terminal-4', 'Heathrow Terminal 4', 51.458659, -0.445435) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('heathrow-terminal-5', 'Heathrow Terminal 5', 51.472548, -0.490104) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('heathrow-terminals-2-3', 'Heathrow Terminals 2 & 3', 51.472505, -0.455001) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hendon-central', 'Hendon Central', 51.583133, -0.226099) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('heron-quays', 'Heron Quays', 51.503262, -0.021437) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('high-barnet', 'High Barnet', 51.650932, -0.194816) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('high-street-kensington', 'High Street Kensington', 51.500941, -0.19266) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('highams-park', 'Highams Park', 51.608918, -0.000198) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('highbury-islington', 'Highbury & Islington', 51.547, -0.10375) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('highbury-islington-rail', 'Highbury & Islington (Rail)', 51.54597, -0.105) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('highgate', 'Highgate', 51.577645, -0.145782) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hillingdon', 'Hillingdon', 51.553725, -0.450198) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('holborn', 'Holborn', 51.517615, -0.120177) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('holland-park', 'Holland Park', 51.507277, -0.205642) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('holloway-road', 'Holloway Road', 51.55273, -0.113009) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('homerton', 'Homerton', 51.54707, -0.042504) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('honor-oak-park', 'Honor Oak Park', 51.450013, -0.045361) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hornchurch', 'Hornchurch', 51.554005, 0.218542) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hounslow-central', 'Hounslow Central', 51.471306, -0.366413) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hounslow-east', 'Hounslow East', 51.473228, -0.356313) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hounslow-west', 'Hounslow West', 51.473525, -0.386447) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hoxton', 'Hoxton', 51.53147, -0.075625) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('hyde-park-corner', 'Hyde Park Corner', 51.502961, -0.152557) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ickenham', 'Ickenham', 51.561972, -0.442056) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ilford', 'Ilford', 51.559049, 0.069917) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('imperial-wharf', 'Imperial Wharf', 51.475287, -0.183135) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('island-gardens', 'Island Gardens', 51.487916, -0.010294) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('iver', 'Iver', 51.508643, -0.506544) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kennington', 'Kennington', 51.488818, -0.105553) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kensal-green', 'Kensal Green', 51.530573, -0.224596) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kensal-rise', 'Kensal Rise', 51.534408, -0.220226) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kensington-olympia', 'Kensington (Olympia)', 51.497534, -0.209593) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kentish-town', 'Kentish Town', 51.55031, -0.14074) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kentish-town-west', 'Kentish Town West', 51.547075, -0.14675) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kenton', 'Kenton', 51.58153, -0.31662) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kew-bridge', 'Kew Bridge', 51.4768, -0.2877) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kew-gardens', 'Kew Gardens', 51.477077, -0.285013) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kilburn', 'Kilburn', 51.547025, -0.205286) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kilburn-high-road', 'Kilburn High Road', 51.537666, -0.191495) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kilburn-park', 'Kilburn Park', 51.535154, -0.194134) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('king-george-v', 'King George V', 51.501952, 0.062158) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('king-henry-s-drive', 'King Henry''s Drive', 51.345507, -0.020393) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('king-s-cross-st-pancras', 'King''s Cross St Pancras', 51.530605, -0.122944) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('kingsbury', 'Kingsbury', 51.584716, -0.278622) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('knightsbridge', 'Knightsbridge', 51.501606, -0.160592) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ladbroke-grove', 'Ladbroke Grove', 51.517268, -0.210942) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('lambeth-north', 'Lambeth North', 51.498886, -0.112287) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('lancaster-gate', 'Lancaster Gate', 51.511871, -0.175145) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('langdon-park', 'Langdon Park', 51.51514, -0.014113) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('langley', 'Langley', 51.507947, -0.54121) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('latimer-road', 'Latimer Road', 51.513397, -0.217909) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('lebanon-road', 'Lebanon Road', 51.375149, -0.0845) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('leicester-square', 'Leicester Square', 51.511223, -0.12849) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('lewisham', 'Lewisham', 51.464714, -0.01291) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('leyton', 'Leyton', 51.556631, -0.005407) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('leyton-midland-road', 'Leyton Midland Road', 51.569532, -0.007268) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('leytonstone', 'Leytonstone', 51.568581, 0.008403) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('leytonstone-high-road', 'Leytonstone High Road', 51.5639, 0.007712) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('limehouse', 'Limehouse', 51.512372, -0.039687) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('liverpool-street', 'Liverpool Street', 51.5173, -0.083213) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('lloyd-park', 'Lloyd Park', 51.364166, -0.080695) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('london-bridge', 'London Bridge', 51.50502, -0.089635) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('london-city-airport', 'London City Airport', 51.503676, 0.048012) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('london-fields', 'London Fields', 51.541157, -0.057855) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('loughton', 'Loughton', 51.641361, 0.055255) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('maida-vale', 'Maida Vale', 51.529802, -0.185775) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('maidenhead', 'Maidenhead', 51.518319, -0.722758) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('manor-house', 'Manor House', 51.570491, -0.096186) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('manor-park', 'Manor Park', 51.552448, 0.045782) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('mansion-house', 'Mansion House', 51.51191, -0.093754) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('marble-arch', 'Marble Arch', 51.51354, -0.157836) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('maryland', 'Maryland', 51.546199, 0.006228) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('marylebone', 'Marylebone', 51.522276, -0.163222) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('merton-park', 'Merton Park', 51.413757, -0.201386) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('mile-end', 'Mile End', 51.525356, -0.033445) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('mill-hill-east', 'Mill Hill East', 51.60825, -0.210151) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('mitcham', 'Mitcham', 51.397556, -0.171138) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('mitcham-junction', 'Mitcham Junction', 51.392642, -0.157297) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('monument', 'Monument', 51.51065, -0.0861) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('moor-park', 'Moor Park', 51.629774, -0.432234) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('moorgate', 'Moorgate', 51.51812, -0.08829) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('morden', 'Morden', 51.402345, -0.194734) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('morden-road', 'Morden Road', 51.40888, -0.192912) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('mornington-crescent', 'Mornington Crescent', 51.534358, -0.138539) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('mudchute', 'Mudchute', 51.491698, -0.014954) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('neasden', 'Neasden', 51.554168, -0.249963) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('new-addington', 'New Addington', 51.342496, -0.017339) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('new-cross', 'New Cross', 51.476631, -0.032341) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('new-cross-gate', 'New Cross Gate', 51.475433, -0.040267) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('newbury-park', 'Newbury Park', 51.575598, 0.089947) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('nine-elms', 'Nine Elms', 51.480153, -0.128617) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('north-acton', 'North Acton', 51.523605, -0.259714) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('north-ealing', 'North Ealing', 51.517695, -0.288536) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('north-greenwich', 'North Greenwich', 51.500094, 0.003885) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('north-harrow', 'North Harrow', 51.585, -0.362797) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('north-wembley', 'North Wembley', 51.562406, -0.303875) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('northfields', 'Northfields', 51.499604, -0.313162) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('northolt', 'Northolt', 51.548391, -0.369071) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('northwick-park', 'Northwick Park', 51.578488, -0.317777) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('northwood', 'Northwood', 51.610785, -0.423729) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('northwood-hills', 'Northwood Hills', 51.600365, -0.408963) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('norwood-junction', 'Norwood Junction', 51.397153, -0.074625) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('notting-hill-gate', 'Notting Hill Gate', 51.5092, -0.196095) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('oakwood', 'Oakwood', 51.647377, -0.131485) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('old-street', 'Old Street', 51.525628, -0.087542) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('osterley', 'Osterley', 51.481124, -0.352296) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('oval', 'Oval', 51.481829, -0.112368) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('oxford-circus', 'Oxford Circus', 51.515308, -0.14208) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('paddington', 'Paddington', 51.515955, -0.174491) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('park-royal', 'Park Royal', 51.526523, -0.283955) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('parsons-green', 'Parsons Green', 51.475302, -0.201087) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('peckham-rye', 'Peckham Rye', 51.469449, -0.070386) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('penge-west', 'Penge West', 51.417478, -0.060636) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('perivale', 'Perivale', 51.53674, -0.32358) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('phipps-bridge', 'Phipps Bridge', 51.403331, -0.182106) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('piccadilly-circus', 'Piccadilly Circus', 51.509959, -0.133442) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('pimlico', 'Pimlico', 51.488891, -0.132954) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('pinner', 'Pinner', 51.592714, -0.38081) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('plaistow', 'Plaistow', 51.531157, 0.016571) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('pontoon-dock', 'Pontoon Dock', 51.502214, 0.032704) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('poplar', 'Poplar', 51.50784, -0.017478) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('preston-road', 'Preston Road', 51.572074, -0.295144) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('prince-regent', 'Prince Regent', 51.509487, 0.033623) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('pudding-mill-lane', 'Pudding Mill Lane', 51.533844, -0.013515) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('putney-bridge', 'Putney Bridge', 51.468345, -0.208817) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('queen-s-park', 'Queen''s Park', 51.533993, -0.205506) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('queens-road-peckham', 'Queens Road Peckham', 51.474061, -0.056992) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('queensbury', 'Queensbury', 51.594173, -0.286185) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('queensway', 'Queensway', 51.5105, -0.18723) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ravenscourt-park', 'Ravenscourt Park', 51.494117, -0.235797) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('rayners-lane', 'Rayners Lane', 51.575188, -0.371281) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('reading', 'Reading', 51.459241, -0.972914) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('rectory-road', 'Rectory Road', 51.558638, -0.068445) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('redbridge', 'Redbridge', 51.576363, 0.045411) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('reeves-corner', 'Reeves Corner', 51.374887, -0.106321) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('regent-s-park', 'Regent''s Park', 51.523447, -0.1465) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('richmond', 'Richmond', 51.463331, -0.301184) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('rickmansworth', 'Rickmansworth', 51.640181, -0.473582) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('roding-valley', 'Roding Valley', 51.617106, 0.04388) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('romford', 'Romford', 51.57491, 0.183417) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('rotherhithe', 'Rotherhithe', 51.501029, -0.052122) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('royal-albert', 'Royal Albert', 51.508344, 0.045658) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('royal-oak', 'Royal Oak', 51.519063, -0.187989) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('royal-victoria', 'Royal Victoria', 51.509168, 0.01793) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ruislip', 'Ruislip', 51.571373, -0.421628) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ruislip-gardens', 'Ruislip Gardens', 51.560741, -0.410595) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('ruislip-manor', 'Ruislip Manor', 51.573307, -0.412388) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('russell-square', 'Russell Square', 51.523145, -0.124203) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('sandilands', 'Sandilands', 51.374931, -0.077727) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('seven-kings', 'Seven Kings', 51.563865, 0.097101) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('seven-sisters', 'Seven Sisters', 51.5836, -0.07248) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('shadwell', 'Shadwell', 51.51175, -0.0562) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('shenfield', 'Shenfield', 51.63114, 0.330607) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('shepherd-s-bush', 'Shepherd''s Bush', 51.50445, -0.218) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('shepherd-s-bush-rail', 'Shepherd''s Bush (Rail)', 51.50513, -0.2175) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('shepherd-s-bush-market', 'Shepherd''s Bush Market', 51.505796, -0.226383) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('shoreditch-high-street', 'Shoreditch High Street', 51.523289, -0.076071) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('silver-street', 'Silver Street', 51.614861, -0.067204) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('sloane-square', 'Sloane Square', 51.492348, -0.156526) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('slough', 'Slough', 51.512367, -0.592388) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('snaresbrook', 'Snaresbrook', 51.58073, 0.021514) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-acton', 'South Acton', 51.499573, -0.270097) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-ealing', 'South Ealing', 51.501029, -0.307101) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-hampstead', 'South Hampstead', 51.541341, -0.178824) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-harrow', 'South Harrow', 51.564662, -0.35221) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-kensington', 'South Kensington', 51.494037, -0.1729) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-kenton', 'South Kenton', 51.570254, -0.3084) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-quay', 'South Quay', 51.50001, -0.016193) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-ruislip', 'South Ruislip', 51.557035, -0.399288) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-tottenham', 'South Tottenham', 51.580506, -0.071681) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-wimbledon', 'South Wimbledon', 51.415329, -0.192138) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('south-woodford', 'South Woodford', 51.591932, 0.027391) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('southall', 'Southall', 51.50619, -0.377434) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('southbury', 'Southbury', 51.648657, -0.052531) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('southfields', 'Southfields', 51.445525, -0.206706) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('southgate', 'Southgate', 51.632334, -0.127811) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('southwark', 'Southwark', 51.50408, -0.105149) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('st-james-street', 'St James Street', 51.580981, -0.03281) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('st-james-s-park', 'St James''s Park', 51.499612, -0.133536) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('st-john-s-wood', 'St John''s Wood', 51.534831, -0.174052) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('st-paul-s', 'St Paul''s', 51.514925, -0.097482) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stamford-brook', 'Stamford Brook', 51.494938, -0.245835) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stamford-hill', 'Stamford Hill', 51.574438, -0.076681) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stanmore', 'Stanmore', 51.619393, -0.303016) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('star-lane', 'Star Lane', 51.520559, 0.004175) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stepney-green', 'Stepney Green', 51.521715, -0.046728) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stockwell', 'Stockwell', 51.47218, -0.122502) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stoke-newington', 'Stoke Newington', 51.565064, -0.072714) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stonebridge-park', 'Stonebridge Park', 51.543881, -0.2757) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stratford', 'Stratford', 51.541494, -0.003884) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stratford-dlr-1', 'Stratford (DLR 1)', 51.540329, -0.004857) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stratford-high-street', 'Stratford High Street', 51.537699, -0.000338) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('stratford-international', 'Stratford International', 51.545763, -0.008861) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('sudbury-hill', 'Sudbury Hill', 51.556988, -0.336682) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('sudbury-town', 'Sudbury Town', 51.550848, -0.315803) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('surrey-quays', 'Surrey Quays', 51.493283, -0.047622) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('swiss-cottage', 'Swiss Cottage', 51.543336, -0.174663) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('sydenham', 'Sydenham', 51.427278, -0.054359) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('taplow', 'Taplow', 51.523461, -0.681683) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('temple', 'Temple', 51.511062, -0.11375) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('theobalds-grove', 'Theobalds Grove', 51.692004, -0.035652) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('therapia-lane', 'Therapia Lane', 51.385697, -0.129091) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('theydon-bois', 'Theydon Bois', 51.671738, 0.10321) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('tooting-bec', 'Tooting Bec', 51.435598, -0.15965) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('tooting-broadway', 'Tooting Broadway', 51.427745, -0.168185) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('tottenham-court-road', 'Tottenham Court Road', 51.516467, -0.130524) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('tottenham-hale', 'Tottenham Hale', 51.58843, -0.05987) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('totteridge-whetstone', 'Totteridge & Whetstone', 51.630365, -0.179153) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('tower-gateway', 'Tower Gateway', 51.510623, -0.074414) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('tower-hill', 'Tower Hill', 51.50981, -0.07775) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('tufnell-park', 'Tufnell Park', 51.556808, -0.138433) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('turkey-street', 'Turkey Street', 51.672663, -0.047226) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('turnham-green', 'Turnham Green', 51.495143, -0.25453) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('turnpike-lane', 'Turnpike Lane', 51.590348, -0.102846) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('twyford', 'Twyford', 51.475121, -0.863739) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('upminster', 'Upminster', 51.559013, 0.253024) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('upminster-rail', 'Upminster (Rail)', 51.5595, 0.253) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('upminster-bridge', 'Upminster Bridge', 51.558334, 0.234694) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('upney', 'Upney', 51.538267, 0.099728) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('upper-holloway', 'Upper Holloway', 51.563625, -0.129485) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('upton-park', 'Upton Park', 51.535224, 0.034414) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('uxbridge', 'Uxbridge', 51.546434, -0.478411) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('vauxhall', 'Vauxhall', 51.484972, -0.12308) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('victoria', 'Victoria', 51.496358, -0.143229) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('waddon-marsh', 'Waddon Marsh', 51.377003, -0.117827) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('walthamstow-central', 'Walthamstow Central', 51.5839, -0.0201) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('walthamstow-queens-road', 'Walthamstow Queens Road', 51.581514, -0.023696) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wandle-park', 'Wandle Park', 51.373481, -0.113362) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wandsworth-road', 'Wandsworth Road', 51.469683, -0.138179) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wanstead', 'Wanstead', 51.575666, 0.028621) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wanstead-park', 'Wanstead Park', 51.5517, 0.026334) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wapping', 'Wapping', 51.504322, -0.0559) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('warren-street', 'Warren Street', 51.524653, -0.1381) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('warwick-avenue', 'Warwick Avenue', 51.5233, -0.18401) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('waterloo', 'Waterloo', 51.503057, -0.114357) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('watford', 'Watford', 51.657372, -0.417373) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('watford-high-street', 'Watford High Street', 51.652305, -0.392159) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('watford-junction', 'Watford Junction', 51.663459, -0.395966) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('watford-vicarage-road', 'Watford Vicarage Road', 51.646792, -0.408661) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wellesley-road', 'Wellesley Road', 51.375624, -0.097617) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wembley-central', 'Wembley Central', 51.551395, -0.295883) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wembley-park', 'Wembley Park', 51.563768, -0.28004) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-acton', 'West Acton', 51.518196, -0.280605) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-brompton', 'West Brompton', 51.48703, -0.195488) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-croydon', 'West Croydon', 51.378424, -0.1023) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-croydon-tram', 'West Croydon (Tram)', 51.379045, -0.101638) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-drayton', 'West Drayton', 51.509813, -0.471897) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-ealing', 'West Ealing', 51.513513, -0.320473) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-finchley', 'West Finchley', 51.609488, -0.188301) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-ham', 'West Ham', 51.52834, 0.0044) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-ham-dlr', 'West Ham (DLR)', 51.528, 0.005) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-hampstead', 'West Hampstead', 51.546857, -0.1908) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-harrow', 'West Harrow', 51.579391, -0.353765) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-india-quay', 'West India Quay', 51.506904, -0.020404) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-kensington', 'West Kensington', 51.490697, -0.20598) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-ruislip', 'West Ruislip', 51.569632, -0.437662) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('west-silvertown', 'West Silvertown', 51.502929, 0.022125) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('westbourne-park', 'Westbourne Park', 51.520949, -0.201508) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('westferry', 'Westferry', 51.509451, -0.026736) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('westminster', 'Westminster', 51.500878, -0.125956) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('white-city', 'White City', 51.512072, -0.224386) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('white-hart-lane', 'White Hart Lane', 51.60448, -0.070949) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('whitechapel', 'Whitechapel', 51.5196, -0.061) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('willesden-green', 'Willesden Green', 51.549329, -0.221855) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('willesden-junction', 'Willesden Junction', 51.532249, -0.24318) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wimbledon', 'Wimbledon', 51.421636, -0.206164) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wimbledon-tram', 'Wimbledon (Tram)', 51.421506, -0.205171) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wimbledon-park', 'Wimbledon Park', 51.434459, -0.199632) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wood-green', 'Wood Green', 51.597419, -0.109755) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wood-lane', 'Wood Lane', 51.510074, -0.223712) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('wood-street', 'Wood Street', 51.586632, -0.002346) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('woodford', 'Woodford', 51.606655, 0.03386) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('woodgrange-park', 'Woodgrange Park', 51.549184, 0.044549) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('woodside', 'Woodside', 51.386934, -0.06566) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('woodside-park', 'Woodside Park', 51.617793, -0.18562) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('woolwich', 'Woolwich', 51.49179, 0.07081) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.stations (id, name, latitude, longitude) values ('woolwich-arsenal', 'Woolwich Arsenal', 51.490297, 0.069385) on conflict (normalized_name) do update set id = excluded.id, name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude;
insert into public.station_lines (station_id, line_id) select 'abbey-road', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'abbey-wood', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'acton-central', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'acton-main-line', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'acton-town', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'acton-town', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'addington-village', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'addiscombe', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'aldgate', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'aldgate', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'aldgate-east', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'aldgate-east', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'all-saints', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'alperton', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'amersham', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ampere-way', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'anerley', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'angel', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'archway', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'arena', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'arnos-grove', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'arsenal', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'avenue-road', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'baker-street', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'baker-street', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'baker-street', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'baker-street', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'baker-street', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'balham', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bank', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bank', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bank', 'waterloo-city' where exists (select 1 from public.lines where id = 'waterloo-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bank-dlr', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barbican', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barbican', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barbican', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barking', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barking', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barking-rail', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barking-riverside', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barkingside', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barons-court', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'barons-court', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'battersea-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'battersea-power-station', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bayswater', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bayswater', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'beckenham-junction', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'beckenham-road', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'beckton', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'beckton-park', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'becontree', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'beddington-lane', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'belgrave-walk', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'belsize-park', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bermondsey', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bethnal-green', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bethnal-green', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'birkbeck', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'blackfriars', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'blackfriars', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'blackhorse-lane', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'blackhorse-road', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'blackhorse-road-rail', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'blackwall', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bond-street', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bond-street', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bond-street', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'borough', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'boston-manor', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bounds-green', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bow-church', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bow-road', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bow-road', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'brent-cross', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'brentwood', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'brixton', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'brockley', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bromley-by-bow', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bromley-by-bow', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'brondesbury', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'brondesbury-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bruce-grove', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'buckhurst-hill', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'burnham', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'burnt-oak', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bush-hill-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'bushey', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'caledonian-road', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'caledonian-road-barnsbury', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cambridge-heath', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'camden-road', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'camden-town', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canada-water', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canada-water-rail', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canary-wharf', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canary-wharf', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canary-wharf', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canning-town', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canning-town-dlr', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cannon-street', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cannon-street', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canonbury', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'canons-park', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'carpenders-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cassiobridge', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'centrale', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chadwell-heath', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chalfont-latimer', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chalk-farm', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chancery-lane', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'charing-cross', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'charing-cross', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chesham', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cheshunt', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chigwell', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chingford', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chiswick-park', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'chorleywood', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'church-street', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'clapham-common', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'clapham-high-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'clapham-junction', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'clapham-north', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'clapham-south', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'clapton', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cockfosters', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'colindale', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'colliers-wood', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'coombe-lane', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'covent-garden', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'crossharbour', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'crouch-hill', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'croxley', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'crystal-palace', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'custom-house', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'custom-house', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cutty-sark', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'cyprus', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'dagenham-east', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'dagenham-heathway', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'dalston-junction', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'dalston-kingsland', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'debden', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'denmark-hill', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'deptford-bridge', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'devons-road', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'dollis-hill', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'dundonald-road', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ealing-broadway', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ealing-broadway', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ealing-broadway-rail', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ealing-common', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ealing-common', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'earl-s-court', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'earl-s-court', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'east-acton', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'east-croydon', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'east-finchley', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'east-ham', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'east-ham', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'east-india', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'east-putney', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'eastcote', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'eastcote', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'edgware', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'edgware-road', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'edgware-road', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'edgware-road', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'edgware-road', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'edmonton-green', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'elephant-castle', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'elephant-castle', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'elm-park', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'elmers-end', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'elverson-road', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'embankment', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'embankment', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'embankment', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'embankment', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'emerson-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'enfield-town', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'epping', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'euston', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'euston', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'euston-rail', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'euston-square', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'euston-square', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'euston-square', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'fairlop', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'farringdon', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'farringdon', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'farringdon', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'farringdon-rail', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'fieldway', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'finchley-central', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'finchley-road', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'finchley-road', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'finchley-road-frognal', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'finsbury-park', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'finsbury-park', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'forest-gate', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'forest-hill', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'fulham-broadway', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gallions-reach', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gants-hill', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'george-street', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gidea-park', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gloucester-road', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gloucester-road', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gloucester-road', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'golders-green', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'goldhawk-road', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'goldhawk-road', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'goodge-street', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'goodmayes', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gospel-oak', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'grange-hill', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gravel-hill', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'great-portland-street', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'great-portland-street', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'great-portland-street', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'green-park', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'green-park', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'green-park', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'greenford', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'greenwich', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gunnersbury', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'gunnersbury', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hackney-central', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hackney-downs', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hackney-wick', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'haggerston', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hainault', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hammersmith', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hammersmith', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hammersmith', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hammersmith', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hampstead', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hampstead-heath', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hanger-lane', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hanwell', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harlesden', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harlesden', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harold-wood', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harringay-green-lanes', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harrington-road', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harrow-wealdstone', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harrow-wealdstone', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'harrow-on-the-hill', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hatch-end', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hatton-cross', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hayes-harlington', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'headstone-lane', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'heathrow-terminal-4', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'heathrow-terminal-4', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'heathrow-terminal-5', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'heathrow-terminal-5', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'heathrow-terminals-2-3', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'heathrow-terminals-2-3', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hendon-central', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'heron-quays', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'high-barnet', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'high-street-kensington', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'high-street-kensington', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'highams-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'highbury-islington', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'highbury-islington-rail', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'highgate', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hillingdon', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hillingdon', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'holborn', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'holborn', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'holland-park', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'holloway-road', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'homerton', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'honor-oak-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hornchurch', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hounslow-central', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hounslow-east', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hounslow-west', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hoxton', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'hyde-park-corner', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ickenham', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ickenham', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ilford', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'imperial-wharf', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'island-gardens', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'iver', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kennington', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kensal-green', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kensal-green', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kensal-rise', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kensington-olympia', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kensington-olympia', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kentish-town', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kentish-town-west', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kenton', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kenton', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kew-bridge', 'national-rail' where exists (select 1 from public.lines where id = 'national-rail') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kew-gardens', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kew-gardens', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kilburn', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kilburn-high-road', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kilburn-park', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-george-v', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-henry-s-drive', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-s-cross-st-pancras', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-s-cross-st-pancras', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-s-cross-st-pancras', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-s-cross-st-pancras', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-s-cross-st-pancras', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'king-s-cross-st-pancras', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'kingsbury', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'knightsbridge', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ladbroke-grove', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ladbroke-grove', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'lambeth-north', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'lancaster-gate', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'langdon-park', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'langley', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'latimer-road', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'latimer-road', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'lebanon-road', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'leicester-square', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'leicester-square', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'lewisham', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'leyton', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'leyton-midland-road', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'leytonstone', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'leytonstone-high-road', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'limehouse', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'liverpool-street', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'liverpool-street', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'liverpool-street', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'liverpool-street', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'liverpool-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'liverpool-street', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'lloyd-park', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'london-bridge', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'london-bridge', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'london-city-airport', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'london-fields', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'loughton', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'maida-vale', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'maidenhead', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'manor-house', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'manor-park', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mansion-house', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mansion-house', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'marble-arch', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'maryland', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'marylebone', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'merton-park', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mile-end', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mile-end', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mile-end', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mill-hill-east', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mitcham', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mitcham-junction', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'monument', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'monument', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'moor-park', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'moorgate', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'moorgate', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'moorgate', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'moorgate', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'morden', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'morden-road', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mornington-crescent', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'mudchute', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'neasden', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'new-addington', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'new-cross', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'new-cross-gate', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'newbury-park', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'nine-elms', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'north-acton', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'north-ealing', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'north-greenwich', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'north-harrow', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'north-wembley', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'north-wembley', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'northfields', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'northolt', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'northwick-park', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'northwood', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'northwood-hills', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'norwood-junction', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'notting-hill-gate', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'notting-hill-gate', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'notting-hill-gate', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'oakwood', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'old-street', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'osterley', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'oval', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'oxford-circus', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'oxford-circus', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'oxford-circus', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'paddington', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'paddington', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'paddington', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'paddington', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'paddington', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'park-royal', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'parsons-green', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'peckham-rye', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'penge-west', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'perivale', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'phipps-bridge', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'piccadilly-circus', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'piccadilly-circus', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'pimlico', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'pinner', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'plaistow', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'plaistow', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'pontoon-dock', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'poplar', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'preston-road', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'prince-regent', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'pudding-mill-lane', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'putney-bridge', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'queen-s-park', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'queen-s-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'queens-road-peckham', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'queensbury', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'queensway', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ravenscourt-park', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'rayners-lane', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'rayners-lane', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'reading', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'rectory-road', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'redbridge', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'reeves-corner', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'regent-s-park', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'richmond', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'richmond', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'rickmansworth', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'roding-valley', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'romford', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'romford', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'rotherhithe', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'royal-albert', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'royal-oak', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'royal-oak', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'royal-victoria', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ruislip', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ruislip', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ruislip-gardens', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ruislip-manor', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'ruislip-manor', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'russell-square', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'sandilands', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'seven-kings', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'seven-sisters', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'seven-sisters', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shadwell', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shadwell', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shenfield', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shepherd-s-bush', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shepherd-s-bush-rail', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shepherd-s-bush-market', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shepherd-s-bush-market', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'shoreditch-high-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'silver-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'sloane-square', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'sloane-square', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'slough', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'snaresbrook', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-acton', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-ealing', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-hampstead', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-harrow', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-kensington', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-kensington', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-kensington', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-kenton', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-kenton', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-quay', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-ruislip', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-tottenham', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-wimbledon', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'south-woodford', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'southall', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'southbury', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'southfields', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'southgate', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'southwark', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'st-james-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'st-james-s-park', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'st-james-s-park', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'st-john-s-wood', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'st-paul-s', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stamford-brook', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stamford-hill', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stanmore', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'star-lane', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stepney-green', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stepney-green', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stockwell', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stockwell', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stoke-newington', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stonebridge-park', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stonebridge-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford-dlr-1', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford-high-street', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'stratford-international', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'sudbury-hill', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'sudbury-town', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'surrey-quays', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'swiss-cottage', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'sydenham', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'taplow', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'temple', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'temple', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'theobalds-grove', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'therapia-lane', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'theydon-bois', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tooting-bec', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tooting-broadway', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tottenham-court-road', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tottenham-court-road', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tottenham-court-road', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tottenham-hale', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'totteridge-whetstone', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tower-gateway', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tower-hill', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tower-hill', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'tufnell-park', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'turkey-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'turnham-green', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'turnham-green', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'turnpike-lane', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'twyford', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'upminster', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'upminster-rail', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'upminster-bridge', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'upney', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'upper-holloway', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'upton-park', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'upton-park', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'uxbridge', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'uxbridge', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'vauxhall', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'victoria', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'victoria', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'victoria', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'waddon-marsh', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'walthamstow-central', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'walthamstow-central', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'walthamstow-queens-road', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wandle-park', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wandsworth-road', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wanstead', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wanstead-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wapping', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'warren-street', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'warren-street', 'victoria' where exists (select 1 from public.lines where id = 'victoria') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'warwick-avenue', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'waterloo', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'waterloo', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'waterloo', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'waterloo', 'waterloo-city' where exists (select 1 from public.lines where id = 'waterloo-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'watford', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'watford-high-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'watford-high-street', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'watford-junction', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'watford-junction', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'watford-vicarage-road', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wellesley-road', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wembley-central', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wembley-central', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wembley-park', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wembley-park', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-acton', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-brompton', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-brompton', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-croydon', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-croydon-tram', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-drayton', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-ealing', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-finchley', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-ham', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-ham', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-ham', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-ham-dlr', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-hampstead', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-hampstead', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-harrow', 'metropolitan' where exists (select 1 from public.lines where id = 'metropolitan') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-india-quay', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-kensington', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-ruislip', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'west-silvertown', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'westbourne-park', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'westbourne-park', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'westferry', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'westminster', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'westminster', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'westminster', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'white-city', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'white-hart-lane', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'whitechapel', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'whitechapel', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'whitechapel', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'whitechapel', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'willesden-green', 'jubilee' where exists (select 1 from public.lines where id = 'jubilee') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'willesden-junction', 'bakerloo' where exists (select 1 from public.lines where id = 'bakerloo') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'willesden-junction', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wimbledon', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wimbledon-tram', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wimbledon-park', 'district' where exists (select 1 from public.lines where id = 'district') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wood-green', 'piccadilly' where exists (select 1 from public.lines where id = 'piccadilly') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wood-lane', 'circle' where exists (select 1 from public.lines where id = 'circle') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wood-lane', 'hammersmith-and-city' where exists (select 1 from public.lines where id = 'hammersmith-and-city') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'wood-street', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'woodford', 'central' where exists (select 1 from public.lines where id = 'central') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'woodgrange-park', 'london-overground' where exists (select 1 from public.lines where id = 'london-overground') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'woodside', 'tramlink' where exists (select 1 from public.lines where id = 'tramlink') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'woodside-park', 'northern' where exists (select 1 from public.lines where id = 'northern') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'woolwich', 'elizabeth' where exists (select 1 from public.lines where id = 'elizabeth') on conflict do nothing;
insert into public.station_lines (station_id, line_id) select 'woolwich-arsenal', 'dlr' where exists (select 1 from public.lines where id = 'dlr') on conflict do nothing;

update public.stations set external_source_id = id where external_source_id is null;

-- Replace the legacy writer after all canonical rows are present. The
-- station_updates insert keeps the current feed and client response shape.
create or replace function public.submit_station_report(p_guest_token uuid, p_report jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  identity_key text := public.station_reporter_key(p_guest_token);
  station_row public.stations;
  line_row public.lines;
  submission public.station_report_icon_submissions;
  saved public.station_updates;
  canonical public.reports;
  station_name text := nullif(btrim(p_report->>'station_name'), '');
  category_name text := nullif(btrim(p_report->>'category'), '');
  scope_name text := coalesce(nullif(btrim(p_report->>'scope'), ''), 'station_wide');
  requested_line text := nullif(btrim(p_report->>'line_name'), '');
  requested_line_ids text[] := coalesce(
    array(select jsonb_array_elements_text(p_report->'affected_line_ids')),
    array[]::text[]
  );
begin
  if station_name is null then raise exception 'Choose a canonical station.'; end if;
  select * into station_row from public.stations
    where normalized_name = lower(regexp_replace(station_name, '[^a-zA-Z0-9]+', '', 'g'));
  if not found then raise exception 'Choose a station from the search results.'; end if;
  if category_name is null then raise exception 'Select an issue to report.'; end if;
  if scope_name not in ('station_wide', 'line_specific') then raise exception 'Choose a valid report scope.'; end if;
  if requested_line is not null and cardinality(requested_line_ids) = 0 then
    requested_line_ids := array[requested_line];
  end if;
  if scope_name = 'line_specific' and cardinality(requested_line_ids) = 0 then
    raise exception 'Choose at least one affected line.';
  end if;
  if scope_name = 'station_wide' then requested_line_ids := array[]::text[]; end if;
  if requested_line is not null then
    if not exists (
      select 1 from public.lines l
      join public.station_lines sl on sl.line_id = l.id and sl.station_id = station_row.id
      where l.normalized_name = lower(regexp_replace(requested_line, '[^a-zA-Z0-9]+', '', 'g'))
        and (sl.valid_to is null or sl.valid_to >= current_date)
    ) then raise exception 'That line is not mapped to this station.'; end if;
  end if;
  if scope_name = 'line_specific' and exists (
    select 1 from unnest(requested_line_ids) selected
    where not exists (
      select 1 from public.lines l
      join public.station_lines sl on sl.line_id = l.id and sl.station_id = station_row.id
      where (l.id = selected or l.normalized_name = lower(regexp_replace(selected, '[^a-zA-Z0-9]+', '', 'g')))
        and (sl.valid_to is null or sl.valid_to >= current_date)
    )
  ) then raise exception 'One or more selected lines are not mapped to this station.'; end if;

  insert into public.station_report_icon_submissions (reporter_key, location_key, category)
  values (identity_key, 'station:' || station_row.id, category_name)
  on conflict do nothing;
  select * into submission from public.station_report_icon_submissions
    where reporter_key = identity_key and location_key = 'station:' || station_row.id
      and category = category_name for update;
  if submission.next_allowed_at > clock_timestamp() then
    select * into saved from public.station_updates where id = submission.report_id for update;
    if saved.status = 'EXPIRED' then raise exception 'This report has expired. Please try again later.'; end if;
    if submission.undone then
      update public.station_updates set status = case when confirms >= 3 then 'CONFIRMED' else 'ACTIVE' end, updated_at = now()
        where id = submission.report_id returning * into saved;
      update public.station_report_icon_submissions set undone = false
        where reporter_key = identity_key and location_key = 'station:' || station_row.id and category = category_name;
    end if;
    return jsonb_build_object('report', to_jsonb(saved), 'next_allowed_at', submission.next_allowed_at, 'undone', false);
  end if;

  insert into public.reports (station_id, reporter_key, category, label, tone, message, where_on, author_id, user_id, scope, expires_at)
  values (station_row.id, identity_key, category_name, p_report->>'label', p_report->>'tone',
    p_report->>'message', p_report->>'where_on', auth.uid(), auth.uid(), scope_name, now() + interval '24 hours')
  returning * into canonical;
  if scope_name = 'station_wide' then
    insert into public.report_lines (report_id, line_id)
    select canonical.id, sl.line_id from public.station_lines sl
    where sl.station_id = station_row.id and (sl.valid_to is null or sl.valid_to >= current_date);
  else
    insert into public.report_lines (report_id, line_id)
    select canonical.id, l.id
    from unnest(requested_line_ids) selected
    join public.lines l on l.id = selected
      or l.normalized_name = lower(regexp_replace(selected, '[^a-zA-Z0-9]+', '', 'g'));
  end if;
  insert into public.station_updates (id, station_name, kind, category, label, tone, message, where_on, author_id, author_initial)
  values (canonical.id, station_row.name, 'report', category_name, p_report->>'label', p_report->>'tone',
    p_report->>'message', p_report->>'where_on', auth.uid(),
    coalesce(nullif(upper(left(auth.jwt()->>'email', 1)), ''), 'A'))
  returning * into saved;
  update public.station_report_icon_submissions set report_id = saved.id,
    next_allowed_at = clock_timestamp() + interval '30 minutes', undone = false
    where reporter_key = identity_key and location_key = 'station:' || station_row.id and category = category_name
    returning * into submission;
  return jsonb_build_object('report', to_jsonb(saved), 'next_allowed_at', submission.next_allowed_at, 'undone', false);
end;
$$;
grant execute on function public.submit_station_report(uuid, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
