create index if not exists station_updates_created_at_idx
  on public.station_updates (created_at desc);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);

notify pgrst, 'reload schema';