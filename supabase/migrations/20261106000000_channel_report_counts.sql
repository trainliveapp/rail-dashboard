-- Channel reports are explicit. Existing London/TfL line reports are mapped
-- here for compatibility; National Rail channels do not inherit station reports.
alter table public.reports add column if not exists channel_id text;

create index if not exists reports_channel_active_idx
  on public.reports (channel_id, status, expires_at);

create or replace function public.channel_report_line_id(p_channel_id text)
returns text
language sql immutable as $$
  select case p_channel_id
    when 'underground_central' then 'central'
    when 'underground_jubilee' then 'jubilee'
    when 'underground_northern' then 'northern'
    when 'underground_piccadilly' then 'piccadilly'
    when 'underground_victoria' then 'victoria'
    when 'underground_district' then 'district'
    when 'underground_circle' then 'circle'
    when 'underground_hammersmith_and_city' then 'hammersmith-and-city'
    when 'underground_metropolitan' then 'metropolitan'
    when 'underground_bakerloo' then 'bakerloo'
    when 'underground_elizabeth' then 'elizabeth'
    when 'london_trams' then 'tramlink'
    when 'london_overground' then 'london-overground'
    when 'dlr' then 'dlr'
    else null
  end;
$$;

create or replace function public.get_channel_report_summary(p_channel_id text)
returns integer
language sql stable security definer set search_path = public as $$
  select count(distinct report_id)::integer
  from (
    select r.id as report_id
    from public.reports r
    where r.channel_id = p_channel_id
      and r.status in ('ACTIVE', 'CONFIRMED')
      and r.expires_at > now()
    union
    select rl.report_id
    from public.report_lines rl
    join public.reports r on r.id = rl.report_id
    where rl.line_id = public.channel_report_line_id(p_channel_id)
      and r.status in ('ACTIVE', 'CONFIRMED')
      and r.expires_at > now()
    union
    select su.id
    from public.station_updates su
    join public.stations s on s.normalized_name =
      lower(regexp_replace(trim(su.station_name), '[^a-zA-Z0-9]+', '', 'g'))
    join public.station_lines sl
      on sl.station_id = s.id
      and sl.line_id = public.channel_report_line_id(p_channel_id)
    where su.kind = 'report'
      and su.status in ('ACTIVE', 'CONFIRMED')
      and su.created_at > now() - interval '24 hours'
      and (sl.valid_to is null or sl.valid_to >= current_date)
  ) relevant;
$$;
grant execute on function public.get_channel_report_summary(text) to anon, authenticated;

create or replace function public.get_channel_report_breakdown(p_channel_id text)
returns table (category text, scope text, report_count integer)
language sql stable security definer set search_path = public as $$
  select category, scope, count(distinct report_id)::integer
  from (
    select r.id as report_id, r.category, r.scope
    from public.reports r
    where r.channel_id = p_channel_id
      and r.status in ('ACTIVE', 'CONFIRMED')
      and r.expires_at > now()
    union
    select r.id, r.category, r.scope
    from public.report_lines rl
    join public.reports r on r.id = rl.report_id
    where rl.line_id = public.channel_report_line_id(p_channel_id)
      and r.status in ('ACTIVE', 'CONFIRMED')
      and r.expires_at > now()
    union
    select su.id, su.category, 'station_wide'
    from public.station_updates su
    join public.stations s on s.normalized_name =
      lower(regexp_replace(trim(su.station_name), '[^a-zA-Z0-9]+', '', 'g'))
    join public.station_lines sl
      on sl.station_id = s.id
      and sl.line_id = public.channel_report_line_id(p_channel_id)
    where su.kind = 'report'
      and su.status in ('ACTIVE', 'CONFIRMED')
      and su.created_at > now() - interval '24 hours'
      and (sl.valid_to is null or sl.valid_to >= current_date)
  ) relevant
  group by category, scope
  order by count(distinct report_id) desc, category, scope;
$$;
grant execute on function public.get_channel_report_breakdown(text) to anon, authenticated;

notify pgrst, 'reload schema';
