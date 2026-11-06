-- Keep chat isolation stable when a passenger-facing channel name changes.
alter table public.chat_messages add column if not exists channel_id text;

update public.chat_messages
set channel_id = case lower(line)
  when 'central' then 'underground_central'
  when 'jubilee' then 'underground_jubilee'
  when 'northern' then 'underground_northern'
  when 'piccadilly' then 'underground_piccadilly'
  when 'victoria' then 'underground_victoria'
  when 'district' then 'underground_district'
  when 'circle' then 'underground_circle'
  when 'hammersmith & city' then 'underground_hammersmith_and_city'
  when 'metropolitan' then 'underground_metropolitan'
  when 'bakerloo' then 'underground_bakerloo'
  when 'elizabeth' then 'underground_elizabeth'
  when 'waterloo & city' then 'underground_waterloo_city'
  when 'great western railway' then 'national_rail_great_western_railway'
  else line
end
where channel_id is null;

alter table public.chat_messages alter column channel_id set not null;

create index if not exists idx_chat_messages_channel_created_at
  on public.chat_messages (channel_id, created_at asc);
