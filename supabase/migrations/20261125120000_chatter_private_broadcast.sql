begin;

create index if not exists chat_messages_channel_created_id_idx
  on public.chat_messages (channel_id, created_at, id);

create or replace function public.chatter_notify_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    pg_catalog.jsonb_build_object('id', new.id),
    'message_inserted',
    'chatter:' || new.channel_id,
    true
  );
  return new;
end;
$$;

revoke all on function public.chatter_notify_insert() from public, anon, authenticated;

drop trigger if exists chatter_notify_insert on public.chat_messages;
create trigger chatter_notify_insert
  after insert on public.chat_messages
  for each row execute function public.chatter_notify_insert();

drop policy if exists "Authenticated passengers can receive Chatter broadcasts"
  on realtime.messages;
create policy "Authenticated passengers can receive Chatter broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = any (array[
      'chatter:underground_central',
      'chatter:underground_jubilee',
      'chatter:underground_northern',
      'chatter:underground_piccadilly',
      'chatter:underground_victoria',
      'chatter:underground_district',
      'chatter:underground_circle',
      'chatter:underground_hammersmith-and-city',
      'chatter:underground_hammersmith_and_city',
      'chatter:underground_metropolitan',
      'chatter:underground_bakerloo',
      'chatter:underground_elizabeth',
      'chatter:underground_waterloo_city',
      'chatter:london_overground',
      'chatter:dlr',
      'chatter:london_trams',
      'chatter:national_rail_avanti_west_coast',
      'chatter:national_rail_c2c',
      'chatter:national_rail_caledonian_sleeper',
      'chatter:national_rail_chiltern_railways',
      'chatter:national_rail_crosscountry',
      'chatter:national_rail_east_midlands_railway',
      'chatter:national_rail_gatwick_express',
      'chatter:national_rail_grand_central',
      'chatter:national_rail_great_northern',
      'chatter:national_rail_great_western_railway',
      'chatter:national_rail_greater_anglia',
      'chatter:national_rail_heathrow_express',
      'chatter:national_rail_hull_trains',
      'chatter:national_rail_lner',
      'chatter:national_rail_london_northwestern_railway',
      'chatter:national_rail_lumo',
      'chatter:national_rail_merseyrail',
      'chatter:national_rail_northern',
      'chatter:national_rail_scotrail',
      'chatter:national_rail_south_western_railway',
      'chatter:national_rail_southeastern',
      'chatter:national_rail_southern',
      'chatter:national_rail_stansted_express',
      'chatter:national_rail_thameslink',
      'chatter:national_rail_transpennine_express',
      'chatter:national_rail_transport_for_wales',
      'chatter:national_rail_west_midlands_railway'
    ])
  );

notify pgrst, 'reload schema';
commit;
