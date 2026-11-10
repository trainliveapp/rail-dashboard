-- Match the persistent picker ID; retain the legacy alias for existing reports.
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
    when 'underground_hammersmith-and-city' then 'hammersmith-and-city'
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

notify pgrst, 'reload schema';
